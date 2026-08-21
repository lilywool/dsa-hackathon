"use server";

import { revalidatePath } from "next/cache";

import { isDemoProfile } from "@/lib/auth/demo";
import { getProfile } from "@/lib/auth/session";
import { isServiceKind } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { RequestStatus } from "@/lib/supabase/database.types";

export type HelpState = { error: string | null; asked: boolean };

const STATUSES: RequestStatus[] = [
  "pending",
  "accepted",
  "waitlisted",
  "declined",
];

export async function askForHelp(
  _prev: HelpState,
  formData: FormData,
): Promise<HelpState> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const needValue = String(formData.get("need") ?? "");

  if (!organizationId || !isServiceKind(needValue)) {
    return { error: "Choose a kind of help first.", asked: false };
  }

  const profile = await getProfile();
  if (!profile || isDemoProfile(profile) || profile.role !== "participant") {
    return { error: "Sign in as a participant to ask for help.", asked: false };
  }

  const supabase = await createClient();
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, services")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    return { error: "That organization could not be found.", asked: false };
  }

  if (!organization.services.includes(needValue)) {
    return {
      error: "That organization does not provide this kind of help.",
      asked: false,
    };
  }

  const { error } = await supabase.from("help_requests").insert({
    organization_id: organizationId,
    participant_id: profile.id,
    participant_name: profile.display_name?.trim() || "Participant",
    need: needValue,
  });

  if (error && error.code !== "23505") {
    return { error: error.message, asked: false };
  }

  revalidatePath("/participant/find");
  revalidatePath("/participant/connections");
  revalidatePath("/organization/requests");
  revalidatePath("/organization");

  return { error: null, asked: true };
}

export async function updateHelpRequestStatus(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const statusValue = String(formData.get("status") ?? "");
  const status = STATUSES.includes(statusValue as RequestStatus)
    ? (statusValue as RequestStatus)
    : null;

  if (!requestId || !status || status === "pending") {
    return;
  }

  const profile = await getProfile();
  if (!profile || isDemoProfile(profile) || profile.role !== "organization") {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("help_requests")
    .update({ status })
    .eq("id", requestId);

  revalidatePath("/organization/requests");
  revalidatePath("/organization");
  revalidatePath("/participant/connections");
}
