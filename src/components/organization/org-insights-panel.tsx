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
      blocks: FeatureCollection<import("@/lib/data/types").BlockNeedProps>;
      capacity: OrgCapacityRow[];
      capacityGeo: FeatureCollection<OrgCapacityGeoProps>;
      transitStops: TransitStopPoint[];
      transitCorridors: TransitCorridor[];
      explicitOffers: ExplicitServiceIndex;
    }) => {
      setNeighborhoods(payload.neighborhoods);
      setBlocks(payload.blocks);
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
      loadBlockNeedHeatmap(),
      loadOrgCapacity(),
      loadOrgCapacityGeo(),
      loadServiceLocations(),
      loadTransitAccessibility(),
    ])
      .then(
        ([
          neighborhoodData,
          blockData,
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
            blocks: blockData,
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
                return series.map((point) => ({
      date: point.date,
      label: formatMonthLabel(point.date),
      observed: point.kind === "history" ? point.value : null,
      forecast: point.kind === "forecast" ? point.value : null,
      lower: point.kind === "forecast" ? point.lower : null,
      upper: point.kind === "forecast" ? point.upper : null,
    }));
  }, [forecastsByNeighborhood, selectedNeighborhood]);

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
