import { cache } from "react";

import { DEMO_ORG_CODE, isDemoOrganizationId } from "@/lib/auth/demo";
import {
  formatWaited,
  initialsFromName,
  serviceLabels,
  servicesSummary,
} from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ServiceKind } from "@/lib/supabase/database.types";
import type { IncomingRequest, HelpOrganization } from "@/lib/placeholder";

export type OwnedOrganization = {
  id: string | null;
  name: string;
  location: string;
  services: ServiceKind[];
};

export type DirectoryOrganization = {
  id: string;
  name: string;
  location: string;
  services: ServiceKind[];
};

export async function getOwnedOrganization(
  profile: Profile,
): Promise<OwnedOrganization | null> {
  return loadOwnedOrganization(profile.id);
}

const loadOwnedOrganization = cache(
  async (profileId: string): Promise<OwnedOrganization | null> => {
    if (isDemoOrganizationId(profileId)) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("organizations")
        .select("id, name, location, services")
        .eq("org_id", DEMO_ORG_CODE)
        .maybeSingle();

      if (data) {
        return data;
      }
    }

    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("id, name, location, services")
      .eq("owner_id", profileId)
      .maybeSingle();

    return data;
  },
);

export async function listDirectoryOrganizations(need?: ServiceKind) {
  const supabase = await createClient();
  let query = supabase
    .from("organizations")
    .select("id, name, location, services")
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
    walkTime: "",
    services: organization.services,
    highlight: servicesSummary(organization.services),
    openLabel: "Nearby",
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

  return (data ?? []).map((request) => ({
    id: request.id,
    name: request.participant_name,
    initials: initialsFromName(request.participant_name),
    need: request.need,
    note:
      request.note?.trim() ||
      `Asked for ${serviceLabels[request.need].toLowerCase()}.`,
    waited: formatWaited(request.created_at),
    status: request.status,
  }));
}

export async function listParticipantConnections(participantId: string) {
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

export async function listOpenAskKeys(participantId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("help_requests")
    .select("organization_id, need")
    .eq("participant_id", participantId)
    .in("status", ["pending", "accepted", "waitlisted"]);

  return new Set(
    (data ?? []).map((request) => `${request.organization_id}:${request.need}`),
  );
}
