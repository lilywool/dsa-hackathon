"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import dynamic from "next/dynamic";
import {
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Pause, Play } from "lucide-react";

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
  buildSimulatedBlockPitMap,
  maxBlockPit,
} from "@/lib/data/block-need";
import {
  buildCapacityMarkers,
  type CapacitySiteMarker,
} from "@/lib/data/capacity-geo";
import {
  buildExplicitServiceIndex,
  type ExplicitServiceIndex,
} from "@/lib/data/capacity-availability";
import { ServiceCapacityPanel } from "@/components/organization/service-capacity-panel";
import {
  loadBlockNeedHeatmap,
  loadGetItDoneEncampmentBlocks,
  loadGetItDoneEncampmentTrend,
  loadHudPitBenchmark,
  loadNeighborhoodTrend,
  loadOrgCapacity,
  loadOrgCapacityGeo,
  loadServiceLocations,
  loadTransitAccessibility,
} from "@/lib/data/load";
import {
  buildTransitCorridors,
  extractTransitStops,
  type TransitCorridor,
  type TransitStopPoint,
} from "@/lib/data/transit-corridors";
import type {
  FeatureCollection,
  ForecastPoint,
  GetItDoneEncampmentProps,
  GetItDoneEncampmentTrend,
  HudPitBenchmark,
  NeighborhoodTrendProps,
  OrgCapacityGeoProps,
  OrgCapacityRow,
} from "@/lib/data/types";
import {
  SERVICE_KINDS,
  serviceShortLabels,
  type ServiceKind,
} from "@/lib/services";
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

