import type { ServiceKind } from "@/lib/supabase/database.types";

export type { ServiceKind };

export const SERVICE_KINDS: ServiceKind[] = [
  "shelter",
  "food",
  "healthcare",
  "employment",
  "clothing",
  "other",
];

export const serviceLabels: Record<ServiceKind, string> = {
  shelter: "A place to sleep",
  food: "A meal",
  healthcare: "Health care",
  employment: "Employment or training",
  clothing: "Clothes",
  other: "Something else",
};

export const serviceShortLabels: Record<ServiceKind, string> = {
  shelter: "Shelter",
  food: "Food",
  healthcare: "Health",
  employment: "Employment",
  clothing: "Clothes",
  other: "Other",
};

export const servicePrompts: Record<ServiceKind, string> = {
  shelter: "I need a place to sleep",
  food: "I need a meal",
  healthcare: "I need health care",
  employment: "I need employment or training",
  clothing: "I need clothes",
  other: "I need something else",
};

export const needOptions: { id: ServiceKind; prompt: string }[] = SERVICE_KINDS.map(
  (id) => ({ id, prompt: servicePrompts[id] }),
);

export function isServiceKind(value: string | undefined): value is ServiceKind {
  return SERVICE_KINDS.includes(value as ServiceKind);
}

export function organizationProvides(
  services: ServiceKind[],
  need: ServiceKind,
) {
  return services.includes(need);
}

export function matchOrganizations<T extends { services: ServiceKind[] }>(
  organizations: T[],
  need: ServiceKind | undefined,
) {
  if (!need) {
    return organizations;
  }

  return organizations.filter((organization) =>
    organizationProvides(organization.services, need),
  );
}

export function matchRequests<T extends { need: ServiceKind }>(
  requests: T[],
  services: ServiceKind[],
) {
  return requests.filter((request) => services.includes(request.need));
}

export function servicesSummary(services: ServiceKind[]) {
  const labels = services.map((service) => serviceShortLabels[service].toLowerCase());

  if (labels.length === 0) {
    return "Ready to help";
  }

  if (labels.length === 1) {
    return `Helps with ${labels[0]}`;
  }

  if (labels.length === 2) {
    return `Helps with ${labels[0]} and ${labels[1]}`;
  }

  return `Helps with ${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatWaited(iso: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60_000),
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}
