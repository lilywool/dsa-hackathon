import {
  capacityEnumToService,
  formatCapacityValue,
} from "@/lib/data/org-capacity-match";
import { geoServiceToApp } from "@/lib/data/services-map";
import type {
  CapacityConfidence,
  FeatureCollection,
  OrgCapacityRow,
  ServiceLocationProps,
} from "@/lib/data/types";
import { SERVICE_KINDS, type ServiceKind } from "@/lib/services";

export type AvailabilityStatus =
  | "available"
  | "limited"
  | "at_capacity"
  | "unknown";

export type CapacityAvailabilityRow = OrgCapacityRow & {
  service: ServiceKind | null;
  /** Live (jittered) capacity used for vacancy math. */
  displayTotal: number;
  /** Published baseline before live jitter. */
  baselineTotal: number;
  displayOccupied: number | null;
  displayVacancies: number | null;
  /** Synthetic demand for this resource in the current snapshot. */
  displayNeed: number;
  displayUnit: string;
  /** Short unit noun for alerts (beds, meals, …). */
  unitNoun: string;
  occupancyRate: number | null;
  status: AvailabilityStatus;
  canEstimateVacancy: boolean;
  /** True when vacancy was modeled for LOW / MODELED rows. */
  vacancySimulated: boolean;
};

const CONFIDENCE_RANK: Record<CapacityConfidence, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  MODELED_FALLBACK: 3,
};

const STATUS_RANK: Record<AvailabilityStatus, number> = {
  available: 0,
  limited: 1,
  at_capacity: 2,
  unknown: 3,
};

/** Maximum proportional jitter applied to published daily/capacity averages. */
export const CAPACITY_JITTER = 0.3;

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  available: "Vacancies available",
  limited: "Limited vacancies",
  at_capacity: "At capacity",
  unknown: "Vacancy unknown",
};