export function OrgInsightsPanel({
  organizationName,
  primaryServices = [],
}: {
  organizationName?: string | null;
  primaryServices?: ServiceKind[];
} = {}) {
  const [neighborhoods, setNeighborhoods] =
    useState<FeatureCollection<NeighborhoodTrendProps> | null>(null);
  const [blocks, setBlocks] =
    useState<FeatureCollection<import("@/lib/data/types").BlockNeedProps> | null>(
      null,
    );
  const [capacity, setCapacity] = useState<OrgCapacityRow[]>([]);
  const [capacityGeo, setCapacityGeo] =
    useState<FeatureCollection<OrgCapacityGeoProps> | null>(null);
  const [transitStops, setTransitStops] = useState<TransitStopPoint[]>([]);
  const [transitCorridors, setTransitCorridors] = useState<TransitCorridor[]>(
    [],
  );
  const [explicitOffers, setExplicitOffers] =
    useState<ExplicitServiceIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] =
    useState<string>("East Village");
  const [playing, setPlaying] = useState(false);
  const [excludeNoPanel, setExcludeNoPanel] = useState(true);
  const [showCapacity, setShowCapacity] = useState(true);
  const [showTransit, setShowTransit] = useState(true);
  const [showHudBenchmark, setShowHudBenchmark] = useState(false);
  // California is ~18x San Diego's count, so sharing one axis flattens San
  // Diego to the baseline. Kept as a separate opt-in rather than on by default.
  const [showHudCalifornia, setShowHudCalifornia] = useState(false);
  const [hudBenchmark, setHudBenchmark] = useState<HudPitBenchmark | null>(
    null,
  );
  const [encampmentBlocks, setEncampmentBlocks] =
    useState<FeatureCollection<GetItDoneEncampmentProps> | null>(null);
  const [encampmentTrend, setEncampmentTrend] =
    useState<GetItDoneEncampmentTrend | null>(null);
  const [mapLayer, setMapLayer] = useState<"pit" | "encampment">("pit");
  const [mapServiceFilter, setMapServiceFilter] = useState<ServiceKind>(
    () => primaryServices[0] ?? "shelter",
  );
  /** When set, keeps the user's scrubbed month for the active neighborhood. */
  const [scrubbedMonth, setScrubbedMonth] = useState<{
    neighborhood: string;
    index: number;
  } | null>(null);

  const onLoaded = useEffectEvent(
    (payload: {
      neighborhoods: FeatureCollection<NeighborhoodTrendProps>;
      hudBenchmark: HudPitBenchmark;
      blocks: FeatureCollection<import("@/lib/data/types").BlockNeedProps>;
      encampmentBlocks: FeatureCollection<GetItDoneEncampmentProps>;
      encampmentTrend: GetItDoneEncampmentTrend;
      capacity: OrgCapacityRow[];
      capacityGeo: FeatureCollection<OrgCapacityGeoProps>;
      transitStops: TransitStopPoint[];
      transitCorridors: TransitCorridor[];
      explicitOffers: ExplicitServiceIndex;
    }) => {
      setNeighborhoods(payload.neighborhoods);
      setHudBenchmark(payload.hudBenchmark);
      setBlocks(payload.blocks);
      setEncampmentBlocks(payload.encampmentBlocks);
      setEncampmentTrend(payload.encampmentTrend);
      setCapacity(payload.capacity);
      setCapacityGeo(payload.capacityGeo);
      setTransitStops(payload.transitStops);
      setTransitCorridors(payload.transitCorridors);
      setExplicitOffers(payload.explicitOffers);
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
      loadHudPitBenchmark(),
      loadBlockNeedHeatmap(),
      loadGetItDoneEncampmentBlocks(),
      loadGetItDoneEncampmentTrend(),
      loadOrgCapacity(),
      loadOrgCapacityGeo(),
      loadServiceLocations(),
      loadTransitAccessibility(),
    ])
      .then(
        ([
          neighborhoodData,
          hudBenchmarkData,
          blockData,
          encampmentBlockData,
          encampmentTrendData,
          capacityData,
          capacityGeoData,
          serviceLocations,
          transitGeo,
        ]) => {
          if (cancelled) {
            return;
          }
          const stops = extractTransitStops(transitGeo);
          onLoaded({
            neighborhoods: neighborhoodData,
            hudBenchmark: hudBenchmarkData,
            blocks: blockData,
            encampmentBlocks: encampmentBlockData,
            encampmentTrend: encampmentTrendData,
            capacity: capacityData,
            capacityGeo: capacityGeoData,
            transitStops: stops,
            transitCorridors: buildTransitCorridors(stops),
            explicitOffers: buildExplicitServiceIndex(serviceLocations),
          });
        },
      )
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

  const defaultMonthIndex = useMemo(() => {
    if (!timeline.length) {
      return 0;
    }
    const lastHistory = [
      ...(forecastsByNeighborhood.get(selectedNeighborhood) ?? []),
    ]
      .reverse()
      .find((point) => point.kind === "history");
    const index = lastHistory
      ? timeline.indexOf(lastHistory.date)
      : timeline.length - 1;
    return Math.max(0, index);
  }, [timeline, forecastsByNeighborhood, selectedNeighborhood]);

  const monthIndex =
    scrubbedMonth?.neighborhood === selectedNeighborhood
      ? Math.min(scrubbedMonth.index, Math.max(0, timeline.length - 1))
      : defaultMonthIndex;

  useEffect(() => {
    if (!playing || timeline.length === 0) {
      return;
    }
    const id = window.setInterval(() => {
      setScrubbedMonth((current) => {
        const base =
          current?.neighborhood === selectedNeighborhood
            ? current.index
            : defaultMonthIndex;
        return {
          neighborhood: selectedNeighborhood,
          index: (base + 1) % timeline.length,
        };
      });
    }, 450);
    return () => window.clearInterval(id);
  }, [playing, timeline.length, selectedNeighborhood, defaultMonthIndex]);

  const activeDate = timeline[monthIndex] ?? null;

  const neighborhoodPitAt = useMemo(() => {
    const values = new Map<string, number>();
    for (const [name, series] of forecastsByNeighborhood) {
      const point = series.find((entry) => entry.date === activeDate);
      // History points are observed PIT-style totals; forecast points are
      // projected population for the same metric — not service "need".
      values.set(name, point?.value ?? 0);
    }
    return values;
  }, [forecastsByNeighborhood, activeDate]);

  const serviceFilter = mapServiceFilter;

  const capacitySites = useMemo(() => {
    if (!capacityGeo) {
      return [] as CapacitySiteMarker[];
    }
    return buildCapacityMarkers(capacityGeo, serviceFilter);
  }, [capacityGeo, serviceFilter]);

  const pitByBlock = useMemo(() => {
    if (!blocks) {
      return new Map();
    }
    const visible = excludeNoPanel
      ? blocks.features.filter((feature) => feature.properties.has_panel_data)
      : blocks.features;
    // Re-simulate allocation when the month or resource filter changes.
    return buildSimulatedBlockPitMap(
      visible,
      activeDate,
      neighborhoodPitAt,
      `${activeDate ?? "na"}:${serviceFilter}`,
    );
  }, [blocks, excludeNoPanel, activeDate, neighborhoodPitAt, serviceFilter]);

  const maxPitValue = useMemo(() => maxBlockPit(pitByBlock), [pitByBlock]);

  const chartData = useMemo(() => {
    const series = forecastsByNeighborhood.get(selectedNeighborhood) ?? [];

    // HUD PIT is one observation per year, taken on a single night in late
    // January, while this chart's x axis is monthly. Each year's value is
    // attached to that year's January row so it rides the same axis; the
    // eleven months in between are null and the Line bridges them with
    // connectNulls.
    //
    // The series is split into "pre" and "post" keys around HUD's own
    // methodology break (2021 was a sheltered-only count, flagged in the data
    // via count_type). Two keys rather than one null gap because connectNulls
    // would otherwise bridge straight over the break and imply a real drop.
    type HudSlot = {
      sanDiegoPre: number | null;
      sanDiegoPost: number | null;
      californiaPre: number | null;
      californiaPost: number | null;
    };
    const EMPTY: HudSlot = {
      sanDiegoPre: null,
      sanDiegoPost: null,
      californiaPre: null,
      californiaPost: null,
    };
    const hudByYear = new Map<number, HudSlot>();

    if (hudBenchmark) {
      const allYears = [
        ...hudBenchmark.series.san_diego_coc.years,
        ...hudBenchmark.series.california.years,
      ];
      const breakYears = allYears
        .filter((entry) => entry.methodology_break)
        .map((entry) => entry.year);
      const breakYear = breakYears.length ? Math.min(...breakYears) : null;

      const put = (
        years: HudPitBenchmark["series"]["san_diego_coc"]["years"],
        preKey: keyof HudSlot,
        postKey: keyof HudSlot,
      ) => {
        for (const entry of years) {
          if (entry.methodology_break || entry.overall === null) {
            continue;
          }
          const slot = hudByYear.get(entry.year) ?? { ...EMPTY };
          const key =
            breakYear !== null && entry.year > breakYear ? postKey : preKey;
          slot[key] = entry.overall;
          hudByYear.set(entry.year, slot);
        }
      };
      put(hudBenchmark.series.san_diego_coc.years, "sanDiegoPre", "sanDiegoPost");
      put(hudBenchmark.series.california.years, "californiaPre", "californiaPost");
    }

    return series.map((point) => {
      const year = Number(point.date.slice(0, 4));
      // Dates are YYYY-MM-01, so check the month explicitly. endsWith("-01")
      // would match the first of EVERY month, not January.
      const isJanuary = point.date.slice(5, 7) === "01";
      const hud = (isJanuary ? hudByYear.get(year) : undefined) ?? EMPTY;
      return {
        date: point.date,
        label: formatMonthLabel(point.date),
        year,
        observed: point.kind === "history" ? point.value : null,
        forecast: point.kind === "forecast" ? point.value : null,
        lower: point.kind === "forecast" ? point.lower : null,
        upper: point.kind === "forecast" ? point.upper : null,
        ...hud,
      };
    });
  }, [forecastsByNeighborhood, selectedNeighborhood, hudBenchmark]);

  // Right axis is sized to the series actually on screen. With California
  // hidden the axis tops out near San Diego's ~10.6k instead of California's
  // ~187k, so the San Diego line reads as a real trend instead of a flat line
  // pinned to the baseline.
  const hudAxisMax = useMemo(() => {
    if (!showHudBenchmark) return 0;
    let max = 0;
    for (const point of chartData) {
      const candidates = [point.sanDiegoPre, point.sanDiegoPost];
      if (showHudCalifornia) {
        candidates.push(point.californiaPre, point.californiaPost);
      }
      for (const value of candidates) {
        if (typeof value === "number" && value > max) max = value;
      }
    }
    // round up to a clean tick so the axis labels stay readable
    if (max <= 0) return "auto" as const;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / magnitude) * magnitude;
  }, [chartData, showHudBenchmark, showHudCalifornia]);

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

  if (!neighborhoods || !blocks || !encampmentBlocks || !encampmentTrend) {
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
  const activeYear = activeDate ? Number(activeDate.slice(0, 4)) : null;
  // YYYY-MM for the encampment layer, so the map tracks the slider month by
  // month instead of only stepping when the year rolls over.
  const activeMonth = activeDate ? activeDate.slice(0, 7) : null;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle className="font-heading text-xl">
            Downtown PIT population &amp; resources
          </CardTitle>
          <CardDescription>
            Heatmap shows simulated point-in-time homeless population per block
            — neighborhood PIT totals allocated using Get It Done block count
            history. Provider markers are sized by capacity for the selected
            service. Thin red lines approximate transit corridors and last-mile
            links. {noPanelCount} blocks outside the panel grid are dashed when
            shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Map layer
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    name="insights-map-layer"
                    value="pit"
                    checked={mapLayer === "pit"}
                    onChange={() => setMapLayer("pit")}
                    className="size-3.5 accent-[oklch(0.4_0.075_175)]"
                  />
                  PIT population
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    name="insights-map-layer"
                    value="encampment"
                    checked={mapLayer === "encampment"}
                    onChange={() => setMapLayer("encampment")}
                    className="size-3.5 accent-[oklch(0.52_0.14_255)]"
                  />
                  311 encampment reports
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Resource type on map
              </p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_KINDS.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => setMapServiceFilter(service)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                      mapServiceFilter === service
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-card text-foreground ring-foreground/10 hover:bg-muted",
                    )}
                  >
                    {serviceShortLabels[service]}
                  </button>
                ))}
              </div>
            </div>
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
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-card text-foreground ring-foreground/10 hover:bg-muted",
                    )}
                  >
                    {name}
                  </button>
                ),
              )}
            </div>
          </div>

          <ForecastChoropleth
            blocks={blocks}
            encampmentBlocks={encampmentBlocks}
            encampmentTrend={encampmentTrend}
            activeYear={activeYear}
            activeMonth={activeMonth}
            mapLayer={mapLayer}
            pitByBlock={pitByBlock}
            maxPitValue={maxPitValue}
            selectedNeighborhood={selectedNeighborhood}
            excludeNoPanel={excludeNoPanel}
            capacitySites={capacitySites}
            showCapacity={showCapacity}
            showTransit={showTransit}
            transitCorridors={transitCorridors}
            transitStops={transitStops}
            serviceFilter={serviceFilter}
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
                    checked={showCapacity}
                    onChange={(event) =>
                      setShowCapacity(event.target.checked)
                    }
                    className="size-3.5 accent-[oklch(0.4_0.075_175)]"
                  />
                  Capacity providers
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showTransit}
                    onChange={(event) =>
                      setShowTransit(event.target.checked)
                    }
                    className="size-3.5 accent-[oklch(0.4_0.075_175)]"
                  />
                  Transit links
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
                setScrubbedMonth({
                  neighborhood: selectedNeighborhood,
                  index: Number(event.target.value),
                });
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
            <p className="text-[11px] text-muted-foreground">
              Showing {capacitySites.length}{" "}
              {serviceShortLabels[serviceFilter].toLowerCase()} provider
              {capacitySites.length === 1 ? "" : "s"} near downtown
              {showTransit
                ? ` · ${transitCorridors.length} transit corridors`
                : ""}
              . Marker size scales with that service&apos;s published/modeled
              capacity. Heatmap = simulated PIT homeless population (green →
              red), not service demand.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex flex-wrap items-center gap-3 font-heading text-lg">
            <span>{selectedNeighborhood} series</span>
            <label className="font-sans text-xs font-medium text-muted-foreground">
              <span className="sr-only">Select chart neighborhood</span>
              <select
                aria-label="Select chart neighborhood"
                value={selectedNeighborhood}
                onChange={(event) => setSelectedNeighborhood(event.target.value)}
                className="h-8 rounded-lg border border-foreground/10 bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {neighborhoods.features.map((feature) => {
                  const name = feature.properties.neighborhood;
                  return (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </label>
          </CardTitle>
          <CardDescription>
            Solid line = actual monthly PIT-style totals (2017–2025). Dashed
            line = Holt–Winters prediction for the next 6 months, with upper
            and lower residual bands. Not a headcount of specific people.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <label className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showHudBenchmark}
              onChange={(event) => setShowHudBenchmark(event.target.checked)}
              className="size-3.5 accent-[oklch(0.4_0.075_175)]"
            />
            Show HUD regional benchmark
          </label>
          {showHudBenchmark ? (
            <div className="mb-3 space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-4 border-t-2 border-[oklch(0.52_0.14_255)]"
                    aria-hidden="true"
                  />
                  San Diego CoC (regional benchmark)
                </span>
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={showHudCalifornia}
                    onChange={(event) =>
                      setShowHudCalifornia(event.target.checked)
                    }
                    className="size-3.5 accent-[oklch(0.62_0.13_315)]"
                  />
                  <span
                    className="w-4 border-t-2 border-dashed border-[oklch(0.62_0.13_315)]"
                    aria-hidden="true"
                  />
                  Add California (state benchmark)
                </label>
              </div>
              <p className="text-[10px]">
                Annual HUD Point-in-Time counts on the right axis, one reading
                per year taken on a single night each January. Regional totals
                for the whole San Diego city and county CoC, not downtown, so
                they give context but are not comparable to the downtown counts
                on the left axis. 2021 is missing because HUD allowed CoCs to
                skip the unsheltered count that year. California is roughly 18x
                San Diego, so turning it on rescales the axis and flattens the
                San Diego line.
              </p>
            </div>
          ) : null}
          <div className="h-72 w-full sm:h-80">
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
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, hudAxisMax]}
                  allowDecimals={false}
                  tickFormatter={(value: number) =>
                    value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                  }
                  tick={{ fontSize: 10 }}
                  width={58}
                >
                  <Label
                    value="HUD regional count"
                    angle={90}
                    position="insideRight"
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
                  connectNulls={false}
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
                {showHudBenchmark ? (
                  <>
                    <Line
                      type="linear"
                      dataKey="sanDiegoPre"
                      yAxisId="right"
                      stroke="oklch(0.52 0.14 255)"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      connectNulls
                      name="San Diego CoC (regional benchmark)"
                    />
                    <Line
                      type="linear"
                      dataKey="sanDiegoPost"
                      yAxisId="right"
                      stroke="oklch(0.52 0.14 255)"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      connectNulls
                      legendType="none"
                      tooltipType="none"
                    />
                    {showHudCalifornia ? (
                      <>
                    <Line
                      type="linear"
                      dataKey="californiaPre"
                      yAxisId="right"
                      stroke="oklch(0.62 0.13 315)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={{ r: 2.5 }}
                      connectNulls
                      name="California (state benchmark)"
                    />
                    <Line
                      type="linear"
                      dataKey="californiaPost"
                      yAxisId="right"
                      stroke="oklch(0.62 0.13 315)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={{ r: 2.5 }}
                      connectNulls
                      legendType="none"
                      tooltipType="none"
                    />
                      </>
                    ) : null}
                  </>
                ) : null}
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
          {showHudBenchmark && hudBenchmark ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              HUD regional benchmarks are annual January-night counts and use
              the secondary axis. The 2021 point is omitted because it is a
              COVID methodology gap, not a real drop. These CoC/state figures
              are not downtown counts and are not summed with the monthly
              series. Source:{" "}
              <a
                href={hudBenchmark.source}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                HUD PIT/HIC
              </a>
              .
            </p>
          ) : null}
        </CardContent>
      </Card>

      {capacity.length > 0 ? (
        <ServiceCapacityPanel
          capacity={capacity}
          currentOrgName={organizationName}
          defaultService={primaryServices[0] ?? null}
          explicitOffers={explicitOffers}
        />
      ) : null}
    </div>
  );
}
