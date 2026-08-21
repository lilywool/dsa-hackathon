import { OrgInsightsPanel } from "@/components/organization/org-insights-panel";
import { requireOrganization } from "@/lib/auth/session";
import { getOwnedOrganization } from "@/lib/help/queries";

export const metadata = {
  title: "Need & capacity insights",
};

export default async function OrganizationInsightsPage() {
  const profile = await requireOrganization();
  const organization = await getOwnedOrganization(profile);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          Need & capacity insights
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Seasonal forecasts for downtown neighborhoods, published capacity by
          service, and which peer organizations still have bed or meal vacancies
          when you need to refer a participant.
        </p>
      </div>
      <OrgInsightsPanel
        organizationName={organization?.name}
        primaryServices={organization?.services ?? []}
      />
    </div>
  );
}
