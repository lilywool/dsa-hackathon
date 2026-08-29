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
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
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

const FALLBACK_DIRECTORY_ORGANIZATIONS: DirectoryOrganization[] = [
  {
    id: "SD-FATHER-JOES-VILLAGES",
    name: "Father Joe's Villages",
    location: "3350 E St, San Diego, CA 92102",
    services: ["shelter", "food", "healthcare", "employment", "clothing", "other"],
    website: "https://my.neighbor.org/",
    phone: "800-466-3537",
    notes: "Large homelessness-services provider. Shelter/housing navigation, meals, Village Health Center, employment services, showers/mail/storage and other basic-needs services.",
  },
  {
    id: "SD-ALPHA-PROJECT-FOR-THE-HOMELESS",
    name: "Alpha Project for the Homeless",
    location: "3737 Fifth Ave, Suite 203, San Diego, CA 92103",
    services: ["shelter", "food", "employment", "clothing", "other"],
    website: "https://alphaproject.org/",
    phone: "619-542-1877",
    notes: "Emergency/bridge and family shelters, food support, transitional employment through Take Back the Streets, supportive services and clothing support.",
  },
  {
    id: "SD-SAN-DIEGO-RESCUE-MISSION",
    name: "San Diego Rescue Mission",
    location: "120 Elm St, San Diego, CA 92101",
    services: ["shelter", "food", "healthcare", "employment", "clothing", "other"],
    website: "https://www.sdrescue.org/",
    phone: "619-687-3720",
    notes: "Emergency shelter, residential recovery, meals, clothing/necessities, wellness/medical-dental connections, education and employment/housing support.",
  },
  {
    id: "SD-THIRD-AVENUE-CHARITABLE-ORGANIZATION-TACO",
    name: "Third Avenue Charitable Organization (TACO)",
    location: "1420 Third Ave, San Diego, CA 92101",
    services: ["food", "healthcare", "clothing", "other"],
    website: "https://www.tacosd.org/",
    phone: "619-235-9445",
    notes: "Serves people experiencing homelessness and poverty with warm meals, clothing, device charging, mail services, help recovering ID documents, and a free medical/pharmacy clinic.",
  },
  {
    id: "SD-YOUTH-ASSISTANCE-COALITION",
    name: "Youth Assistance Coalition",
    location: "2801 B St #238, San Diego, CA 92102",
    services: ["shelter", "food", "healthcare", "employment", "clothing", "other"],
    website: "https://www.yacsd.org/",
    phone: "619-458-6588",
    notes: "Focused on youth experiencing homelessness. Provides or connects youth to meals, clothing/bedding, housing/shelter, health, counseling, job training, education.",
  },
  {
    id: "SD-INTERFAITH-COMMUNITY-SERVICES",
    name: "Interfaith Community Services",
    location: "550 W Washington Ave, Escondido, CA 92025",
    services: ["shelter", "food", "healthcare", "employment", "other"],
    website: "https://www.interfaithservices.org/",
    phone: "760-489-6380",
    notes: "North County provider offering shelter/housing, emergency food/basic needs, employment/economic development, behavioral health/substance-use services.",
  },
  {
    id: "SD-COMMUNITY-CHRISTIAN-SERVICE-AGENCY-CCSA",
    name: "Community Christian Service Agency (CCSA)",
    location: "4167 Rappahannock Ave, San Diego, CA 92117",
    services: ["shelter", "food", "healthcare", "clothing", "other"],
    website: "https://www.ccsasandiego.org/",
    phone: "858-274-2271",
    notes: "Emergency food and clothing, temporary housing/emergency shelter referrals, transportation help, ID/birth certificate assistance, resource counseling.",
  },
  {
    id: "SD-NEW-DAY-URBAN-MINISTRIES",
    name: "New Day Urban Ministries",
    location: "2459 Market St, San Diego, CA 92102",
    services: ["food", "clothing", "other"],
    website: "https://newdayurbanministries.org/",
    phone: "619-232-2753",
    notes: "Basic-needs support for people experiencing homelessness and poverty, including groceries/food, clothing, hygiene kits, casework and resource support.",
  },
  {
    id: "SD-SHARIAS-CLOSET",
    name: "Sharia's Closet",
    location: "6244 El Cajon Blvd, Suite 5, San Diego, CA 92115",
    services: ["clothing", "other"],
    website: "https://shariascloset.org/",
    phone: "619-808-4979",
    notes: "Free emergency clothing and hygiene items for individuals and families in crisis. Personalized Bags of Hope.",
  },
  {
    id: "SD-FEEDING-SAN-DIEGO",
    name: "Feeding San Diego",
    location: "9477 Waples St, Suite 100, San Diego, CA 92121",
    services: ["food", "other"],
    website: "https://feedingsandiego.org/",
    phone: "858-452-3663",
    notes: "Countywide hunger-relief and food-rescue nonprofit. Offers free food distributions, an on-site Marketplace, partner food sites, and CalFresh application assistance.",
  },
  {
    id: "SD-JACOBS-CUSHMAN-SAN-DIEGO-FOOD-BANK",
    name: "Jacobs & Cushman San Diego Food Bank",
    location: "9850 Distribution Ave, San Diego, CA 92121",
    services: ["food", "other"],
    website: "https://www.sandiegofoodbank.org/",
    phone: "858-527-1419",
    notes: "Major countywide food bank. Connects individuals to partner distributions and supports CalFresh outreach.",
  },
  {
    id: "SD-SAN-DIEGO-HUNGER-COALITION",
    name: "San Diego Hunger Coalition",
    location: "845 15th St, Suite 103, San Diego, CA 92101",
    services: ["food", "other"],
    website: "https://www.sdhunger.org/",
    phone: "619-501-7917",
    notes: "Food-access organization focused on connecting people and systems to food assistance through research, education, advocacy and resource navigation.",
  },
  {
    id: "SD-FAMILY-HEALTH-CENTERS-OF-SAN-DIEGO",
    name: "Family Health Centers of San Diego",
    location: "Multiple San Diego County locations",
    services: ["food", "healthcare", "employment", "other"],
    website: "https://www.fhcsd.org/",
    phone: "619-515-2300",
    notes: "Community health network serving people experiencing homelessness; medical, dental, behavioral health, benefits enrollment and case-management/referral services.",
  },
  {
    id: "SD-SAN-YSIDRO-HEALTH",
    name: "San Ysidro Health",
    location: "Multiple San Diego County locations",
    services: ["healthcare", "other"],
    website: "https://www.syhealth.org/",
    phone: "619-662-4100",
    notes: "Community health provider offering accessible primary and specialty care, dental, pharmacy and other services.",
  },
  {
    id: "SD-SAN-DIEGO-AMERICAN-INDIAN-HEALTH-CENTER",
    name: "San Diego American Indian Health Center",
    location: "2630 First Ave, San Diego, CA 92103",
    services: ["healthcare", "other"],
    website: "https://www.sdaihc.org/",
    phone: "619-234-2158",
    notes: "Community health center providing medical, dental, behavioral health and wellness services for all people; IHS-funded and FQHC.",
  },
  {
    id: "SD-SAN-DIEGO-WORKFORCE-PARTNERSHIP",
    name: "San Diego Workforce Partnership",
    location: "Career centers throughout San Diego County",
    services: ["employment", "other"],
    website: "https://workforce.org/",
    phone: "619-319-9675",
    notes: "Free job-search, career-development, training, apprenticeship and employment programs for San Diego County job seekers.",
  },
  {
    id: "SD-THE-HUB---HOMELESSNESS-RESPONSE-CENTER",
    name: "The Hub - Homelessness Response Center",
    location: "San Diego, CA",
    services: ["shelter", "food", "healthcare", "employment", "clothing", "other"],
    website: "https://www.sandiego.gov/homelessness-strategies-and-solutions/services/homelessness-response-center",
    phone: "211",
    notes: "System-navigation hub connecting unhoused individuals and families to housing/shelter, employment readiness, basic-needs assistance, case management and community resources.",
  },
  {
    id: "SD-2-1-1-SAN-DIEGO",
    name: "2-1-1 San Diego",
    location: "San Diego County, CA",
    services: ["shelter", "food", "healthcare", "employment", "clothing", "other"],
    website: "https://211sandiego.org/",
    phone: "211",
    notes: "Countywide information and referral system. Useful as a fallback/router for shelter, food, health, employment, clothing and other social services.",
  },
];

