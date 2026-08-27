"use client";

import { useEffect, useMemo } from "react";
import { DivIcon } from "leaflet";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Layer, PathOptions, StyleFunction } from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  type BlockPitEntry,
} from "@/lib/data/block-need";
import type {
  CapacityMarkerShape,
  CapacitySiteMarker,
} from "@/lib/data/capacity-geo";
import { capacityShapeLabels } from "@/lib/data/capacity-geo";
import { needColorScale, DOWNTOWN_CENTER, DOWNTOWN_DEFAULT_ZOOM } from "@/lib/data/geo";
import { neighborhoodForecastKey } from "@/lib/data/forecast";
import { formatCapacityValue } from "@/lib/data/org-capacity-match";
import type {
  TransitCorridor,
  TransitStopPoint,
} from "@/lib/data/transit-corridors";
import { nearestTransitStop } from "@/lib/data/transit-corridors";
import type {
  BlockNeedProps,
  FeatureCollection,
  GeoJsonFeature,
  GetItDoneEncampmentProps,
  GetItDoneEncampmentTrend,
} from "@/lib/data/types";
import { serviceShortLabels, type ServiceKind } from "@/lib/services";

type Props = {
  blocks: FeatureCollection<BlockNeedProps>;
  encampmentBlocks: FeatureCollection<GetItDoneEncampmentProps>;
  encampmentTrend: GetItDoneEncampmentTrend;
  activeYear: number | null;
  activeMonth: string | null;
  mapLayer: "pit" | "encampment";
  pitByBlock: Map<string, BlockPitEntry>;
  maxPitValue: number;
  selectedNeighborhood: string;
  excludeNoPanel: boolean;
  onSelectNeighborhood: (neighborhood: string) => void;
  capacitySites?: CapacitySiteMarker[];
  showCapacity?: boolean;
  showTransit?: boolean;
  transitCorridors?: TransitCorridor[];
  transitStops?: TransitStopPoint[];
  serviceFilter: ServiceKind;
};

function FitDowntown() {
  const map = useMap();
  useEffect(() => {
    map.setView(DOWNTOWN_CENTER, DOWNTOWN_DEFAULT_ZOOM);
  }, [map]);
  return null;
}

function shapeMarkup(shape: CapacityMarkerShape, size: number, fill: string) {
  const stroke = "#0f172a";
  const common = `width:${size}px;height:${size}px;background:${fill};border:2.5px solid ${stroke};box-shadow:0 1px 3px rgba(0,0,0,.35);`;

  switch (shape) {
    case "square":
      return `<div style="${common}border-radius:2px;"></div>`;
    case "diamond":
      return `<div style="${common}border-radius:2px;transform:rotate(45deg);"></div>`;
    case "triangle":
      return `<div style="width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size}px solid ${fill};filter:drop-shadow(0 0 1px ${stroke});"></div>`;
    case "hexagon":
      return `<div style="${common}clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);border:none;box-shadow:0 0 0 2px ${stroke};"></div>`;
    case "rounded":
      return `<div style="${common}border-radius:8px;"></div>`;
    case "circle":
    default:
      return `<div style="${common}border-radius:9999px;"></div>`;
  }
}

const MARKER_FILL = "#0d9488";

function encampmentColorScale(value: number, maxValue: number) {
  const ratio = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;
  if (ratio === 0) return "#eff6ff";
  if (ratio < 0.25) return "#bfdbfe";
  if (ratio < 0.5) return "#60a5fa";
  if (ratio < 0.75) return "#2563eb";
  return "#1e3a8a";
}

