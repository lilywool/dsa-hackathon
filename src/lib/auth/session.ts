import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/database.types";

export const ORG_VERIFIED_COOKIE = "haven-org-verified";
export const REVIEW_COOKIE = "haven-review";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (typeof userId !== "string") {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return profile;
}

export async function requireParticipant() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/participant/sign-in");
  }

  if (profile.role === "organization") {
    redirect("/organization");
  }

  if (profile.role === "pending_organization") {
    redirect("/organization/status");
  }

  return profile;
}

export async function requireOrganization() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/organization/sign-in");
  }

  if (profile.role === "participant") {
    redirect("/participant");
  }

  if (profile.role !== "organization" || !profile.org_id) {
    redirect("/organization/status");
  }

  return profile;
}

export async function getReviewPassword() {
  const cookieStore = await cookies();
  return cookieStore.get(REVIEW_COOKIE)?.value ?? null;
}
