"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import dynamic from "next/dynamic";
import {
  CartesianGrid,
  ComposedChart,
  Label,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Pause, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  forecastMonthlySeries,
  formatMonthLabel,
  neighborhoodForecastKey,
} from "@/lib/data/forecast";
import {
  groupHighCapacitySites,
  type CapacitySiteMarker,
} from "@/lib/data/capacity-geo";
import { needColorScale } from "@/lib/data/geo";
import {
  loadBlockNeedHeatmap,
  loadNeighborhoodTrend,
  loadOrgCapacity,
  loadOrgCapacityGeo,
} from "@/lib/data/load";
import type {
  CapacityConfidence,
  FeatureCollection,
  ForecastPoint,
  NeighborhoodTrendProps,
  OrgCapacityRow,
} from "@/lib/data/types";
import { cn } from "@/lib/utils";

const ForecastChoropleth = dynamic(
  () =>
    import("@/components/organization/forecast-choropleth").then(
      (mod) => mod.ForecastChoropleth,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

const CONFIDENCE_ORDER: CapacityConfidence[] = [
  "HIGH",
  "MEDIUM",
  "LOW",
  "MODELED_FALLBACK",
];

const confidenceStyles: Record<CapacityConfidence, string> = {
  HIGH: "bg-primary/15 text-primary ring-primary/25",
  MEDIUM: "bg-[oklch(0.92_0.05_85)] text-[oklch(0.38_0.06_70)] ring-[oklch(0.8_0.05_80)]",
  LOW: "bg-destructive/10 text-destructive ring-destructive/20",
  MODELED_FALLBACK:
    "bg-muted text-muted-foreground ring-foreground/10",
};

export function OrgInsightsPanel() {
  const [neighborhoods, setNeighborhoods] =
    useState<FeatureCollection<NeighborhoodTrendProps> | null>(null);
  const [blocks, setBlocks] =
    useState<FeatureCollection<import("@/lib/data/types").BlockNeedProps> | null>(
      null,
    );
  const [capacity, setCapacity] = useState<OrgCapacityRow[]>([]);
  const [highCapacitySites, setHighCapacitySites] = useState<
    CapacitySiteMarker[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] =
    useState<string>("East Village");
  const [monthIndex, setMonthIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [excludeNoPanel, setExcludeNoPanel] = useState(true);
  const [showHighCapacity, setShowHighCapacity] = useState(true);

  const onLoaded = useEffectEvent(
    (payload: {
      neighborhoods: FeatureCollection<NeighborhoodTrendProps>;
      blocks: FeatureCollection<import("@/lib/data/types").BlockNeedProps>;
      capacity: OrgCapacityRow[];
      highCapacitySites: CapacitySiteMarker[];
    }) => {
      setNeighborhoods(payload.neighborhoods);
      setBlocks(payload.blocks);
      setCapacity(payload.capacity);
      setHighCapacitySites(payload.highCapacitySites);
      const names = payload.neighborhoods.features.map(
        (feature) => feature.properties.neighborhood,
      );
      if (names.includes("East Village")) {
        setSelectedNeighborhood("East Village");
      } else if (names[0]) {
        setSelectedNeighborhood(names[0]);
      }
    },
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadNeighborhoodTrend(),
      loadBlockNeedHeatmap(),
      loadOrgCapacity(),
      loadOrgCapacityGeo(),
    ])
      .then(([neighborhoodData, blockData, capacityData, capacityGeo]) => {
        if (cancelled) {
          return;
        }
        onLoaded({
          neighborhoods: neighborhoodData,
          blocks: blockData,
          capacity: capacityData,
          highCapacitySites: groupHighCapacitySites(capacityGeo),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const forecastsByNeighborhood = useMemo(() => {
    const map = new Map<string, ForecastPoint[]>();
    if (!neighborhoods) {
      return map;
    }
    for (const feature of neighborhoods.features) {
      const name = feature.properties.neighborhood;
      map.set(name, forecastMonthlySeries(feature.properties.history, 6));
    }
    return map;
  }, [neighborhoods]);

  const timeline = useMemo(() => {
    const series = forecastsByNeighborhood.get(selectedNeighborhood);
    if (!series?.length) {
      return [] as string[];
    }
    return series.map((point) => point.date);
  }, [forecastsByNeighborhood, selectedNeighborhood]);

  useEffect(() => {
    if (!timeline.length) {
      return;
    }
    // Land the slider on the last observed month (before forecast horizon).
    const lastHistory = [...(forecastsByNeighborhood.get(selectedNeighborhood) ?? [])]
      .reverse()
      .find((point) => point.kind === "history");
    const index = lastHistory
      ? timeline.indexOf(lastHistory.date)
      : timeline.length - 1;
    setMonthIndex(Math.max(0, index));
  }, [timeline, forecastsByNeighborhood, selectedNeighborhood]);

  useEffect(() => {
    if (!playing || timeline.length === 0) {
      return;
    }
    const id = window.setInterval(() => {
      setMonthIndex((current) => (current + 1) % timeline.length);
    }, 450);
    return () => window.clearInterval(id);
  }, [playing, timeline.length]);

  const activeDate = timeline[monthIndex] ?? null;

  const neighborhoodValueAt = useMemo(() => {
    const values = new Map<string, number>();
    for (const [name, series] of forecastsByNeighborhood) {
      const point = series.find((entry) => entry.date === activeDate);
      values.set(name, point?.value ?? 0);
    }
    return values;
  }, [forecastsByNeighborhood, activeDate]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const series of forecastsByNeighborhood.values()) {
      for (const point of series) {
        max = Math.max(max, point.value, point.upper);
      }
    }
    return max || 1;
  }, [forecastsByNeighborhood]);

  const chartData = useMemo(() => {
    const series = forecastsByNeighborhood.get(selectedNeighborhood) ?? [];
                return series.map((point) => ({
      date: point.date,
      label: formatMonthLabel(point.date),
      observed: point.kind === "history" ? point.value : null,
      forecast: point.kind === "forecast" ? point.value : null,
      lower: point.kind === "forecast" ? point.lower : null,
      upper: point.kind === "forecast" ? point.upper : null,
    }));
  }, [forecastsByNeighborhood, selectedNeighborhood]);

  const confidenceCounts = useMemo(() => {
    const counts: Record<CapacityConfidence, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      MODELED_FALLBACK: 0,
    };
    for (const row of capacity) {
      counts[row.capacity_confidence] =
        (counts[row.capacity_confidence] ?? 0) + 1;
    }
    return counts;
  }, [capacity]);

  const noPanelCount =
    blocks?.features.filter((feature) => !feature.properties.has_panel_data)
      .length ?? 0;

  if (error) {
    return (
      <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!neighborhoods || !blocks) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading downtown need & capacity layers…
      </p>
    );
  }

  const activePoint = forecastsByNeighborhood
    .get(selectedNeighborhood)
    ?.find((point) => point.date === activeDate);
  const isForecastMonth = activePoint?.kind === "forecast";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="font-heading text-xl">
              Downtown need forecast
            </CardTitle>
            <CardDescription>
              Holt–Winters seasonal model on monthly PIT-style totals
              (2017–2025) for six downtown neighborhoods. Choropleth uses
              block geometry; {noPanelCount} blocks labeled Golden
              Hill / Barrio Logan / Sherman Heights have no panel history and
              are flagged separately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {(neighborhoods.features.map((feature) => feature.properties.neighborhood)).map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedNeighborhood(name)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                      selectedNeighborhood === name
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-card text-foreground ring-foreground/10 hover:bg-muted",
                    )}
                  >
                    {name}
                  </button>
                ),
              )}
            </div>

            <ForecastChoropleth
              blocks={blocks}
              neighborhoodValueAt={neighborhoodValueAt}
              selectedNeighborhood={selectedNeighborhood}
              excludeNoPanel={excludeNoPanel}
              maxValue={maxValue}
              capacitySites={highCapacitySites}
              showHighCapacity={showHighCapacity}
              onSelectNeighborhood={(name) => {
                const key = neighborhoodForecastKey(name);
                if (forecastsByNeighborhood.has(key)) {
                  setSelectedNeighborhood(key);
                }
              }}
            />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPlaying((value) => !value)}
                    aria-pressed={playing}
                  >
                    {playing ? (
                      <Pause className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Play className="size-3.5" aria-hidden="true" />
                    )}
                    {playing ? "Pause" : "Play"}
                  </Button>
                  <p className="text-sm font-medium">
                    {activeDate ? formatMonthLabel(activeDate) : "—"}
                    {isForecastMonth ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        forecast
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={showHighCapacity}
                      onChange={(event) =>
                        setShowHighCapacity(event.target.checked)
                      }
                      className="size-3.5 accent-[oklch(0.4_0.075_175)]"
                    />
                    HIGH capacity sites
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={excludeNoPanel}
                      onChange={(event) =>
                        setExcludeNoPanel(event.target.checked)
                      }
                      className="size-3.5 accent-[oklch(0.4_0.075_175)]"
                    />
                    Hide blocks without panel history
                  </label>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, timeline.length - 1)}
                value={monthIndex}
                onChange={(event) => {
                  setPlaying(false);
                  setMonthIndex(Number(event.target.value));
                }}
                className="w-full accent-[oklch(0.4_0.075_175)]"
                aria-label="Time slider"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {timeline[0] ? formatMonthLabel(timeline[0]) : ""}
                </span>
                <span>
                  {timeline.at(-1)
                    ? formatMonthLabel(timeline.at(-1)!)
                    : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground">Low need</span>
                <div
                  className="h-2 flex-1 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${needColorScale(0, 1)}, ${needColorScale(0.45, 1)}, ${needColorScale(1, 1)})`,
                  }}
                />
                <span className="text-[11px] text-muted-foreground">
                  High need (PIT-style count)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#2f6f68] ring-2 ring-[#1f4f4a]" />
                  Teal dots = HIGH confidence capacity sites (click for details)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Block color = neighborhood need for the selected month. Teal dots
                = HIGH confidence capacity ({highCapacitySites.reduce(
                  (sum, site) => sum + site.rows.length,
                  0,
                )}{" "}
                of 14 HIGH rows mapped; 2-1-1 has no point). Some sites sit
                outside the downtown core — the map zooms out slightly when those
                are shown.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-heading text-lg">
                {selectedNeighborhood} series
              </CardTitle>
              <CardDescription>
                Solid line = actual monthly PIT-style totals (2017–2025). Dashed
                line = Holt–Winters prediction for the next 6 months, with upper
                and lower residual bands. Not a headcount of specific people.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 12, bottom: 28, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5dfd3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      minTickGap={28}
                    >
                      <Label
                        value="Month"
                        position="insideBottom"
                        offset={-18}
                        style={{ fontSize: 12, fill: "oklch(0.48 0.03 55)" }}
                      />
                    </XAxis>
                    <YAxis tick={{ fontSize: 10 }} width={48}>
                      <Label
                        value="People counted (total)"
                        angle={-90}
                        position="insideLeft"
                        style={{
                          fontSize: 12,
                          fill: "oklch(0.48 0.03 55)",
                          textAnchor: "middle",
                        }}
                      />
                    </YAxis>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#e5dfd3",
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                      verticalAlign="top"
                    />
                    <Line
                      type="monotone"
                      dataKey="upper"
                      stroke="oklch(0.55 0.1 55 / 0.45)"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      dot={false}
                      name="Upper band (forecast)"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="lower"
                      stroke="oklch(0.55 0.1 55 / 0.45)"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      dot={false}
                      name="Lower band (forecast)"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="observed"
                      stroke="oklch(0.4 0.075 175)"
                      strokeWidth={2}
                      dot={false}
                      name="Observed (actual)"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="oklch(0.55 0.1 55)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      name="Forecast (predicted)"
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {activePoint ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {formatMonthLabel(activePoint.date)}:{" "}
                  <span className="font-medium text-foreground">
                    {Math.round(activePoint.value)} people
                  </span>
                  {activePoint.kind === "forecast" ? (
                    <>
                      {" "}
                      predicted (band {Math.round(activePoint.lower)}–
                      {Math.round(activePoint.upper)})
                    </>
                  ) : (
                    <> observed</>
                  )}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-heading text-lg">
                Capacity confidence
              </CardTitle>
              <CardDescription>
                Of {capacity.length} org×category rows, only published figures
                should drive hard allocation. HIGH rows with coordinates appear as
                teal dots on the need map.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {CONFIDENCE_ORDER.map((level) => (
                <div
                  key={level}
                  className="flex items-center justify-between gap-3"
                >
                  <Badge
                    variant="outline"
                    className={cn("ring-1", confidenceStyles[level])}
                  >
                    {level === "MODELED_FALLBACK" ? "MODELED" : level}
                  </Badge>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {confidenceCounts[level]} rows
                  </p>
                </div>
              ))}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Tip: weight HIGH/MEDIUM published beds first when matching
                participant shelter requests; treat MODELED rows as illustrative
                only.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
