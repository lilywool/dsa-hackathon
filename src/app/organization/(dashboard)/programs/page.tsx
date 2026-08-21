import { NeedBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CapacityConfidence } from "@/lib/data/types";
import {
  capacityEnumToService,
  formatCapacityValue,
  loadOrgCapacityRows,
  matchCapacityRows,
} from "@/lib/data/org-capacity-match";
import { requireOrganization } from "@/lib/auth/session";
import { getOwnedOrganization } from "@/lib/help/queries";
import { serviceShortLabels } from "@/lib/services";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Services offered",
};

const confidenceStyles: Record<CapacityConfidence, string> = {
  HIGH: "bg-primary/15 text-primary ring-primary/25",
  MEDIUM:
    "bg-[oklch(0.92_0.05_85)] text-[oklch(0.38_0.06_70)] ring-[oklch(0.8_0.05_80)]",
  LOW: "bg-destructive/10 text-destructive ring-destructive/20",
  MODELED_FALLBACK: "bg-muted text-muted-foreground ring-foreground/10",
};

function confidenceLabel(level: CapacityConfidence) {
  return level === "MODELED_FALLBACK" ? "MODELED" : level;
}

export default async function OrganizationProgramsPage() {
  const profile = await requireOrganization();
  const organization = await getOwnedOrganization(profile);
  const services = organization?.services ?? [];
  const capacityRows = organization
    ? matchCapacityRows(await loadOrgCapacityRows(), {
        name: organization.name,
        org_id: organization.org_id,
      })
    : [];

  const capacityByService = new Map(
    capacityRows.map((row) => {
      const service = capacityEnumToService(row.category_enum);
      return [service ?? row.category_enum, row] as const;
    }),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">
          Services offered
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          What {organization?.name ?? profile.display_name} lists in the
          directory, with capacity figures matched from published data for this
          organization only.
        </p>
        {organization?.location ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {organization.location}
          </p>
        ) : null}
      </div>

      {services.length === 0 ? (
        <p className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No services are listed for this organization yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => {
            const capacity = capacityByService.get(service);
            return (
              <Card key={service}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle>{serviceShortLabels[service]}</CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <NeedBadge need={service} />
                      {capacity ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "ring-1",
                            confidenceStyles[capacity.capacity_confidence],
                          )}
                        >
                          {confidenceLabel(capacity.capacity_confidence)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <CardDescription>
                    Participants asking for{" "}
                    {serviceShortLabels[service].toLowerCase()} can reach out to
                    your organization.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {capacity ? (
                    <div className="space-y-1">
                      <p className="text-2xl font-heading tracking-tight">
                        {formatCapacityValue(capacity.capacity_value)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {capacity.capacity_unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {capacity.metric_interpretation}
                        {capacity.capacity_source.startsWith("http") ? (
                          <>
                            {" · "}
                            <a
                              href={capacity.capacity_source}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              Source
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No capacity figure is mapped for this service yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {organization?.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {organization.notes}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {organization.phone ? (
                <span className="text-muted-foreground">{organization.phone}</span>
              ) : null}
              {organization.website ? (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Website
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {capacityRows.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Showing {capacityRows.length} capacity row
          {capacityRows.length === 1 ? "" : "s"} matched to{" "}
          {organization?.name} from org capacity data
          {organization?.org_id ? ` (${organization.org_id})` : ""}.
        </p>
      ) : organization ? (
        <p className="text-xs text-muted-foreground">
          No rows in org capacity data matched {organization.name} yet.
        </p>
      ) : null}
    </div>
  );
}