export async function getOwnedOrganization(
  profile: Profile,
): Promise<OwnedOrganization | null> {
  return loadOwnedOrganization(profile.id);
}

const loadOwnedOrganization = cache(
  async (profileId: string): Promise<OwnedOrganization | null> => {
    if (!isSupabaseConfigured()) {
      return null;
    }

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
  if (!isSupabaseConfigured()) {
    return need
      ? FALLBACK_DIRECTORY_ORGANIZATIONS.filter((org) => org.services.includes(need))
      : FALLBACK_DIRECTORY_ORGANIZATIONS;
  }

  const supabase = await createClient();
  let query = supabase
    .from("organizations")
    .select("id, name, location, services, website, phone, notes")
    .order("name");

  if (need) {
    query = query.contains("services", [need]);
  }

  const { data } = await query;
  if (!data || data.length === 0) {
    const fallback = need
      ? FALLBACK_DIRECTORY_ORGANIZATIONS.filter((org) =>
          org.services.includes(need),
        )
      : FALLBACK_DIRECTORY_ORGANIZATIONS;
    return fallback;
  }
  return data as DirectoryOrganization[];
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

export function isFallbackOrganization(organizationId: string): DirectoryOrganization | null {
  return FALLBACK_DIRECTORY_ORGANIZATIONS.find((org) => org.id === organizationId) ?? null;
}

export async function listIncomingRequests(
  organizationId: string,
  services: ServiceKind[],
): Promise<IncomingRequest[]> {
  if (services.length === 0) {
    return [];
  }

  const data = isSupabaseConfigured()
    ? (
        await (await createClient())
          .from("help_requests")
          .select("id, participant_name, need, note, status, created_at")
          .eq("organization_id", organizationId)
          .in("need", services)
          .order("created_at", { ascending: false })
      ).data
    : null;

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

  const demo = (await readDemoRequests("organization"))
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

  if (!isSupabaseConfigured()) {
    return [];
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
  const count = isSupabaseConfigured()
    ? (
        await (await createClient())
          .from("help_requests")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "pending")
      ).count
    : null;

  const demoPending = (await readDemoRequests("organization")).filter(
    (request) =>
      request.organization_id === organizationId &&
      request.status === "pending",
  ).length;

  return (count ?? 0) + demoPending;
}
