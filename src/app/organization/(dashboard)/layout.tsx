import type { ReactNode } from "react";

import { OrgShell } from "@/components/organization/org-shell";
import { demoOrganization, isDemoProfile } from "@/lib/auth/demo";
import { requireOrganization } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireOrganization();

  if (isDemoProfile(profile)) {
    const organization = demoOrganization();
    return (
      <OrgShell
        organizationName={organization.name}
        location={organization.location}
      >
        {children}
      </OrgShell>
    );
  }

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("name, location")
    .eq("owner_id", profile.id)
    .maybeSingle();

  return (
    <OrgShell
      organizationName={organization?.name ?? profile.display_name ?? "Organization"}
      location={organization?.location ?? null}
    >
      {children}
    </OrgShell>
  );
}
