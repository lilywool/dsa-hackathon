import { neighborhoodForecastKey } from "@/lib/data/forecast";
import type { BlockNeedProps, GeoJsonFeature } from "@/lib/data/types";

function toTime(date: string) {
  return new Date(date).getTime();
}

function hashString(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string) {
  let state = hashString(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Nearest dated block individuals count (Get It Done / panel history). */
function baselineIndividuals(
  props: BlockNeedProps,
  activeDate: string | null,
) {
  if (props.history.length > 0 && activeDate) {
    const target = toTime(activeDate);
    let best = props.history[0];
    let bestDelta = Math.abs(toTime(best.date) - target);
    for (const point of props.history) {
      const delta = Math.abs(toTime(point.date) - target);
      if (delta < bestDelta) {
        best = point;
        bestDelta = delta;
      }
    }
    return Math.max(0, best.individuals);
  }
  return Math.max(0, props.latest_individuals ?? 0);
}

export type BlockPitEntry = {
  value: number;
  source: "simulated_block" | "none";
};

/**
 * Simulate point-in-time (PIT) homeless population per block.
 *
 * Uses neighborhood monthly PIT-style totals as the control total, then
 * allocates people across that neighborhood's panel blocks in proportion to
 * each block's historical individuals count (Get It Done / downtown counts).
 * A small seeded jitter keeps the layer feeling live without leaving the
 * realm of the published totals.
 */
export function buildSimulatedBlockPitMap(
  features: GeoJsonFeature<BlockNeedProps>[],
  activeDate: string | null,
  neighborhoodPitAt: Map<string, number>,
  refreshSeed = "0",
): Map<string, BlockPitEntry> {
  const result = new Map<string, BlockPitEntry>();
  const byNeighborhood = new Map<
    string,
    GeoJsonFeature<BlockNeedProps>[]
  >();

  for (const feature of features) {
    const props = feature.properties;
    if (!props.has_panel_data) {
      result.set(props.block_id, { value: 0, source: "none" });
      continue;
    }
    const key = neighborhoodForecastKey(props.neighborhood);
    const list = byNeighborhood.get(key) ?? [];
    list.push(feature);
    byNeighborhood.set(key, list);
  }

  for (const [neighborhood, blocks] of byNeighborhood) {
    const pitTotal = Math.max(
      0,
      Math.round(neighborhoodPitAt.get(neighborhood) ?? 0),
    );
    const rand = createRng(`${refreshSeed}:${neighborhood}:${activeDate ?? "na"}`);

    const weights = blocks.map((feature) => {
      const baseline = baselineIndividuals(feature.properties, activeDate);
      // Zero-history blocks still get a thin share so the choropleth isn't empty.
      const weight = Math.max(0.35, baseline) * (0.85 + rand() * 0.3);
      return { feature, weight, baseline };
    });

    const weightSum = weights.reduce((sum, row) => sum + row.weight, 0) || 1;

    // Largest-remainder method so allocations stay integers and sum to pitTotal.
    const raw = weights.map((row) => ({
      blockId: row.feature.properties.block_id,
      exact: (pitTotal * row.weight) / weightSum,
    }));
    const floored = raw.map((row) => ({
      blockId: row.blockId,
      value: Math.floor(row.exact),
      frac: row.exact - Math.floor(row.exact),
    }));
    let remaining =
      pitTotal - floored.reduce((sum, row) => sum + row.value, 0);
    floored.sort((a, b) => b.frac - a.frac);
    for (const row of floored) {
      if (remaining <= 0) {
        break;
      }
      row.value += 1;
      remaining -= 1;
    }

    for (const row of floored) {
      result.set(row.blockId, {
        value: row.value,
        source: "simulated_block",
      });
    }
  }

  return result;
}

export function blockPitCount(
  feature: GeoJsonFeature<BlockNeedProps>,
  pitByBlock: Map<string, BlockPitEntry>,
): BlockPitEntry {
  return (
    pitByBlock.get(feature.properties.block_id) ?? {
      value: 0,
      source: "none",
    }
  );
}

export function maxBlockPit(pitByBlock: Map<string, BlockPitEntry>) {
  let max = 0;
  for (const entry of pitByBlock.values()) {
    max = Math.max(max, entry.value);
  }
  return max || 1;
}
