import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NeedBadge } from "@/components/status-badges";
import { requireOrganization } from "@/lib/auth/session";
import { getOwnedOrganization } from "@/lib/help/queries";
import { serviceShortLabels } from "@/lib/services";

export const metadata = {
  title: "Programs & capacity",
};

export default async function OrganizationProgramsPage() {
  const profile = await requireOrganization();
  const organization = await getOwnedOrganization(profile);
  const services = organization?.services ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          Services offered
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          From the San Diego resource directory for{" "}
          {organization?.name ?? profile.display_name}.
        </p>
      </div>
      {services.length === 0 ? (
        <p className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No services are listed for this organization yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card key={service}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{serviceShortLabels[service]}</CardTitle>
                  <NeedBadge need={service} />
                </div>
                <CardDescription>
                  Participants asking for {serviceShortLabels[service].toLowerCase()}{" "}
                  can reach out to your organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organization?.notes ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {organization.notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
