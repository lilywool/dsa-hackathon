import type {
  FeatureCollection,
  OrgCapacityGeoProps,
} from "@/lib/data/types";

export type CapacitySiteMarker = {
  id: string;
  lat: number;
  lng: number;
  organization: string;
  insideDowntown: boolean;
  rows: {
    category: string;
    value: number;
    unit: string;
  }[];
};

export function groupHighCapacitySites(
  capacityGeo: FeatureCollection<OrgCapacityGeoProps>,
): CapacitySiteMarker[] {
  const groups = new Map<string, CapacitySiteMarker>();

  for (const feature of capacityGeo.features) {
    if (feature.properties.capacity_confidence !== "HIGH") {
      continue;
    }
    if (feature.geometry.type !== "Point") {
      continue;
    }
    const [lng, lat] = feature.geometry.coordinates;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const existing = groups.get(key);
    const row = {
      category: feature.properties.category,
      value: feature.properties.capacity_value,
      unit: feature.properties.capacity_unit,
    };
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    groups.set(key, {
      id: key,
      lat,
      lng,
      organization: feature.properties.organization,
      insideDowntown: Boolean(feature.properties.inside_downtown_boundary),
      rows: [row],
    });
  }

  return [...groups.values()];
}
