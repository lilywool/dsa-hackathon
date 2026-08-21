import { OrgInsightsPanel } from "@/components/organization/org-insights-panel";
import { requireOrganization } from "@/lib/auth/session";

export const metadata = {
  title: "Need & capacity insights",
};

export default async function OrganizationInsightsPage() {
  await requireOrganization();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          Need & capacity insights
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Seasonal forecasts for downtown neighborhoods and a clear view of which
          capacity numbers are published versus modeled — so allocation stays
          honest and effective.
        </p>
      </div>
      <OrgInsightsPanel />
    </div>
  );
}
