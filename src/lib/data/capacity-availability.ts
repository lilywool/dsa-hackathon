import {
  capacityEnumToService,
  formatCapacityValue,
} from "@/lib/data/org-capacity-match";
import type { CapacityConfidence, OrgCapacityRow } from "@/lib/data/types";
import { SERVICE_KINDS, type ServiceKind } from "@/lib/services";

export type AvailabilityStatus =
  | "available"
  | "limited"
  | "at_capacity"
  | "unknown";

export type CapacityAvailabilityRow = OrgCapacityRow & {
  service: ServiceKind | null;
  /** Capacity used for vacancy math (often daily-normalized). */
  displayTotal: number;
  displayOccupied: number | null;
  displayVacancies: number | null;
  displayUnit: string;
  occupancyRate: number | null;
  status: AvailabilityStatus;
  canEstimateVacancy: boolean;
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

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  available: "Vacancies available",
  limited: "Limited vacancies",
  at_capacity: "At capacity",
  unknown: "Vacancy unknown",
};

/** Stable pseudo-random occupancy for demo referral flows (0.68–1.08). */
function demoOccupancyRate(orgKey: string, categoryEnum: string) {
  const seed = `${orgKey}:${categoryEnum}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const fraction = (hash >>> 0) % 41;
  return 0.68 + fraction / 100;
}

function isAnnualThroughput(unit: string) {
  const lower = unit.toLowerCase();
  return lower.includes("/year") || lower.includes("per year");
}

function canEstimateVacancy(row: OrgCapacityRow) {
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

function toDisplayCapacity(row: OrgCapacityRow) {
  const unit = row.capacity_unit;
  const lower = unit.toLowerCase();

  if (lower.includes("meal") && isAnnualThroughput(unit)) {
    const daily = Math.max(1, Math.round(row.capacity_value / 365));
    return {
      displayTotal: daily,
      displayUnit: "meals/day (est. from annual)",
    };
  }

  if (Number.isInteger(row.capacity_value)) {
    return { displayTotal: row.capacity_value, displayUnit: unit };
  }

  return {
    displayTotal: Math.max(1, Math.round(row.capacity_value)),
    displayUnit: unit,
  };
}

export function withAvailability(
  row: OrgCapacityRow,
): CapacityAvailabilityRow {
  const service = capacityEnumToService(row.category_enum);
  const estimable = canEstimateVacancy(row);
  const { displayTotal, displayUnit } = toDisplayCapacity(row);

  if (!estimable) {
    return {
      ...row,
      service,
      displayTotal,
      displayOccupied: null,
      displayVacancies: null,
      displayUnit,
      occupancyRate: null,
      status: "unknown",
      canEstimateVacancy: false,
    };
  }

  const occupancyRate = demoOccupancyRate(row.org_key, row.category_enum);
  const occupied = Math.min(
    displayTotal,
    Math.round(displayTotal * Math.min(occupancyRate, 1)),
  );
  const vacancies = Math.max(0, displayTotal - occupied);
  const overCapacity = occupancyRate >= 1;

  let status: AvailabilityStatus;
  if (overCapacity || vacancies === 0) {
    status = "at_capacity";
  } else if (occupancyRate >= 0.9 || vacancies / displayTotal <= 0.1) {
    status = "limited";
  } else {
    status = "available";
  }

  return {
    ...row,
    service,
    displayTotal,
    displayOccupied: overCapacity ? displayTotal : occupied,
    displayVacancies: overCapacity ? 0 : vacancies,
    displayUnit,
    occupancyRate,
    status,
    canEstimateVacancy: true,
  };
}

export function enrichCapacityRows(rows: OrgCapacityRow[]) {
  return rows
    .filter((row) => !row.org_wide_total_flag)
    .map(withAvailability);
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
    unknown: rows.length - withVacancy.length,
  };
}

export function formatVacancyLabel(row: CapacityAvailabilityRow) {
  if (!row.canEstimateVacancy || row.displayVacancies === null) {
    return "—";
  }
  if (row.status === "at_capacity") {
    return "0 open";
  }
  return `${formatCapacityValue(row.displayVacancies)} open`;
}

export function shortOrgLabel(name: string, max = 22) {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max - 1)}…`;
}
