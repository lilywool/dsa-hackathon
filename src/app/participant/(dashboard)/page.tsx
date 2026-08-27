import Link from "next/link";
import {
  BedDouble,
  Briefcase,
  HeartPulse,
  Shirt,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { CareAssessCallout } from "@/components/participant/care-assess-callout";
import { NearbyOrganizations } from "@/components/participant/nearby-organizations";
import { requireParticipant } from "@/lib/auth/session";
import {
  listDirectoryOrganizations,
  toHelpOrganization,
} from "@/lib/help/queries";
import { needOptions, type ServiceKind } from "@/lib/services";

const needIcons: Record<ServiceKind, typeof BedDouble> = {
  shelter: BedDouble,
  food: UtensilsCrossed,
  healthcare: HeartPulse,
  employment: Briefcase,
  clothing: Shirt,
  other: Sparkles,
};

export default async function ParticipantHomePage() {
  await requireParticipant();
  const nearby = (await listDirectoryOrganizations()).map(toHelpOrganization);

  return (
    <div className="space-y-10 pb-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
          What do you need today?
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Tap one. We will show organizations that offer that service.
        </p>
      </div>
      <section>
        <h2 className="sr-only">Choose a need</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {needOptions.map((need) => {
            const Icon = needIcons[need.id];
            return (
              <Link
                key={need.id}
                href={`/participant/find?need=${need.id}`}
                className="flex min-h-20 items-center gap-4 rounded-2xl bg-card px-4 py-4 text-left ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <span className="text-base font-medium">{need.prompt}</span>
              </Link>
            );
          })}
        </div>
      </section>
      <NearbyOrganizations organizations={nearby} />

      <CareAssessCallout />
    </div>
  );
}
