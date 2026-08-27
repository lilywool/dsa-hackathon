import type { Profile } from "@/lib/supabase/database.types";
import { currentParticipant } from "@/lib/placeholder";

export const DEMO_COOKIE = "haven-demo-role";
export const DEMO_EMAIL_COOKIE = "haven-demo-email";
export const DEMO_ORG_CODE = "SD-JACOBS-CUSHMAN-SAN-DIEGO-FOOD-BANK";
export const DEMO_ORG_DISPLAY_NAME = "Jacobs & Cushman San Diego Food Bank";

export type DemoRole = "participant" | "organization";

// Change these for a personalized demo experience.
// Each role accepts multiple emails, so several people can share one demo build.
const demoAccounts = {
  participant: {
    emails: ["lwool@sandiego.edu", "participant@haven.dev"],
    password: "haven-dev",
  },
  organization: {
    emails: ["lwool@sandiego.edu", "org@haven.dev"],
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

  const matches = (role: DemoRole) =>
    (demoAccounts[role].emails as readonly string[]).includes(normalized) &&
    password === demoAccounts[role].password;

  // An email registered under both roles resolves to whichever door was used.
  if (preferredRole && matches(preferredRole)) {
    return preferredRole;
  }

  if (matches("participant")) {
    return "participant";
  }

  if (matches("organization")) {
    return "organization";
  }

  return null;
}

export function demoProfile(role: DemoRole, email?: string): Profile {
  if (role === "participant") {
    return {
      id: DEMO_PARTICIPANT_ID,
      display_name:
        email === "participant@haven.dev" ? "Prisha" : currentParticipant.firstName,
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
