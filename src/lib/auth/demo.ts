import type { Profile } from "@/lib/supabase/database.types";
import { currentParticipant } from "@/lib/placeholder";

export const DEMO_COOKIE = "haven-demo-role";
export const DEMO_ORG_CODE = "SD-JACOBS-CUSHMAN-SAN-DIEGO-FOOD-BANK";
export const DEMO_ORG_DISPLAY_NAME = "Jacobs & Cushman San Diego Food Bank";

export type DemoRole = "participant" | "organization";

const demoAccounts = {
  participant: {
    email: "lwool@sandiego.edu",
    password: "haven-dev",
  },
  organization: {
    email: "lwool@sandiego.edu",
    password: "haven-dev",
  },
} as const;

const DEMO_PARTICIPANT_ID = "00000000-0000-4000-a000-000000000001";
const DEMO_ORGANIZATION_ID = "00000000-0000-4000-a000-000000000002";

export { DEMO_PARTICIPANT_ID, DEMO_ORGANIZATION_ID };

export function matchDemoAccount(
  email: string,
  password: string,
  preferredRole?: DemoRole,
): DemoRole | null {
  const normalized = email.trim().toLowerCase();

  if (
    preferredRole &&
    normalized === demoAccounts[preferredRole].email &&
    password === demoAccounts[preferredRole].password
  ) {
    return preferredRole;
  }

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
    display_name: DEMO_ORG_DISPLAY_NAME,
    org_id: DEMO_ORG_CODE,
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
