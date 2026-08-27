import { capacityEnumToService } from "@/lib/data/org-capacity-match";
import { dailyDisplayUnit } from "@/lib/data/capacity-availability";
import { distanceMeters, DOWNTOWN_CENTER } from "@/lib/data/geo";
import type {
  FeatureCollection,
  OrgCapacityGeoProps,
} from "@/lib/data/types";
import type { ServiceKind } from "@/lib/services";

export type CapacityMarkerShape =
  | "circle"
  | "square"
  | "diamond"
  | "triangle"
  | "hexagon"
  | "rounded";

export type CapacitySiteMarker = {
  id: string;
  lat: number;
  lng: number;
  organization: string;
  orgKey: string;
  insideDowntown: boolean;
  service: ServiceKind;
  category: string;
  categoryEnum: string;
  capacityValue: number;
  capacityUnit: string;
  confidence: string;
  /** Pixel radius for the map marker (capacity-scaled). */
  radiusPx: number;
  shape: CapacityMarkerShape;
};

const SHAPE_BY_SERVICE: Record<ServiceKind, CapacityMarkerShape> = {
  shelter: "circle",
  food: "square",
  healthcare: "diamond",
  employment: "triangle",
  clothing: "hexagon",
  other: "rounded",
};

/** Keep groupHighCapacitySites for any legacy callers — HIGH sites only. */
export function groupHighCapacitySites(
  capacityGeo: FeatureCollection<OrgCapacityGeoProps>,
): CapacitySiteMarker[] {
  return buildCapacityMarkers(capacityGeo, "shelter").filter(
    (site) => site.confidence === "HIGH",
  );
}

function displayCapacityValue(value: number) {
  return Math.max(1, Math.round(value));
}

function radiusFromCapacity(value: number, maxValue: number) {
  const safeMax = Math.max(maxValue, 1);
  const t = Math.min(1, Math.log10(value + 1) / Math.log10(safeMax + 1));
  return Math.round(14 + t * 28);
}

/**
 * Capacity providers for one service category. Includes published and modeled
 * rows so each filter has markers; size scales with capacity within that set.
 * Optionally limits to sites near downtown so the map stays legible.
 */
export function buildCapacityMarkers(
  capacityGeo: FeatureCollection<OrgCapacityGeoProps>,
  serviceFilter: ServiceKind,
  options?: { maxDistanceMeters?: number },
): CapacitySiteMarker[] {
  const maxDistance = options?.maxDistanceMeters ?? 8_000;
  const candidates: Array<{
    lat: number;
    lng: number;
    organization: string;
    orgKey: string;
    insideDowntown: boolean;
    service: ServiceKind;
    category: string;
    categoryEnum: string;
    capacityValue: number;
    capacityUnit: string;
    confidence: string;
  }> = [];

  for (const feature of capacityGeo.features) {
    if (feature.geometry.type !== "Point") {
      continue;
    }
    if (feature.properties.org_wide_total_flag) {
      continue;
    }
    const service = capacityEnumToService(feature.properties.category_enum);
    if (!service || service !== serviceFilter) {
      continue;
    }

    const [lng, lat] = feature.geometry.coordinates;
    if (
      distanceMeters(
        { lat: DOWNTOWN_CENTER[0], lng: DOWNTOWN_CENTER[1] },
        { lat, lng },
      ) > maxDistance
    ) {
      continue;
    }

    candidates.push({
      lat,
      lng,
      organization: feature.properties.organization,
      orgKey: feature.properties.org_key,
      insideDowntown: Boolean(feature.properties.inside_downtown_boundary),
      service,
      category: feature.properties.category,
      categoryEnum: feature.properties.category_enum,
      capacityValue: displayCapacityValue(
        feature.properties.capacity_value,
      ),
      capacityUnit: dailyDisplayUnit(feature.properties.capacity_unit),
      confidence: feature.properties.capacity_confidence,
    });
  }

  const maxValue = candidates.reduce(
    (max, row) => Math.max(max, row.capacityValue),
    1,
  );

  return candidates.map((row) => ({
    id: `${row.orgKey}:${row.categoryEnum}:${row.lat.toFixed(5)},${row.lng.toFixed(5)}`,
    lat: row.lat,
    lng: row.lng,
    organization: row.organization,
    orgKey: row.orgKey,
    insideDowntown: row.insideDowntown,
    service: row.service,
    category: row.category,
    categoryEnum: row.categoryEnum,
    capacityValue: row.capacityValue,
    capacityUnit: row.capacityUnit,
    confidence: row.confidence,
    radiusPx: radiusFromCapacity(row.capacityValue, maxValue),
    shape: SHAPE_BY_SERVICE[row.service],
  }));
}

export const capacityShapeLabels: Record<CapacityMarkerShape, string> = {
  circle: "Shelter",
  square: "Food",
  diamond: "Health",
  triangle: "Employment",
  hexagon: "Clothes",
  rounded: "Other",
};
