import Link from "next/link";

import { AskForHelpButton } from "@/components/participant/ask-for-help-button";
import { NeedBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  helpOrganizations,
  isNeedType,
  needShortLabels,
  type NeedType,
} from "@/lib/placeholder";

const filters: { id: NeedType | "all"; label: string }[] = [
  { id: "all", label: "All help" },
  { id: "shelter", label: needShortLabels.shelter },
  { id: "food", label: needShortLabels.food },
  { id: "healthcare", label: needShortLabels.healthcare },
  { id: "work", label: needShortLabels.work },
  { id: "clothing", label: needShortLabels.clothing },
];

export const metadata = {
  title: "Find help",
};

export default async function FindHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const params = await searchParams;
  const selected = isNeedType(params.need) ? params.need : undefined;
  const organizations = selected
    ? helpOrganizations.filter((org) => org.services.includes(selected))
    : helpOrganizations;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Find help</h1>
        <p className="mt-2 text-muted-foreground">
          Organizations nearby that can help with shelter, meals, care, and
          more.
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
      {organizations.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-muted-foreground ring-1 ring-foreground/10">
          No programs shown for that yet. Try another kind of help.
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
                    <h2 className="text-lg font-medium">{org.name}</h2>
                    <Badge variant="secondary">{org.openLabel}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {org.neighborhood} · {org.walkTime}
                  </p>
                  <p className="mt-3 text-sm">{org.highlight}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {org.services.map((service) => (
                      <NeedBadge key={service} need={service} />
                    ))}
                  </div>
                </div>
                <AskForHelpButton organization={org.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
