"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { DOWNTOWN_CENTER } from "@/lib/data/geo";
import type { ServiceSite } from "@/components/participant/service-finder";

type Stop = { id: string; name: string; lat: number; lng: number };

type Props = {
  sites: ServiceSite[];
  accessibleStops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function FocusSelected({
  site,
}: {
  site: ServiceSite | undefined;
}) {
  const map = useMap();
  useEffect(() => {
    if (!site) {
      return;
    }
    map.panTo([site.lat, site.lng], { animate: true });
  }, [map, site]);
  return null;
}

export function ServiceFinderMap({
  sites,
  accessibleStops,
  selectedId,
  onSelect,
}: Props) {
  const selected = useMemo(
    () => sites.find((site) => site.id === selectedId),
    [sites, selectedId],
  );

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      <MapContainer
        center={DOWNTOWN_CENTER}
        zoom={13}
        scrollWheelZoom={false}
        className="h-[320px] w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FocusSelected site={selected} />
        {accessibleStops.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lng]}
            radius={4}
            pathOptions={{
              color: "#5a7a74",
              fillColor: "#8fb0a8",
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Popup>
              <p className="text-sm font-medium">{stop.name}</p>
              <p className="text-xs text-muted-foreground">
                Wheelchair boarding available
              </p>
            </Popup>
          </CircleMarker>
        ))}
        {sites.map((site) => {
          const active = site.id === selectedId;
          return (
            <CircleMarker
              key={site.id}
              center={[site.lat, site.lng]}
              radius={active ? 10 : 7}
              eventHandlers={{
                click: () => onSelect(site.id),
              }}
              pathOptions={{
                color: active ? "#1f4f4a" : "#8a5a32",
                fillColor: active ? "#2f6f68" : "#c47a3a",
                fillOpacity: 0.85,
                weight: active ? 2 : 1,
              }}
            >
              <Popup>
                <p className="text-sm font-medium">{site.organization}</p>
                <p className="text-xs">{site.address}</p>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