function hashString(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic PRNG for a refresh snapshot (changes when seed changes). */
function createRng(seed: string) {
  let state = hashString(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hasPublishedInventorySignal(row: OrgCapacityRow) {
  if (row.org_wide_total_flag) {
    return false;
  }
  if (
    row.capacity_confidence === "MODELED_FALLBACK" ||
    row.capacity_confidence === "LOW"
  ) {
    return false;
  }

  const unit = row.capacity_unit.toLowerCase();
  const method = row.capacity_method;
  return (
    method === "PUBLISHED_BEDS" ||
    method === "PUBLISHED_DAILY" ||
    unit.includes("bed") ||
    unit.includes("meal") ||
    unit.includes("housed/night") ||
    unit.includes("people housed")
  );
}

export function resourceUnitNoun(unit: string): string {
  const lower = unit.toLowerCase();
  if (lower.includes("bed") || lower.includes("housed/night") || lower.includes("people housed")) {
    return "beds";
  }
  if (lower.includes("meal")) {
    return "meals";
  }
  if (lower.includes("grocery") || lower.includes("bag")) {
    return "bags";
  }
  if (lower.includes("clothing") || lower.includes("clothes") || lower.includes("items")) {
    return "clothing items";
  }
  if (lower.includes("patient")) {
    return "patient slots";
  }
  if (lower.includes("job") || lower.includes("training") || lower.includes("career")) {
    return "training slots";
  }
  if (lower.includes("client") || lower.includes("people") || lower.includes("individuals")) {
    return "spots";
  }
  if (lower.includes("contact") || lower.includes("service")) {
    return "service slots";
  }
  return "slots";
}

export function dailyDisplayUnit(unit: string) {
  return unit
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\/year\b/gi, "/day")
    .replace(/\bper year\b/gi, "per day")
    .replace(/\/month\b/gi, "/day")
    .replace(/\bper month\b/gi, "per day")
    .trim();
}

function toDisplayCapacity(row: OrgCapacityRow) {
  const unit = row.capacity_unit;
  return {
    displayTotal: Math.max(1, Math.round(row.capacity_value)),
    displayUnit: dailyDisplayUnit(unit),
  };
}

function jitterCapacity(baseline: number, rand: () => number) {
  const multiplier =
    1 - CAPACITY_JITTER + rand() * CAPACITY_JITTER * 2;
  return Math.max(1, Math.round(baseline * multiplier));
}

/**
 * Occupancy rate for live inventory. Published rows lean fuller;
 * simulated (unknown) rows use peer-like rates from the same seed stream.
 */
function occupancyRateForRow(
  published: boolean,
  rand: () => number,
) {
  if (published) {
    return 0.68 + rand() * 0.4;
  }
  return 0.72 + rand() * 0.35;
}

function statusFromOccupancy(
  occupancyRate: number,
  vacancies: number,
  total: number,
): AvailabilityStatus {
  if (occupancyRate >= 1 || vacancies === 0) {
    return "at_capacity";
  }
  if (occupancyRate >= 0.9 || vacancies / total <= 0.1) {
    return "limited";
  }
  return "available";
}

/** Synthetic local need, bounded near capacity (±~20% with homeless-scale headroom). */
function syntheticNeed(
  liveCapacity: number,
  occupancyRate: number,
  rand: () => number,
) {
  const demandFactor = 0.9 + rand() * 0.45;
  const pressure = Math.max(occupancyRate, 0.85);
  const need = Math.round(liveCapacity * demandFactor * Math.min(pressure + 0.15, 1.25));
  const floor = Math.max(1, Math.round(liveCapacity * (1 - CAPACITY_JITTER)));
  const ceiling = liveCapacity + Math.max(
    20,
    Math.round(liveCapacity * 0.25),
  );
  return Math.min(ceiling, Math.max(floor, need));
}

export function withAvailability(
  row: OrgCapacityRow,
  refreshSeed = "0",
): CapacityAvailabilityRow {
  const service = capacityEnumToService(row.category_enum);
  const published = hasPublishedInventorySignal(row);
  const { displayTotal: baselineTotal, displayUnit } = toDisplayCapacity(row);
  const unitNoun = resourceUnitNoun(row.capacity_unit);
  const rand = createRng(
    `${refreshSeed}:${row.org_key}:${row.category_enum}`,
  );

  const liveTotal = jitterCapacity(baselineTotal, rand);
  const occupancyRate = occupancyRateForRow(published, rand);
  const occupied = Math.min(
    liveTotal,
    Math.round(liveTotal * Math.min(occupancyRate, 1)),
  );
  const overCapacity = occupancyRate >= 1;
  const vacancies = overCapacity ? 0 : Math.max(0, liveTotal - occupied);
  const status = statusFromOccupancy(occupancyRate, vacancies, liveTotal);
  const displayNeed = syntheticNeed(liveTotal, occupancyRate, rand);

  return {
    ...row,
    service,
    displayTotal: liveTotal,
    baselineTotal,
    displayOccupied: overCapacity ? liveTotal : occupied,
    displayVacancies: vacancies,
    displayNeed,
    displayUnit,
    unitNoun,
    occupancyRate,
    status,
    canEstimateVacancy: true,
    vacancySimulated: !published,
  };
}

export type ExplicitServiceIndex = Map<string, Set<ServiceKind>>;

/** Orgs → services they explicitly offer (excludes referral-only tags). */
export function buildExplicitServiceIndex(
  locations: FeatureCollection<ServiceLocationProps>,
): ExplicitServiceIndex {
  const index: ExplicitServiceIndex = new Map();

  for (const feature of locations.features) {
    const key = feature.properties.org_key;
    const set = index.get(key) ?? new Set<ServiceKind>();
    for (const tag of feature.properties.services) {
      const kind = geoServiceToApp(tag);
      if (kind) {
        set.add(kind);
      }
    }
    index.set(key, set);
  }

  return index;
}

function rowMatchesExplicitOffer(
  row: CapacityAvailabilityRow,
  explicitOffers?: ExplicitServiceIndex | null,
) {
  if (!row.service) {
    return false;
  }
  if (!explicitOffers || explicitOffers.size === 0) {
    return true;
  }

  const offered = explicitOffers.get(row.org_key);
  if (offered) {
    return offered.has(row.service);
  }

  // Directory miss: keep published capacity rows, drop modeled fallbacks.
  return row.capacity_confidence !== "MODELED_FALLBACK";
}

export function enrichCapacityRows(
  rows: OrgCapacityRow[],
  refreshSeed = "0",
  explicitOffers?: ExplicitServiceIndex | null,
) {
  return rows
    .filter((row) => !row.org_wide_total_flag)
    .map((row) => withAvailability(row, refreshSeed))
    .filter((row) => rowMatchesExplicitOffer(row, explicitOffers));
}

export function groupCapacityByService(rows: CapacityAvailabilityRow[]) {
  const groups = new Map<ServiceKind, CapacityAvailabilityRow[]>();

  for (const service of SERVICE_KINDS) {
    groups.set(service, []);
  }

  for (const row of rows) {
    if (!row.service) {
      continue;
    }
    groups.get(row.service)?.push(row);
  }

  for (const [service, list] of groups) {
    list.sort((a, b) => {
      const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (byStatus !== 0) {
        return byStatus;
      }
      const byConfidence =
        CONFIDENCE_RANK[a.capacity_confidence] -
        CONFIDENCE_RANK[b.capacity_confidence];
      if (byConfidence !== 0) {
        return byConfidence;
      }
      const vacancyDiff =
        (b.displayVacancies ?? -1) - (a.displayVacancies ?? -1);
      if (vacancyDiff !== 0) {
        return vacancyDiff;
      }
      return b.capacity_value - a.capacity_value;
    });
    groups.set(service, list);
  }

  return groups;
}

export function vacancySummary(rows: CapacityAvailabilityRow[]) {
  const withVacancy = rows.filter((row) => row.canEstimateVacancy);
  return {
    available: withVacancy.filter((row) => row.status === "available").length,
    limited: withVacancy.filter((row) => row.status === "limited").length,
    atCapacity: withVacancy.filter((row) => row.status === "at_capacity")
      .length,
    unknown: rows.filter((row) => row.vacancySimulated).length,
  };
}

export function dominantUnitNoun(rows: CapacityAvailabilityRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.unitNoun, (counts.get(row.unitNoun) ?? 0) + 1);
  }
  let best = "slots";
  let bestCount = -1;
  for (const [noun, count] of counts) {
    if (count > bestCount) {
      best = noun;
      bestCount = count;
    }
  }
  return best;
}

export function unfilledSupportAlert(rows: CapacityAvailabilityRow[]) {
  if (rows.length === 0) {
    return null;
  }

  const unitNoun = dominantUnitNoun(rows);
  const openVacancies = rows.reduce(
    (sum, row) => sum + (row.displayVacancies ?? 0),
    0,
  );
  const unmetNeed = rows.reduce((sum, row) => {
    const gap = row.displayNeed - row.displayTotal;
    return sum + Math.max(0, gap);
  }, 0);

  // Prefer open inventory; if the network is full, surface unmet need instead.
  const unfilled = openVacancies > 0 ? openVacancies : unmetNeed;
  if (unfilled <= 0) {
    return null;
  }

  return {
    count: unfilled,
    unitNoun,
    message: `${formatCapacityValue(unfilled)} ${unitNoun} unfilled, can you support?`,
  };
}

export function formatVacancyLabel(row: CapacityAvailabilityRow) {
  if (!row.canEstimateVacancy || row.displayVacancies === null) {
    return "—";
  }
  if (row.status === "at_capacity") {
    return "0 vacancies";
  }
  return `${formatCapacityValue(row.displayVacancies)} vacancies`;
}

export function shortOrgLabel(name: string, max = 22) {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max - 1)}…`;
}