function capacityDivIcon(site: CapacitySiteMarker) {
  const size = site.radiusPx;
  return new DivIcon({
    className: "capacity-marker-icon",
    html: `<div class="capacity-marker-wrap">${shapeMarkup(site.shape, size, MARKER_FILL)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapLegend({
  maxPitValue,
  maxReportValue,
  mapLayer,
  reportYear,
  reportsAvailable,
  encampmentTrend,
  serviceFilter,
  showCapacity,
  showTransit,
}: {
  maxPitValue: number;
  maxReportValue: number;
  mapLayer: "pit" | "encampment";
  reportYear: string | null;
  reportsAvailable: boolean;
  encampmentTrend: GetItDoneEncampmentTrend;
  serviceFilter: ServiceKind;
  showCapacity: boolean;
  showTransit: boolean;
}) {
  const mid = Math.round((maxPitValue || 1) / 2);
  const shape = (
    {
      shelter: "circle",
      food: "square",
      healthcare: "diamond",
      employment: "triangle",
      clothing: "hexagon",
      other: "rounded",
    } as const
  )[serviceFilter];

  return (
    <div className="space-y-3 rounded-xl bg-muted/40 px-4 py-3 text-xs ring-1 ring-foreground/10">
      <div>
        <p className="font-medium text-foreground">Map legend</p>
        <p className="mt-0.5 text-muted-foreground">
          {mapLayer === "encampment"
            ? "311 encampment reports are complaint volume, not a count of people."
            : "Heatmap = simulated point-in-time (PIT) homeless population per block, allocated from neighborhood PIT totals using block count history."}{" "}
          Markers = providers for {serviceShortLabels[serviceFilter].toLowerCase()}{" "}
          (size = capacity). Basemap is grayscale so population and transit stay
          readable.
        </p>
      </div>

      {mapLayer === "encampment" ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            311 encampment reports (complaint volume, not a count of people)
          </p>
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-muted-foreground">Low</span>
            <div
              className="h-2.5 flex-1 rounded-full"
              style={{
                background: "linear-gradient(90deg, #eff6ff, #60a5fa, #1e3a8a)",
              }}
            />
            <span className="tabular-nums text-muted-foreground">
              High ({maxReportValue.toLocaleString()})
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {!reportsAvailable
              ? "No 311 category data is available before 2018."
              : reportYear
                ? `Year: ${reportYear}`
                : "Total reports (available years 2018 to 2025)"}. {" "}
            {encampmentTrend.caveats["2025"]}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            PIT homeless population (people)
          </p>
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-muted-foreground">Low</span>
            <div
              className="h-2.5 flex-1 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${needColorScale(0, 1)}, ${needColorScale(0.33, 1)}, ${needColorScale(0.66, 1)}, ${needColorScale(1, 1)})`,
              }}
            />
            <span className="tabular-nums text-muted-foreground">
              High ({(maxPitValue || 0).toLocaleString()})
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Green</span>
            <span>~{mid.toLocaleString()} mid</span>
            <span>Red</span>
          </div>
        </div>
      )}

      {showCapacity ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Resource providers · {serviceShortLabels[serviceFilter]}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-flex size-4 items-center justify-center"
                dangerouslySetInnerHTML={{
                  __html: shapeMarkup(shape, 12, MARKER_FILL),
                }}
              />
              {capacityShapeLabels[shape]} provider
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block rounded-full bg-[#0d9488] ring-2 ring-slate-900"
                style={{ width: 10, height: 10 }}
              />
              Smaller = lower capacity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block rounded-full bg-[#0d9488] ring-2 ring-slate-900"
                style={{ width: 18, height: 18 }}
              />
              Larger = higher avg capacity
            </span>
          </div>
        </div>
      ) : null}

      {showTransit ? (
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-8 bg-[#c23b2e]" />
            Transit corridor
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-0.5 w-8 bg-[#c23b2e]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg,#c23b2e 0 4px,transparent 4px 7px)",
                backgroundColor: "transparent",
              }}
            />
            Resource → nearest stop
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#c23b2e]" />
            Transit stop
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function ForecastChoropleth({
  blocks,
  encampmentBlocks,
  encampmentTrend,
  activeYear,
  activeMonth,
  mapLayer,
  pitByBlock,
  maxPitValue,
  selectedNeighborhood,
  excludeNoPanel,
  onSelectNeighborhood,
  capacitySites = [],
  showCapacity = true,
  showTransit = true,
  transitCorridors = [],
  transitStops = [],
  serviceFilter,
}: Props) {
  const pitMap = useMemo(
    () => pitByBlock ?? new Map<string, BlockPitEntry>(),
    [pitByBlock],
  );
  const pitMax = maxPitValue > 0 ? maxPitValue : 1;
  const visible = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: blocks.features.filter((feature) =>
        excludeNoPanel ? feature.properties.has_panel_data : true,
      ),
    }),
    [blocks, excludeNoPanel],
  );
  const reportYear =
    activeYear && activeYear >= 2018 && activeYear <= 2025
      ? String(activeYear)
      : null;
  const reportsAvailable = activeYear === null || activeYear >= 2018;
  const reportValues = useMemo(() => {
    const values = new Map<string, number>();
    for (const feature of encampmentBlocks.features) {
      const props = feature.properties;
      // Prefer the exact month the slider is on. reports_by_month is sparse,
      // so an absent key means zero reports that month, not missing data.
      const value =
        activeMonth && props.reports_by_month
          ? (props.reports_by_month[activeMonth] ?? 0)
          : reportYear && props.reports_by_year[reportYear] !== undefined
            ? props.reports_by_year[reportYear]
            : props.total_reports;
      values.set(props.block_id, value);
    }
    return values;
  }, [encampmentBlocks, reportYear, activeMonth]);

  const maxReportValue = useMemo(
    () => Math.max(1, ...reportValues.values()),
    [reportValues],
  );

  const valueSignature = useMemo(() => {
    let sum = 0;
    let max = 0;
    for (const entry of pitMap.values()) {
      sum += entry.value;
      max = Math.max(max, entry.value);
    }
    return `${pitMap.size}:${sum}:${max}`;
  }, [pitMap]);

  const styleFor: StyleFunction<BlockNeedProps> = (feature) => {
    const props = feature?.properties;
    if (!props) {
      return {};
    }

    if (!props.has_panel_data) {
      return {
        fillColor: "#94a3b8",
        fillOpacity: 0.12,
        color: "#64748b",
        weight: 0.5,
        dashArray: "3 2",
      } satisfies PathOptions;
    }

    const entry = pitMap.get(props.block_id) ?? {
      value: 0,
      source: "none" as const,
    };
    const key = neighborhoodForecastKey(props.neighborhood);
    const selected = key === selectedNeighborhood;

    return {
      fillColor: needColorScale(entry.value, pitMax),
      fillOpacity: entry.source === "none" ? 0.2 : selected ? 0.72 : 0.55,
      color: selected ? "#0f172a" : "#475569",
      weight: selected ? 1.4 : 0.35,
    } satisfies PathOptions;
  };

  const encampmentStyleFor: StyleFunction<GetItDoneEncampmentProps> = (
    feature,
  ) => {
    const props = feature?.properties;
    if (!props) {
      return {};
    }
    const value = reportValues.get(props.block_id) ?? props.total_reports;
    const selected = props.neighborhood === selectedNeighborhood;
    return {
      fillColor: encampmentColorScale(value, maxReportValue),
      fillOpacity: selected ? 0.78 : 0.62,
      color: selected ? "#172554" : "#1d4ed8",
      weight: selected ? 1.4 : 0.5,
    } satisfies PathOptions;
  };

  const onEachFeature = (
    feature: GeoJsonFeature<BlockNeedProps>,
    layer: Layer,
  ) => {
    const props = feature.properties;
    const entry = pitMap.get(props.block_id) ?? {
      value: 0,
      source: "none" as const,
    };
    const label = props.has_panel_data
      ? `${props.block_id} · ${props.neighborhood}: ~${Math.round(entry.value)} people (simulated PIT)`
      : `${props.block_id} · ${props.neighborhood}: no panel history`;

    layer.bindTooltip(label, { sticky: true });
    layer.on({
      click: () => onSelectNeighborhood(props.neighborhood),
    });
  };

  const onEachEncampmentFeature = (
    feature: GeoJsonFeature<GetItDoneEncampmentProps>,
    layer: Layer,
  ) => {
    const props = feature.properties;
    const value = reportValues.get(props.block_id) ?? props.total_reports;
    layer.bindTooltip(
      `${props.block_id} · ${props.neighborhood}: ${value.toLocaleString()} 311 encampment reports (complaint volume, not a count of people)`,
      { sticky: true },
    );
    layer.on({
      click: () => onSelectNeighborhood(props.neighborhood),
    });
  };

  const sites = useMemo(
    () => (showCapacity ? capacitySites : []),
    [showCapacity, capacitySites],
  );
  const connectors = useMemo(() => {
    if (!showTransit || transitStops.length === 0) {
      return [] as Array<{
        id: string;
        positions: [number, number][];
      }>;
    }
    return sites.flatMap((site) => {
      const nearest = nearestTransitStop(site, transitStops);
      if (!nearest) {
        return [];
      }
      return [
        {
          id: `link-${site.id}`,
          positions: [
            [site.lat, site.lng] as [number, number],
            [nearest.stop.lat, nearest.stop.lng] as [number, number],
          ],
        },
      ];
    });
  }, [sites, showTransit, transitStops]);

  return (
    <div className="space-y-3">
      <div className="insights-map overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <MapContainer
          key="org-insights-downtown-map"
          center={DOWNTOWN_CENTER}
          zoom={DOWNTOWN_DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="h-[480px] w-full z-0"
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          <FitDowntown />
          {mapLayer === "pit" ? (
            <GeoJSON
              key={`${selectedNeighborhood}-${excludeNoPanel}-${valueSignature}-${serviceFilter}`}
              data={visible as GeoJSON.FeatureCollection}
              style={styleFor}
              onEachFeature={onEachFeature as never}
            />
          ) : reportsAvailable ? (
            <GeoJSON
              key={`${selectedNeighborhood}-${activeMonth ?? reportYear}-${mapLayer}-${maxReportValue}`}
              data={encampmentBlocks as unknown as GeoJSON.FeatureCollection}
              style={encampmentStyleFor}
              onEachFeature={onEachEncampmentFeature as never}
            />
          ) : (
            null
          )}

          {showTransit
            ? transitCorridors.map((corridor) => (
                <Polyline
                  key={corridor.id}
                  positions={corridor.positions}
                  pathOptions={{
                    color: "#c23b2e",
                    weight: 1.25,
                    opacity: 0.75,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              ))
            : null}

          {showTransit
            ? connectors.map((link) => (
                <Polyline
                  key={link.id}
                  positions={link.positions}
                  pathOptions={{
                    color: "#c23b2e",
                    weight: 1,
                    opacity: 0.55,
                    dashArray: "4 5",
                  }}
                />
              ))
            : null}

          {showTransit
            ? transitStops.map((stop) => (
                <CircleMarker
                  key={stop.id}
                  center={[stop.lat, stop.lng]}
                  radius={2.5}
                  pathOptions={{
                    color: "#9a2f26",
                    fillColor: "#c23b2e",
                    fillOpacity: 0.85,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <p className="text-sm font-medium">{stop.name}</p>
                    <p className="text-xs text-muted-foreground">Transit stop</p>
                  </Popup>
                </CircleMarker>
              ))
            : null}

          {sites.map((site) => (
            <Marker
              key={site.id}
              position={[site.lat, site.lng]}
              icon={capacityDivIcon(site)}
            >
              <Popup>
                <div className="max-w-[240px] space-y-1.5 text-sm">
                  <p className="font-medium">{site.organization}</p>
                  <p className="text-xs text-muted-foreground">
                    {serviceShortLabels[site.service]} · {site.confidence}
                    {!site.insideDowntown ? " · near downtown" : ""}
                  </p>
                  <p className="text-xs">
                    <span className="font-medium">
                      {formatCapacityValue(site.capacityValue)}
                    </span>{" "}
                    {site.capacityUnit}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <MapLegend
        maxPitValue={pitMax}
        maxReportValue={maxReportValue}
        mapLayer={mapLayer}
        reportYear={reportYear}
        reportsAvailable={reportsAvailable}
        encampmentTrend={encampmentTrend}
        serviceFilter={serviceFilter}
        showCapacity={showCapacity}
        showTransit={showTransit}
      />
    </div>
  );
}
