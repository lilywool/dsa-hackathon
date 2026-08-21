import Link from "next/link";

import { StatusBadge, NeedBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { participantConnections } from "@/lib/placeholder";

export const metadata = {
  title: "My connections",
};

export default function ParticipantConnectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">My connections</h1>
        <p className="mt-2 text-muted-foreground">
          Places you have asked for help. Status updates will be live once
          matching is wired up.
        </p>
      </div>
      {participantConnections.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
          <p className="text-muted-foreground">
            You have not asked any organization yet.
          </p>
          <Button className="mt-4 h-11 px-4" asChild>
            <Link href="/participant/find">Find help nearby</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {participantConnections.map((connection) => (
            <li
              key={connection.id}
              className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-medium">
                  {connection.organization}
                </h2>
                <NeedBadge need={connection.need} />
                <StatusBadge status={connection.status} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {connection.detail}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
