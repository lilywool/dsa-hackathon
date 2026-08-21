import { cookies } from "next/headers";
import { randomUUID } from "crypto";

import {
  DEMO_PARTICIPANT_ID,
} from "@/lib/auth/demo";
import { currentParticipant } from "@/lib/placeholder";
import type { RequestStatus, ServiceKind } from "@/lib/supabase/database.types";

export const DEMO_REQUESTS_COOKIE = "haven-demo-requests-v2";
const LEGACY_DEMO_REQUESTS_COOKIE = "haven-demo-requests";

export type DemoHelpRequest = {
  id: string;
  organization_id: string;
  organization_name: string;
  participant_id: string;
  participant_name: string;
  need: ServiceKind;
  note: string | null;
  status: RequestStatus;
  created_at: string;
};

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export async function readDemoRequests(): Promise<DemoHelpRequest[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(DEMO_REQUESTS_COOKIE)?.value;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as DemoHelpRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Drop the pre-v2 demo request cookie (safe to call from Server Actions). */
export async function clearLegacyDemoRequestsCookie() {
  const cookieStore = await cookies();
  if (cookieStore.get(LEGACY_DEMO_REQUESTS_COOKIE)) {
    cookieStore.delete(LEGACY_DEMO_REQUESTS_COOKIE);
  }
}

async function writeDemoRequests(requests: DemoHelpRequest[]) {
  const cookieStore = await cookies();
  if (cookieStore.get(LEGACY_DEMO_REQUESTS_COOKIE)) {
    cookieStore.delete(LEGACY_DEMO_REQUESTS_COOKIE);
  }
  cookieStore.set(DEMO_REQUESTS_COOKIE, JSON.stringify(requests.slice(0, 50)), {
    ...cookieOptions(),
  });
}

export async function addDemoHelpRequest(input: {
  organizationId: string;
  organizationName: string;
  need: ServiceKind;
  participantName?: string;
}): Promise<{ ok: true; request: DemoHelpRequest }> {
  const existing = await readDemoRequests();

  const request: DemoHelpRequest = {
    id: `demo-${randomUUID()}`,
    organization_id: input.organizationId,
    organization_name: input.organizationName,
    participant_id: DEMO_PARTICIPANT_ID,
    participant_name:
      input.participantName?.trim() || currentParticipant.firstName,
    need: input.need,
    note: null,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  await writeDemoRequests([request, ...existing]);
  return { ok: true, request };
}

export async function updateDemoHelpRequestStatus(
  requestId: string,
  status: RequestStatus,
) {
  const existing = await readDemoRequests();
  const next = existing.map((request) =>
    request.id === requestId ? { ...request, status } : request,
  );
  await writeDemoRequests(next);
}

export function isDemoRequestId(id: string) {
  return id.startsWith("demo-");
}
