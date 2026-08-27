"use client";

import { useEffect, useMemo } from "react";
import { Accessibility, MapPin } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { DOWNTOWN_CENTER } from "@/lib/data/geo";
import type {
  SearchLocation,
  ServiceSite,
} from "@/components/participant/service-finder";

type Stop = { id: string; name: string; lat: number; lng: number };
const DEFAULT_MAP_ZOOM = 14;

type Props = {
  sites: ServiceSite[];
  accessibleStops: Stop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  location: SearchLocation | null;
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

function FocusLocation({ location }: { location: SearchLocation | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 15, { animate: true });
    } else {
      map.setView(DOWNTOWN_CENTER, DEFAULT_MAP_ZOOM, { animate: true });
    }
  }, [location, map]);
  return null;
}

export function ServiceFinderMap({
  sites,
  accessibleStops,
  selectedId,
  onSelect,
  location,
}: Props) {
  const selected = useMemo(
    () => sites.find((site) => site.id === selectedId),
    [sites, selectedId],
  );

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
        <MapContainer
          center={DOWNTOWN_CENTER}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom={false}
          className="h-[320px] w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FocusSelected site={selected} />
          <FocusLocation location={location} />
          {location ? (
            <CircleMarker
              center={[location.lat, location.lng]}
              radius={9}
              pathOptions={{
                color: "#1f4f4a",
                fillColor: "#f3c969",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <p className="text-sm font-medium">Searched address</p>
                <p className="text-xs">{location.label}</p>
              </Popup>
            </CircleMarker>
          ) : null}
          {location && selected ? (
            <>
              <Polyline
                positions={[
                  [location.lat, location.lng],
                  [selected.lat, selected.lng],
                ]}
                pathOptions={{
                  color: "#fffaf0",
                  weight: 9,
                  opacity: 0.95,
                }}
              />
              <Polyline
                positions={[
                  [location.lat, location.lng],
                  [selected.lat, selected.lng],
                ]}
                pathOptions={{
                  color: "#d97706",
                  weight: 5,
                  opacity: 1,
                  dashArray: "10 8",
                }}
              />
            </>
          ) : null}
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

      <div
        className="rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10"
        aria-label="Map legend"
      >
        <p className="font-medium">Map legend</p>
        <ul className="mt-2 space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2.5">
            <span
              className="mt-1 size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: "#c47a3a" }}
              aria-hidden="true"
            />
            <span>
              <span className="text-foreground">Service site</span> — places
              that offer food, shelter, healthcare, and other help
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span
              className="mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-[#1f4f4a]"
              style={{ backgroundColor: "#2f6f68" }}
              aria-hidden="true"
            />
            <span>
              <span className="text-foreground">Selected site</span> — the
              location highlighted in the list below
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span
              className="mt-1 size-2 shrink-0 rounded-full"
              style={{ backgroundColor: "#8fb0a8" }}
              aria-hidden="true"
            />
            <span>
              <span className="text-foreground">Accessible transit stop</span>{" "}
              — MTS stops with wheelchair boarding (toggle with “Show transit
              stops”)
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <MapPin
              className="mt-0.5 size-3.5 shrink-0 text-foreground"
              aria-hidden="true"
            />
            <span>
              <span className="text-foreground">Downtown boundary</span> —
              filter to sites inside the downtown San Diego study area (not a
              line drawn on the map)
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Accessibility
              className="mt-0.5 size-3.5 shrink-0 text-foreground"
              aria-hidden="true"
            />
            <span>
              <span className="text-foreground">Near accessible transit</span>{" "}
              — only sites within about a 400m walk of a wheelchair-boarding
              stop
            </span>
          </li>
          {location && selected ? (
            <li className="flex items-start gap-2.5">
              <span
                className="mt-2 h-0.5 w-7 shrink-0 border-t-2 border-dashed border-amber-600"
                aria-hidden="true"
              />
              <span>
                <span className="text-foreground">Approximate route</span> —
                from your location to the selected site
              </span>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
