import { distanceMeters } from "@/lib/data/geo";
import type { FeatureCollection, TransitStopProps } from "@/lib/data/types";

export type TransitStopPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type TransitCorridor = {
  id: string;
  name: string;
  /** Leaflet positions [lat, lng][]. */
  positions: [number, number][];
};

const MIN_STOPS_PER_CORRIDOR = 3;

function corridorParts(stopName: string) {
  for (const sep of [" & ", " / ", " at "]) {
    if (stopName.includes(sep)) {
      return stopName.split(sep).map((part) => part.trim());
    }
  }
  return [stopName.trim()];
}

function normalizeCorridorName(name: string) {
  return name
    .replace(/\bAvenue\b/gi, "Av")
    .replace(/\bAve\b/gi, "Av")
    .replace(/\bStreet\b/gi, "St")
    .replace(/\bBoulevard\b/gi, "Bl")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTransitStops(
  geo: FeatureCollection<TransitStopProps>,
): TransitStopPoint[] {
  const stops: TransitStopPoint[] = [];
  for (const feature of geo.features) {
    if (feature.geometry.type !== "Point") {
      continue;
    }
    const [lng, lat] = feature.geometry.coordinates;
    stops.push({
      id: feature.properties.stop_id,
      name: feature.properties.stop_name,
      lat,
      lng,
    });
  }
  return stops;
}

/**
 * Approximate downtown transit corridors from stop names (no GTFS shapes in
 * repo). Groups stops sharing a street/corridor label and orders them along
 * the dominant axis so thin red polylines can show how sites connect.
 */
export function buildTransitCorridors(
  stops: TransitStopPoint[],
): TransitCorridor[] {
  const byCorridor = new Map<string, TransitStopPoint[]>();

  for (const stop of stops) {
    for (const raw of corridorParts(stop.name)) {
      const name = normalizeCorridorName(raw);
      // Skip station-only labels that aren't linear corridors.
      if (/station|transit center|plaza|bayside/i.test(name) && !/\b(st|av|bl)\b/i.test(name)) {
        continue;
      }
      const list = byCorridor.get(name) ?? [];
      if (!list.some((existing) => existing.id === stop.id)) {
        list.push(stop);
      }
      byCorridor.set(name, list);
    }
  }

  const corridors: TransitCorridor[] = [];

  for (const [name, members] of byCorridor) {
    if (members.length < MIN_STOPS_PER_CORRIDOR) {
      continue;
    }

    const lats = members.map((stop) => stop.lat);
    const lngs = members.map((stop) => stop.lng);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    const sorted = [...members].sort((a, b) =>
      lngSpan >= latSpan ? a.lng - b.lng : a.lat - b.lat,
    );

    corridors.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      positions: sorted.map((stop) => [stop.lat, stop.lng]),
    });
  }

  return corridors.sort((a, b) => b.positions.length - a.positions.length);
}

/** Nearest transit stop to a resource site (for last-mile connector lines). */
export function nearestTransitStop(
  site: { lat: number; lng: number },
  stops: TransitStopPoint[],
  maxMeters = 900,
) {
  let best: TransitStopPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const stop of stops) {
    const meters = distanceMeters(site, stop);
    if (meters < bestDistance) {
      bestDistance = meters;
      best = stop;
    }
  }

  if (!best || bestDistance > maxMeters) {
    return null;
  }

  return { stop: best, meters: bestDistance };
}
