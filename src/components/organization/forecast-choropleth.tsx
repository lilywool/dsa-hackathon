"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Layer, PathOptions, StyleFunction } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { CapacitySiteMarker } from "@/lib/data/capacity-geo";
import { needColorScale, DOWNTOWN_CENTER } from "@/lib/data/geo";
import { neighborhoodForecastKey } from "@/lib/data/forecast";
import type {
  BlockNeedProps,
  FeatureCollection,
  GeoJsonFeature,
} from "@/lib/data/types";

type Props = {
  blocks: FeatureCollection<BlockNeedProps>;
  neighborhoodValueAt: Map<string, number>;
  selectedNeighborhood: string;
  excludeNoPanel: boolean;
  maxValue: number;
  onSelectNeighborhood: (neighborhood: string) => void;
  capacitySites?: CapacitySiteMarker[];
  showHighCapacity?: boolean;
};

function FitDowntown({ widen }: { widen: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.setView(DOWNTOWN_CENTER, widen ? 12 : 14);
  }, [map, widen]);
  return null;
}

export function ForecastChoropleth({
  blocks,
  neighborhoodValueAt,
  selectedNeighborhood,
  excludeNoPanel,
  maxValue,
  onSelectNeighborhood,
  capacitySites = [],
  showHighCapacity = true,
}: Props) {
  const visible = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: blocks.features.filter((feature) =>
        excludeNoPanel ? feature.properties.has_panel_data : true,
      ),
    }),
    [blocks, excludeNoPanel],
  );

  const valueSignature = useMemo(
    () =>
      [...neighborhoodValueAt.entries()]
        .map(([name, value]) => `${name}:${Math.round(value)}`)
        .join("|"),
    [neighborhoodValueAt],
  );

  const styleFor: StyleFunction<BlockNeedProps> = (feature) => {
    const props = feature?.properties;
    if (!props) {
      return {};
    }

    if (!props.has_panel_data) {
      return {
        fillColor: "#c4c0b6",
        fillOpacity: 0.35,
        color: "#8a8578",
        weight: 0.8,
        dashArray: "3 2",
      } satisfies PathOptions;
    }

    const key = neighborhoodForecastKey(props.neighborhood);
    const value = neighborhoodValueAt.get(key) ?? 0;
    const selected = key === selectedNeighborhood;

    return {
      fillColor: needColorScale(value, maxValue),
      fillOpacity: selected ? 0.85 : 0.62,
      color: selected ? "#1f4f4a" : "#5c574c",
      weight: selected ? 1.6 : 0.5,
    } satisfies PathOptions;
  };

  const onEachFeature = (
    feature: GeoJsonFeature<BlockNeedProps>,
    layer: Layer,
  ) => {
    const props = feature.properties;
    const key = neighborhoodForecastKey(props.neighborhood);
    const value = neighborhoodValueAt.get(key) ?? 0;
    const label = props.has_panel_data
      ? `${props.block_id} · ${props.neighborhood}: ~${Math.round(value)}`
      : `${props.block_id} · ${props.neighborhood}: no panel history`;

    layer.bindTooltip(label, { sticky: true });
    layer.on({
      click: () => onSelectNeighborhood(props.neighborhood),
    });
  };

  const sites = showHighCapacity ? capacitySites : [];

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <MapContainer
        center={DOWNTOWN_CENTER}
        zoom={14}
        scrollWheelZoom={false}
        className="h-[420px] w-full z-0"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitDowntown widen={sites.some((site) => !site.insideDowntown)} />
        <GeoJSON
          key={`${selectedNeighborhood}-${excludeNoPanel}-${valueSignature}`}
          data={visible as GeoJSON.FeatureCollection}
          style={styleFor}
          onEachFeature={onEachFeature as never}
        />
        {sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={[site.lat, site.lng]}
            radius={9}
            pathOptions={{
              color: "#1f4f4a",
              fillColor: "#2f6f68",
              fillOpacity: 0.95,
              weight: 2,
            }}
          >
            <Popup>
              <div className="max-w-[220px] space-y-1.5 text-sm">
                <p className="font-medium">{site.organization}</p>
                <p className="text-xs text-muted-foreground">
                  HIGH confidence capacity
                  {!site.insideDowntown ? " · outside downtown core" : ""}
                </p>
                <ul className="space-y-1 text-xs">
                  {site.rows.map((row) => (
                    <li key={`${row.category}-${row.unit}`}>
                      <span className="font-medium">{row.category}</span>:{" "}
                      {Number.isInteger(row.value)
                        ? row.value
                        : row.value.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}{" "}
                      {row.unit}
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
