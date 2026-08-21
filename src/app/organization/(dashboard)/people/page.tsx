import { requireOrganization } from "@/lib/auth/session";
import { getOwnedOrganization, listIncomingRequests } from "@/lib/help/queries";
import { NeedBadge, StatusBadge } from "@/components/status-badges";

export const metadata = {
  title: "People connected",
};

export default async function OrganizationPeoplePage() {
  const profile = await requireOrganization();
  const organization = await getOwnedOrganization(profile);
  const services = organization?.services ?? [];
  const connections =
    organization?.id && services.length > 0
      ? (await listIncomingRequests(organization.id, services)).filter(
          (request) => request.status === "accepted",
        )
      : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          People connected
        </h1>
        <p className="mt-2 text-muted-foreground">
          Participants you have accepted from incoming requests.
        </p>
      </div>
      {connections.length === 0 ? (
        <p className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No one is connected yet. Accept a request from incoming requests.
        </p>
      ) : (
        <ul className="space-y-3">
          {connections.map((connection) => (
            <li
              key={connection.id}
              className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-medium">{connection.name}</h2>
                <NeedBadge need={connection.need} />
                <StatusBadge status={connection.status} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {connection.note}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
