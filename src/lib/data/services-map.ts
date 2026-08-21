import type { ServiceKind } from "@/lib/services";

/** Static geo data uses `work`; app/DB uses `employment`. */
const GEO_TO_APP: Record<string, ServiceKind> = {
  shelter: "shelter",
  food: "food",
  healthcare: "healthcare",
  clothing: "clothing",
  other: "other",
  work: "employment",
  employment: "employment",
};

export function geoServiceToApp(tag: string): ServiceKind | null {
  return GEO_TO_APP[tag] ?? null;
}

export function locationMatchesNeed(
  services: string[],
  need: ServiceKind | undefined,
) {
  if (!need) {
    return true;
  }

  return services.some((tag) => geoServiceToApp(tag) === need);
}

/** GTFS wheelchair_boarding: 1 = accessible boarding available. */
export function isWheelchairAccessibleStop(
  boarding: number | null | undefined,
) {
  return boarding === 1;
}
