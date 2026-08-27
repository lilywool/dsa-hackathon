"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import dynamic from "next/dynamic";
import {
  Accessibility,
  LocateFixed,
  LoaderCircle,
  MapPin,
  Search,
} from "lucide-react";

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
const SEARCH_RADIUS_METERS = 3218.68;

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

export type SearchLocation = {
  lat: number;
  lng: number;
  label: string;
};

type AddressSuggestion = SearchLocation;

const SAN_DIEGO_VIEWBOX = "-117.3,32.85,-116.9,32.55";

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
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<SearchLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

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

  useEffect(() => {
    const query = address.trim();
    if (query.length < 3 || query === "Current location") {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=us&bounded=1&viewbox=${SAN_DIEGO_VIEWBOX}&q=${encodeURIComponent(query)}`,
          { headers: { Accept: "application/json" }, signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Address suggestions are temporarily unavailable.");
        }
        const matches = (await response.json()) as Array<{
          lat: string;
          lon: string;
          display_name: string;
        }>;
        setSuggestions(
          matches.map((match) => ({
            lat: Number(match.lat),
            lng: Number(match.lon),
            label: match.display_name,
          })),
        );
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSuggestionsLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address]);

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
      .filter((site) =>
        location
          ? distanceMeters(location, site) <= SEARCH_RADIUS_METERS
          : true,
      )
      .sort((a, b) => {
        if (location) {
          return distanceMeters(location, a) - distanceMeters(location, b);
        }
        const aDist = a.nearestAccessibleStop?.meters ?? Number.POSITIVE_INFINITY;
        const bDist = b.nearestAccessibleStop?.meters ?? Number.POSITIVE_INFINITY;
        if (accessibleOnly) {
          return aDist - bDist;
        }
        return a.organization.localeCompare(b.organization);
      });
  }, [sites, need, downtownOnly, accessibleOnly, location]);

  async function searchAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = address.trim();
    if (!query) {
      setLocation(null);
      setLocationError("Enter a street address to search.");
      return;
    }

    setLocating(true);
    setLocationError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error("Address search is temporarily unavailable.");
      }
      const matches = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      const match = matches[0];
      if (!match) {
        setLocation(null);
        setLocationError("We could not find that address. Try adding the city or ZIP code.");
        return;
      }
      setLocation({
        lat: Number(match.lat),
        lng: Number(match.lon),
        label: match.display_name,
      });
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Could not search that address.",
      );
    } finally {
      setLocating(false);
    }
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    setAddress(suggestion.label);
    setSuggestions([]);
    setLocation(suggestion);
    setLocationError(null);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location sharing is not supported by this browser.");
      return;
    }

    setLocating(true);
    setLocationError(null);
    setSuggestions([]);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const currentLocation = {
          lat: coords.latitude,
          lng: coords.longitude,
          label: "Your approximate location",
        } satisfies SearchLocation;
        setAddress("Current location");
        setLocation(currentLocation);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was not granted. You can search by address instead."
            : "We could not determine your location. You can search by address instead.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 },
    );
  }

  const effectiveSelectedId =
    filtered.length === 0
      ? null
      : selectedId && filtered.some((site) => site.id === selectedId)
        ? selectedId
        : filtered[0].id;

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

      <form onSubmit={searchAddress} className="space-y-2">
        <label htmlFor="service-address" className="text-sm font-medium">
          Search by address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="service-address"
              type="search"
              value={address}
              onChange={(event) => {
                const value = event.target.value;
                setAddress(value);
                setLocation(null);
                if (value.trim().length < 3) {
                  setSuggestions([]);
                  setSuggestionsLoading(false);
                }
                if (!value.trim()) {
                  setLocation(null);
                  setLocationError(null);
                  setSuggestions([]);
                }
              }}
              placeholder="Enter a street address"
              autoComplete="street-address"
              className="h-11 w-full rounded-xl bg-card pl-10 pr-3 text-sm ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={locating}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {locating ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            {locating ? "Searching…" : "Search"}
          </button>
        </div>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium text-secondary-foreground ring-1 ring-foreground/10 disabled:opacity-60"
        >
          <LocateFixed className="size-4" aria-hidden="true" />
          Use my location
        </button>
        {suggestionsLoading ? (
          <p className="text-xs text-muted-foreground">
            Finding San Diego addresses…
          </p>
        ) : null}
        {suggestions.length > 0 ? (
          <div
            className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
            role="listbox"
            aria-label="San Diego address suggestions"
          >
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.lat}:${suggestion.lng}:${suggestion.label}`}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className="flex w-full items-start gap-2 border-b border-border px-3 py-3 text-left text-sm last:border-b-0 hover:bg-muted"
                role="option"
                aria-selected="false"
              >
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{suggestion.label}</span>
              </button>
            ))}
          </div>
        ) : null}
        {location ? (
          <p className="text-xs text-muted-foreground">
            Showing service sites within 2 miles of your searched address.
          </p>
        ) : null}
        {locationError ? (
          <p className="text-sm text-destructive" role="alert">
            {locationError}
          </p>
        ) : null}
      </form>

      <p className="text-sm text-muted-foreground">
        {filtered.length} site{filtered.length === 1 ? "" : "s"}
        {need ? ` for ${serviceShortLabels[need].toLowerCase()}` : ""}
        {location ? " within 2 miles" : ""}
        {accessibleOnly
          ? ` within a ${WALK_METERS}m walk of a wheelchair-boarding stop`
          : ""}
        .
      </p>

      <ServiceFinderMap
        sites={filtered}
        accessibleStops={showTransit ? accessibleStops : []}
        selectedId={effectiveSelectedId}
        onSelect={setSelectedId}
        location={location}
      />

      <ul className="space-y-3">
        {filtered.length === 0 ? (
          <li className="rounded-2xl bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">
            {location
              ? "No sites match these filters within 2 miles. Try a different address or turn off accessible transit or downtown-only."
              : "No sites match these filters. Try turning off accessible transit or downtown-only."}
          </li>
        ) : (
          filtered.slice(0, 12).map((site) => {
            const active = site.id === effectiveSelectedId;
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
                  {location ? (
                    <p className="mt-3 text-right text-xs font-medium text-primary">
                      {(distanceMeters(location, site) / 1609.34).toFixed(1)} mi
                      {" "}from you
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
