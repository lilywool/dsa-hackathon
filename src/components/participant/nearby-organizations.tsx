"use client";

import { useEffect, useMemo, useState } from "react";
import { LocateFixed, LoaderCircle } from "lucide-react";

import { loadServiceLocations } from "@/lib/data/load";
import { distanceMeters } from "@/lib/data/geo";
import type { FeatureCollection, ServiceLocationProps } from "@/lib/data/types";
import type { HelpOrganization } from "@/lib/help/queries";
import { cn } from "@/lib/utils";

type Coordinates = { lat: number; lng: number };

type NearbyOrganization = HelpOrganization & {
  lat: number;
  lng: number;
  distanceMeters: number;
};

type DisplayOrganization = HelpOrganization &
  Partial<Pick<NearbyOrganization, "lat" | "lng" | "distanceMeters">>;

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function directionFromBearing(origin: Coordinates, destination: Coordinates) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const bearing =
    (toDegrees(
      Math.atan2(
        Math.sin(deltaLng) * Math.cos(lat2),
        Math.cos(lat1) * Math.sin(lat2) -
          Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng),
      ),
    ) +
      360) %
    360;
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
    Math.round(bearing / 45) % 8
  ];
}

function distanceLabel(meters: number) {
  return `${(meters / 1609.34).toFixed(1)} mi`;
}

function siteCoordinates(
  services: FeatureCollection<ServiceLocationProps>,
  organization: HelpOrganization,
): Coordinates | null {
  const target = normalizeName(organization.name);
  const matches = services.features.filter(
    (feature) =>
      feature.geometry.type === "Point" &&
      normalizeName(feature.properties.organization) === target,
  );
  if (matches.length === 0) {
    return null;
  }

  const [lng, lat] = matches[0].geometry.type === "Point"
    ? matches[0].geometry.coordinates
    : [0, 0];
  return { lat, lng };
}

export function NearbyOrganizations({
  organizations,
}: {
  organizations: HelpOrganization[];
}) {
  const [services, setServices] =
    useState<FeatureCollection<ServiceLocationProps> | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadServiceLocations()
      .then((data) => {
        if (!cancelled) {
          setServices(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServices(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const locatedOrganizations = useMemo(() => {
    if (!services) {
      return [] as NearbyOrganization[];
    }
    return organizations.flatMap((organization) => {
      const coordinates = siteCoordinates(services, organization);
      return coordinates
        ? [{
            ...organization,
            ...coordinates,
            distanceMeters: 0,
          }]
        : [];
    });
  }, [organizations, services]);

  const visibleOrganizations = useMemo((): DisplayOrganization[] => {
    if (!location) {
      return organizations.slice(0, 3);
    }
    return locatedOrganizations
      .map((organization) => ({
        ...organization,
        distanceMeters: distanceMeters(location, organization),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 3);
  }, [locatedOrganizations, location, organizations]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Location sharing is not supported by this browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was not granted."
            : "We could not determine your location.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 },
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl">Nearest to you</h2>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium ring-1 ring-foreground/10",
            location
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-secondary text-secondary-foreground",
            "disabled:opacity-60",
          )}
        >
          {locating ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="size-4" aria-hidden="true" />
          )}
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      {locationError ? (
        <p className="text-sm text-destructive" role="alert">
          {locationError}
        </p>
      ) : null}
      {visibleOrganizations.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No nearby organizations could be located.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleOrganizations.map((organization) => (
            <li
              key={organization.id}
              className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-medium">{organization.name}</p>
                {location &&
                organization.distanceMeters != null &&
                organization.lat != null &&
                organization.lng != null ? (
                  <p className="shrink-0 text-right text-xs font-medium text-primary">
                    {distanceLabel(organization.distanceMeters)} {directionFromBearing(location, {
                      lat: organization.lat,
                      lng: organization.lng,
                    })} from you
                  </p>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {organization.neighborhood}
              </p>
              <p className="mt-2 text-sm">{organization.highlight}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
