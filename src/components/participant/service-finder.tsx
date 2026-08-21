"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import dynamic from "next/dynamic";
import { Accessibility, MapPin } from "lucide-react";

import { NeedBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import {
  loadServiceLocations,
  loadTransitAccessibility,
} from "@/lib/data/load";
import { distanceMeters } from "@/lib/data/geo";
import {
  geoServiceToApp,
  isWheelchairAccessibleStop,
} from "@/lib/data/services-map";
import type {
  FeatureCollection,
  ServiceLocationProps,
  TransitStopProps,
} from "@/lib/data/types";
import type { ServiceKind } from "@/lib/services";
import { serviceShortLabels } from "@/lib/services";
import { cn } from "@/lib/utils";

const ServiceFinderMap = dynamic(
  () =>
    import("@/components/participant/service-finder-map").then(
      (mod) => mod.ServiceFinderMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-2xl bg-card text-sm text-muted-foreground ring-1 ring-foreground/10">
        Loading map…
      </div>
    ),
  },
);

const WALK_METERS = 400;

export type ServiceSite = {
  id: string;
  organization: string;
  orgKey: string;
  address: string;
  services: ServiceKind[];
  lat: number;
  lng: number;
  insideDowntown: boolean;
  nearestAccessibleStop: {
    name: string;
    meters: number;
  } | null;
};

type Props = {
  need?: ServiceKind;
};

export function ServiceFinder({ need }: Props) {
  const [services, setServices] =
    useState<FeatureCollection<ServiceLocationProps> | null>(null);
  const [transit, setTransit] =
    useState<FeatureCollection<TransitStopProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [downtownOnly, setDowntownOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTransit, setShowTransit] = useState(true);

  const onLoaded = useEffectEvent(
    (payload: {
      services: FeatureCollection<ServiceLocationProps>;
      transit: FeatureCollection<TransitStopProps>;
    }) => {
      setServices(payload.services);
      setTransit(payload.transit);
    },
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadServiceLocations(), loadTransitAccessibility()])
      .then(([serviceData, transitData]) => {
        if (!cancelled) {
          onLoaded({ services: serviceData, transit: transitData });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load map data");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accessibleStops = useMemo(() => {
    if (!transit) {
      return [] as { id: string; name: string; lat: number; lng: number }[];
    }
    return transit.features
      .filter((feature) =>
        isWheelchairAccessibleStop(feature.properties.wheelchair_boarding),
      )
      .map((feature) => ({
        id: feature.properties.stop_id,
        name: feature.properties.stop_name,
        lat: feature.geometry.type === "Point" ? feature.geometry.coordinates[1] : 0,
        lng: feature.geometry.type === "Point" ? feature.geometry.coordinates[0] : 0,
      }))
      .filter((stop) => stop.lat && stop.lng);
  }, [transit]);

  const sites = useMemo(() => {
    if (!services) {
      return [] as ServiceSite[];
    }

    return services.features
      .map((feature, index) => {
        if (feature.geometry.type !== "Point") {
          return null;
        }
        const [lng, lat] = feature.geometry.coordinates;
        const appServices = feature.properties.services
          .map((tag) => geoServiceToApp(tag))
          .filter((tag): tag is ServiceKind => tag !== null);
        const uniqueServices = [...new Set(appServices)];

        let nearest: ServiceSite["nearestAccessibleStop"] = null;
        for (const stop of accessibleStops) {
          const meters = distanceMeters({ lat, lng }, stop);
          if (meters <= WALK_METERS) {
            if (!nearest || meters < nearest.meters) {
              nearest = { name: stop.name, meters };
            }
          }
        }

        return {
          id: `${feature.properties.org_key}-${index}`,
          organization: feature.properties.organization,
          orgKey: feature.properties.org_key,
          address: feature.properties.address,
          services: uniqueServices,
          lat,
          lng,
          insideDowntown: feature.properties.inside_downtown_boundary,
          nearestAccessibleStop: nearest,
        } satisfies ServiceSite;
      })
      .filter((site): site is ServiceSite => site !== null);
  }, [services, accessibleStops]);

  const filtered = useMemo(() => {
    return sites
      .filter((site) => (need ? site.services.includes(need) : true))
      .filter((site) => (downtownOnly ? site.insideDowntown : true))
      .filter((site) =>
        accessibleOnly ? site.nearestAccessibleStop !== null : true,
      )
      .sort((a, b) => {
        const aDist = a.nearestAccessibleStop?.meters ?? Number.POSITIVE_INFINITY;
        const bDist = b.nearestAccessibleStop?.meters ?? Number.POSITIVE_INFINITY;
        if (accessibleOnly) {
          return aDist - bDist;
        }
        return a.organization.localeCompare(b.organization);
      });
  }, [sites, need, downtownOnly, accessibleOnly]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((site) => site.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  if (error) {
    return (
      <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!services || !transit) {
    return (
      <p className="text-sm text-muted-foreground">Loading service map…</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAccessibleOnly((value) => !value)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1",
            accessibleOnly
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-card text-foreground ring-foreground/10",
          )}
          aria-pressed={accessibleOnly}
        >
          <Accessibility className="size-4" aria-hidden="true" />
          Near accessible transit
        </button>
        <button
          type="button"
          onClick={() => setDowntownOnly((value) => !value)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1",
            downtownOnly
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-card text-foreground ring-foreground/10",
          )}
          aria-pressed={downtownOnly}
        >
          <MapPin className="size-4" aria-hidden="true" />
          Downtown boundary
        </button>
        <button
          type="button"
          onClick={() => setShowTransit((value) => !value)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1",
            showTransit
              ? "bg-secondary text-secondary-foreground ring-foreground/10"
              : "bg-card text-muted-foreground ring-foreground/10",
          )}
          aria-pressed={showTransit}
        >
          Show transit stops
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} site{filtered.length === 1 ? "" : "s"}
        {need ? ` for ${serviceShortLabels[need].toLowerCase()}` : ""}
        {accessibleOnly
          ? ` within a ${WALK_METERS}m walk of a wheelchair-boarding stop`
          : ""}
        .
      </p>

      <ServiceFinderMap
        sites={filtered}
        accessibleStops={showTransit ? accessibleStops : []}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <ul className="space-y-3">
        {filtered.length === 0 ? (
          <li className="rounded-2xl bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">
            No sites match these filters. Try turning off accessible transit or
            downtown-only.
          </li>
        ) : (
          filtered.slice(0, 12).map((site) => {
            const active = site.id === selectedId;
            return (
              <li key={site.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(site.id)}
                  className={cn(
                    "w-full rounded-2xl bg-card p-4 text-left ring-1 transition-shadow",
                    active
                      ? "ring-primary shadow-md"
                      : "ring-foreground/10 hover:shadow-sm",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{site.organization}</p>
                    {site.insideDowntown ? (
                      <Badge variant="secondary">Downtown</Badge>
                    ) : null}
                    {site.nearestAccessibleStop ? (
                      <Badge variant="outline">
                        Accessible stop ·{" "}
                        {Math.round(site.nearestAccessibleStop.meters)}m
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {site.address}
                  </p>
                  {site.nearestAccessibleStop ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Nearest accessible: {site.nearestAccessibleStop.name}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {site.services.map((service) => (
                      <NeedBadge key={service} need={service} />
                    ))}
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
