import type { ReactNode } from "react";

import { requireParticipant } from "@/lib/auth/session";
import { ParticipantShell } from "@/components/participant/participant-shell";

export default async function ParticipantDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireParticipant();

  return (
    <ParticipantShell firstName={profile.display_name ?? "there"}>
      {children}
    </ParticipantShell>
  );
}
