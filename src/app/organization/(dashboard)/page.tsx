import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NeedBadge, UrgencyBadge } from "@/components/status-badges";
import { requireOrganization } from "@/lib/auth/session";
import { getOwnedOrganization, listIncomingRequests } from "@/lib/help/queries";
import { serviceShortLabels } from "@/lib/services";
import { orgStats, programs } from "@/lib/placeholder";

export default async function OrganizationOverviewPage() {
  const profile = await requireOrganization();
  const organization = await getOwnedOrganization(profile);
  const services = organization?.services ?? [];
  const requests = organization?.id
    ? await listIncomingRequests(organization.id, services)
    : [];
  const waiting = requests.filter((request) => request.status === "pending");
  const offeredPrograms = programs.filter((program) =>
    services.includes(program.category),
  );
  const tightPrograms = offeredPrograms.filter(
    (program) => program.open / program.capacity <= 0.25,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          {organization?.location}
        </p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight">
          {organization?.name ?? profile.display_name}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Requests here are only for the services you provide
          {services.length > 0
            ? `: ${services.map((service) => serviceShortLabels[service]).join(", ")}`
            : ""}
          .
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orgStats.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="font-heading text-3xl">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>People waiting to connect</CardTitle>
            <CardDescription>
              Matched to the help you offer. Connect from incoming requests.
            </CardDescription>
            <Button variant="outline" size="sm" className="mt-3 w-fit" asChild>
              <Link href="/organization/requests">
                View all requests
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y px-0">
            {waiting.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No matched requests right now.
              </p>
            ) : (
              waiting.slice(0, 3).map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {request.note}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <NeedBadge need={request.need} />
                    {request.urgency ? (
                      <UrgencyBadge urgency={request.urgency} />
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Capacity to watch</CardTitle>
            <CardDescription>
              Programs with the fewest remaining spots.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tightPrograms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No listed programs for your services yet.
              </p>
            ) : (
              tightPrograms.map((program) => (
                <div key={program.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{program.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {program.open} open
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.round((program.open / program.capacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/organization/programs">Review all programs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
