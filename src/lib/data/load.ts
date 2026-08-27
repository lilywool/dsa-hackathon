import type {
  BlockNeedProps,
  FeatureCollection,
  GetItDoneEncampmentProps,
  GetItDoneEncampmentTrend,
  HudPitBenchmark,
  NeighborhoodTrendProps,
  OrgCapacityGeoProps,
  OrgCapacityRow,
  ServiceLocationProps,
  TransitStopProps,
} from "@/lib/data/types";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function loadNeighborhoodTrend() {
  return fetchJson<FeatureCollection<NeighborhoodTrendProps>>(
    "/data/neighborhood_trend.geojson",
  );
}

export function loadHudPitBenchmark() {
  return fetchJson<HudPitBenchmark>("/data/hud_pit_benchmark.json");
}

export function loadGetItDoneEncampmentBlocks() {
  return fetchJson<FeatureCollection<GetItDoneEncampmentProps>>(
    "/data/get_it_done_encampment_blocks.geojson",
  );
}

export function loadGetItDoneEncampmentTrend() {
  return fetchJson<GetItDoneEncampmentTrend>(
    "/data/get_it_done_encampment_trend.json",
  );
}

export function loadBlockNeedHeatmap() {
  return fetchJson<FeatureCollection<BlockNeedProps>>(
    "/data/block_need_heatmap.geojson",
  );
}

export function loadServiceLocations() {
  return fetchJson<FeatureCollection<ServiceLocationProps>>(
    "/data/service_locations.geojson",
  );
}

export function loadTransitAccessibility() {
  return fetchJson<FeatureCollection<TransitStopProps>>(
    "/data/transit_accessibility.geojson",
  );
}

export function loadOrgCapacity() {
  return fetchJson<OrgCapacityRow[]>("/data/org_capacity.json");
}

export function loadOrgCapacityGeo() {
  return fetchJson<FeatureCollection<OrgCapacityGeoProps>>(
    "/data/org_capacity.geojson",
  );
}
