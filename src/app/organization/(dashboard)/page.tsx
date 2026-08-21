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
import { NeedBadge } from "@/components/status-badges";
import { requireOrganization } from "@/lib/auth/session";
import {
  countPendingRequests,
  getOwnedOrganization,
  listIncomingRequests,
} from "@/lib/help/queries";
import { serviceShortLabels } from "@/lib/services";

export default async function OrganizationOverviewPage() {
  const profile = await requireOrganization();
  const organization = await getOwnedOrganization(profile);
  const services = organization?.services ?? [];
  const requests = organization?.id
    ? await listIncomingRequests(organization.id, services)
    : [];
  const waiting = requests.filter((request) => request.status === "pending");
  const pendingCount = organization?.id
    ? await countPendingRequests(organization.id)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          {organization?.location}
        </p>
        <h1 className="font-heading mt-1 text-3xl tracking-tight">
          {organization?.name ?? profile.display_name}
        </h1>
        {organization?.notes ? (
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {organization.notes}
          </p>
        ) : null}
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Services listed
          {services.length > 0
            ? `: ${services.map((service) => serviceShortLabels[service]).join(", ")}`
            : ""}
          .
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Waiting to connect</CardDescription>
            <CardTitle className="font-heading text-3xl">
              {pendingCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Matched requests from participants
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Services offered</CardDescription>
            <CardTitle className="font-heading text-3xl">
              {services.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {services.map((service) => (
                <NeedBadge key={service} need={service} />
              ))}
            </div>
          </CardContent>
        </Card>
        {organization?.phone ? (
          <Card size="sm">
            <CardHeader>
              <CardDescription>Contact</CardDescription>
              <CardTitle className="font-heading text-2xl">
                {organization.phone}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {organization.website ? (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  Visit website
                </a>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </section>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Downtown need forecast</CardTitle>
          <CardDescription>
            Seasonal outlook across six neighborhoods — use it to plan beds and
            outreach before peaks.
          </CardDescription>
          <Button variant="outline" size="sm" className="mt-3 w-fit" asChild>
            <Link href="/organization/insights">
              Open need &amp; capacity insights
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>People waiting to connect</CardTitle>
          <CardDescription>
            Participant requests that match your listed services.
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
                <NeedBadge need={request.need} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
