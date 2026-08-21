import Link from "next/link";

import { AskForHelpButton } from "@/components/participant/ask-for-help-button";
import { ServiceFinder } from "@/components/participant/service-finder";
import { NeedBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { requireParticipant } from "@/lib/auth/session";
import {
  listDirectoryOrganizations,
  listOpenAskKeys,
  toHelpOrganization,
} from "@/lib/help/queries";
import {
  isServiceKind,
  serviceShortLabels,
  type ServiceKind,
} from "@/lib/services";
import { cn } from "@/lib/utils";

const filters: { id: ServiceKind | "all"; label: string }[] = [
  { id: "all", label: "All help" },
  { id: "shelter", label: serviceShortLabels.shelter },
  { id: "food", label: serviceShortLabels.food },
  { id: "healthcare", label: serviceShortLabels.healthcare },
  { id: "employment", label: serviceShortLabels.employment },
  { id: "clothing", label: serviceShortLabels.clothing },
  { id: "other", label: serviceShortLabels.other },
];

export const metadata = {
  title: "Find help",
};

export default async function FindHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const profile = await requireParticipant();
  const params = await searchParams;
  const selected = isServiceKind(params.need) ? params.need : undefined;
  const persist = true;
  const [directory, askedKeys] = await Promise.all([
    listDirectoryOrganizations(selected),
    listOpenAskKeys(profile.id),
  ]);
  const organizations = directory.map(toHelpOrganization);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Find help</h1>
        <p className="mt-2 text-muted-foreground">
          Filter downtown service sites by what you need and wheelchair-accessible
          transit — then ask an organization below.
        </p>
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          {filters.map((filter) => {
            const href =
              filter.id === "all"
                ? "/participant/find"
                : `/participant/find?need=${filter.id}`;
            const active =
              filter.id === "all" ? !selected : selected === filter.id;
            return (
              <Link
                key={filter.id}
                href={href}
                className={cn(
                  "inline-flex h-11 items-center rounded-full px-4 text-sm font-medium ring-1",
                  active
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-foreground ring-foreground/10",
                )}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl">Service map</h2>
        <ServiceFinder need={selected} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl">Ask an organization</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Directory partners you can message through Haven.
          </p>
        </div>
        {organizations.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-muted-foreground ring-1 ring-foreground/10">
            No organizations nearby offer that yet. Try another kind of help.
          </p>
        ) : (
          <ul className="space-y-4">
            {organizations.map((org) => (
              <li
                key={org.id}
                className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-medium">{org.name}</h3>
                      <Badge variant="secondary">{org.openLabel}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {org.neighborhood}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed">{org.highlight}</p>
                    {org.website ? (
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
                      >
                        Visit website
                      </a>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {org.services.map((service) => (
                        <NeedBadge key={service} need={service} />
                      ))}
                    </div>
                  </div>
                  <AskForHelpButton
                    organizationId={org.id}
                    organizationName={org.name}
                    need={selected}
                    persist={persist}
                    alreadyAsked={
                      selected
                        ? askedKeys.has(`${org.id}:${selected}`)
                        : false
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
