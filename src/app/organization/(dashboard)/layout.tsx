import type { ReactNode } from "react";

import { OrgShell } from "@/components/organization/org-shell";
import { requireOrganization } from "@/lib/auth/session";
import { getOwnedOrganization } from "@/lib/help/queries";

export default async function OrganizationDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireOrganization();
  const organization = await getOwnedOrganization(profile);

  return (
    <OrgShell
      organizationName={organization?.name ?? profile.display_name ?? "Organization"}
      location={organization?.location ?? null}
    >
      {children}
    </OrgShell>
  );
}
