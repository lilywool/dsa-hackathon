import { cache } from "react";

import {
  DEMO_ORG_CODE,
  DEMO_PARTICIPANT_ID,
  isDemoOrganizationId,
  isDemoUserId,
} from "@/lib/auth/demo";
import { readDemoRequests } from "@/lib/help/demo-store";
import {
  formatWaited,
  initialsFromName,
  serviceLabels,
} from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  RequestStatus,
  ServiceKind,
} from "@/lib/supabase/database.types";

export type OwnedOrganization = {
  id: string | null;
  org_id?: string | null;
  name: string;
  location: string;
  services: ServiceKind[];
  website: string | null;
  phone: string | null;
  notes: string | null;
};

export type DirectoryOrganization = {
  id: string;
  name: string;
  location: string;
  services: ServiceKind[];
  website: string | null;
  phone: string | null;
  notes: string | null;
};

export type HelpOrganization = {
  id: string;
  name: string;
  neighborhood: string;
  services: ServiceKind[];
  highlight: string;
  openLabel: string;
  website: string | null;
  phone: string | null;
};

export type IncomingRequest = {
  id: string;
  name: string;
  initials: string;
  need: ServiceKind;
  note: string;
  waited: string;
  status: RequestStatus;
};

export async function getOwnedOrganization(
  profile: Profile,
): Promise<OwnedOrganization | null> {
  return loadOwnedOrganization(profile.id);
}

const loadOwnedOrganization = cache(
  async (profileId: string): Promise<OwnedOrganization | null> => {
    const supabase = await createClient();

    if (isDemoOrganizationId(profileId)) {
      const { data } = await supabase
        .from("organizations")
        .select("id, org_id, name, location, services, website, phone, notes")
        .eq("org_id", DEMO_ORG_CODE)
        .maybeSingle();

      if (data) {
        return data;
      }
    }

    const { data } = await supabase
      .from("organizations")
      .select("id, org_id, name, location, services, website, phone, notes")
      .eq("owner_id", profileId)
      .maybeSingle();

    return data;
  },
);

export async function listDirectoryOrganizations(need?: ServiceKind) {
  const supabase = await createClient();
  let query = supabase
    .from("organizations")
    .select("id, name, location, services, website, phone, notes")
    .order("name");

  if (need) {
    query = query.contains("services", [need]);
  }

  const { data } = await query;
  return (data ?? []) as DirectoryOrganization[];
}

export function toHelpOrganization(
  organization: DirectoryOrganization,
): HelpOrganization {
  return {
    id: organization.id,
    name: organization.name,
    neighborhood: organization.location,
    services: organization.services,
    highlight: organization.notes ?? "",
    openLabel: organization.phone ? `Call ${organization.phone}` : "San Diego",
    website: organization.website,
    phone: organization.phone,
  };
}

export async function listIncomingRequests(
  organizationId: string,
  services: ServiceKind[],
): Promise<IncomingRequest[]> {
  if (services.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("help_requests")
    .select("id, participant_name, need, note, status, created_at")
    .eq("organization_id", organizationId)
    .in("need", services)
    .order("created_at", { ascending: false });

  const fromDb = (data ?? []).map((request) => ({
    id: request.id,
    name: request.participant_name,
    initials: initialsFromName(request.participant_name),
    need: request.need,
    note:
      request.note?.trim() ||
      `Asked for ${serviceLabels[request.need].toLowerCase()}.`,
    waited: formatWaited(request.created_at),
    status: request.status,
    created_at: request.created_at,
  }));

  const demo = (await readDemoRequests())
    .filter(
      (request) =>
        request.organization_id === organizationId &&
        services.includes(request.need),
    )
    .map((request) => ({
      id: request.id,
      name: request.participant_name,
      initials: initialsFromName(request.participant_name),
      need: request.need,
      note:
        request.note?.trim() ||
        `Asked for ${serviceLabels[request.need].toLowerCase()}.`,
      waited: formatWaited(request.created_at),
      status: request.status,
      created_at: request.created_at,
    }));

  return [...demo, ...fromDb]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ created_at: _createdAt, ...request }) => request);
}

export async function listParticipantConnections(participantId: string) {
  if (isDemoUserId(participantId) || participantId === DEMO_PARTICIPANT_ID) {
    const demo = await readDemoRequests();
    return demo
      .filter((request) => request.participant_id === DEMO_PARTICIPANT_ID)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((request) => ({
        id: request.id,
        organizationId: request.organization_id,
        organization: request.organization_name,
        need: request.need,
        status: request.status,
        detail:
          request.status === "accepted"
            ? "They are ready to help. Check in when you can."
            : request.status === "waitlisted"
              ? "You are on their waitlist."
              : request.status === "declined"
                ? "They could not take this request."
                : "They usually reply within a day.",
      }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("help_requests")
    .select("id, need, status, created_at, organization_id, organizations(name)")
    .eq("participant_id", participantId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((request) => {
    const organization = Array.isArray(request.organizations)
      ? request.organizations[0]
      : request.organizations;

    return {
      id: request.id,
      organizationId: request.organization_id,
      organization: organization?.name ?? "Organization",
      need: request.need,
      status: request.status,
      detail:
        request.status === "accepted"
          ? "They are ready to help. Check in when you can."
          : request.status === "waitlisted"
            ? "You are on their waitlist."
            : request.status === "declined"
              ? "They could not take this request."
              : "They usually reply within a day.",
    };
  });
}

export async function countPendingRequests(organizationId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("help_requests")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  const demoPending = (await readDemoRequests()).filter(
    (request) =>
      request.organization_id === organizationId &&
      request.status === "pending",
  ).length;

  return (count ?? 0) + demoPending;
}
