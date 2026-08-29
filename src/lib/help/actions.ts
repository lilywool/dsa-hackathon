"use server";

import { revalidatePath } from "next/cache";

import { isDemoProfile } from "@/lib/auth/demo";
import { getProfile } from "@/lib/auth/session";
import {
  addDemoHelpRequest,
  isDemoRequestId,
  updateDemoHelpRequestStatus,
} from "@/lib/help/demo-store";
import { isFallbackOrganization } from "@/lib/help/queries";
import { isServiceKind } from "@/lib/services";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { RequestStatus } from "@/lib/supabase/database.types";

export type HelpState = { error: string | null; asked: boolean };

const STATUSES: RequestStatus[] = [
  "pending",
  "accepted",
  "waitlisted",
  "declined",
];

function revalidateHelpPaths() {
  revalidatePath("/participant/find");
  revalidatePath("/participant/connections");
  revalidatePath("/organization/requests");
  revalidatePath("/organization");
}

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
  if (!profile || profile.role !== "participant") {
    return { error: "Sign in as a participant to ask for help.", asked: false };
  }

  // Check for fallback organization first (for demo)
  const fallbackOrg = isFallbackOrganization(organizationId);
  const organization = fallbackOrg || { id: organizationId, name: "", services: [] as any[] };

  if (!fallbackOrg && isSupabaseConfigured()) {
    // Only query Supabase if not a fallback org
    const supabase = await createClient();
    const { data: dbOrg, error: organizationError } = await supabase
      .from("organizations")
      .select("id, name, services")
      .eq("id", organizationId)
      .maybeSingle();

    if (organizationError || !dbOrg) {
      return { error: "That organization could not be found.", asked: false };
    }

    Object.assign(organization, dbOrg);
  } else if (!fallbackOrg) {
    return { error: "That organization could not be found.", asked: false };
  }

  if (!organization.services.includes(needValue)) {
    return {
      error: "That organization does not provide this kind of help.",
      asked: false,
    };
  }

  if (isDemoProfile(profile)) {
    await addDemoHelpRequest({
      organizationId: organization.id,
      organizationName: organization.name,
      need: needValue,
      participantName: profile.display_name ?? undefined,
    });

    revalidateHelpPaths();
    return { error: null, asked: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("help_requests").insert({
    organization_id: organizationId,
    participant_id: profile.id,
    participant_name: profile.display_name?.trim() || "Participant",
    need: needValue,
  });

  if (error) {
    return { error: error.message, asked: false };
  }

  revalidateHelpPaths();
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
  if (!profile || profile.role !== "organization") {
    return;
  }

  if (isDemoProfile(profile) || isDemoRequestId(requestId)) {
    if (!isDemoProfile(profile)) {
      return;
    }
    await updateDemoHelpRequestStatus(requestId, status);
    revalidateHelpPaths();
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("help_requests")
    .update({ status })
    .eq("id", requestId);

  revalidateHelpPaths();
}
