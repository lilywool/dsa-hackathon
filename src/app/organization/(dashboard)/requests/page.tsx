import { RequestsPanel } from "@/components/organization/requests-panel";
import { requireOrganization } from "@/lib/auth/session";
import { getOwnedOrganization, listIncomingRequests } from "@/lib/help/queries";
import { serviceShortLabels } from "@/lib/services";

export const metadata = {
  title: "Incoming requests",
};

export default async function OrganizationRequestsPage() {
  const profile = await requireOrganization();
  const organization = await getOwnedOrganization(profile);
  const services = organization?.services ?? [];
  const persist = Boolean(organization?.id);
  const requests = organization?.id
    ? await listIncomingRequests(organization.id, services)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          Incoming requests
        </h1>
        <p className="mt-2 text-muted-foreground">
          People asking for help that matches what you provide
          {services.length > 0
            ? ` — ${services.map((service) => serviceShortLabels[service]).join(", ")}`
            : ""}
          .
        </p>
      </div>
      <RequestsPanel requests={requests} persist={persist} />
    </div>
  );
}
