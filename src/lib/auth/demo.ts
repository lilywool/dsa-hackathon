import type { Profile } from "@/lib/supabase/database.types";
import { currentOrganization, currentParticipant } from "@/lib/placeholder";

export const DEMO_COOKIE = "haven-demo-role";

export type DemoRole = "participant" | "organization";

const demoAccounts = {
  participant: {
    email: "participant@haven.dev",
    password: "haven-dev",
  },
  organization: {
    email: "org@haven.dev",
    password: "haven-dev",
  },
} as const;

const DEMO_PARTICIPANT_ID = "00000000-0000-4000-a000-000000000001";
const DEMO_ORGANIZATION_ID = "00000000-0000-4000-a000-000000000002";
export const DEMO_ORG_CODE = "DEV-ORG";

export function matchDemoAccount(
  email: string,
  password: string,
): DemoRole | null {
  const normalized = email.trim().toLowerCase();

  if (
    normalized === demoAccounts.participant.email &&
    password === demoAccounts.participant.password
  ) {
    return "participant";
  }

  if (
    normalized === demoAccounts.organization.email &&
    password === demoAccounts.organization.password
  ) {
    return "organization";
  }

  return null;
}

export function demoProfile(role: DemoRole): Profile {
  if (role === "participant") {
    return {
      id: DEMO_PARTICIPANT_ID,
      display_name: currentParticipant.firstName,
      org_id: null,
      role: "participant",
      created_at: "2026-01-01T00:00:00.000Z",
    };
  }

  return {
    id: DEMO_ORGANIZATION_ID,
    display_name: currentOrganization.name,
    org_id: "DEV-ORG",
    role: "organization",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

export function isDemoProfile(profile: Profile) {
  return isDemoUserId(profile.id);
}

export function isDemoUserId(id: string) {
  return id === DEMO_PARTICIPANT_ID || id === DEMO_ORGANIZATION_ID;
}

export function isDemoOrganizationId(id: string) {
  return id === DEMO_ORGANIZATION_ID;
}

export function demoOrganization() {
  return {
    name: currentOrganization.name,
    location: currentOrganization.neighborhood,
    services: currentOrganization.services,
  };
}
