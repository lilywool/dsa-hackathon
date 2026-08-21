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
import { incomingRequests, orgStats, programs } from "@/lib/placeholder";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationOverviewPage() {
  const profile = await requireOrganization();
  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("name, location")
    .eq("owner_id", profile.id)
    .maybeSingle();

  const waiting = incomingRequests.filter(
    (request) => request.status === "pending",
  );
  const tightPrograms = programs.filter(
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
          A snapshot of who is waiting, what you can offer tonight, and who is
          already connected to your programs.
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
              These requests are placeholders so you can see how staff will
              respond later.
            </CardDescription>
            <Button variant="outline" size="sm" className="mt-3 w-fit" asChild>
              <Link href="/organization/requests">
                View all requests
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y px-0">
            {waiting.slice(0, 3).map((request) => (
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
                  <UrgencyBadge urgency={request.urgency} />
                </div>
              </div>
            ))}
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
            {tightPrograms.map((program) => (
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
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/organization/programs">Review all programs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
