"use client";

import { useState } from "react";
import { Check, Clock } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NeedBadge, StatusBadge, UrgencyBadge } from "@/components/status-badges";
import {
  incomingRequests,
  type IncomingRequest,
  type RequestStatus,
} from "@/lib/placeholder";

export function RequestsPanel() {
  const [requests, setRequests] = useState(incomingRequests);

  function setStatus(id: string, status: RequestStatus) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    );
  }

  const pending = requests.filter((request) => request.status === "pending");
  const others = requests.filter((request) => request.status !== "pending");

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-heading text-lg">Waiting on a reply</h2>
        {pending.length === 0 ? (
          <p className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
            No one is waiting right now.
          </p>
        ) : (
          pending.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onStatus={setStatus}
            />
          ))
        )}
      </section>
      {others.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg">Recently updated</h2>
          {others.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onStatus={setStatus}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function RequestCard({
  request,
  onStatus,
}: {
  request: IncomingRequest;
  onStatus: (id: string, status: RequestStatus) => void;
}) {
  const isPending = request.status === "pending";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar size="lg">
          <AvatarFallback>{request.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{request.name}</p>
            <NeedBadge need={request.need} />
            <UrgencyBadge urgency={request.urgency} />
            {request.status !== "pending" ? (
              <StatusBadge status={request.status} />
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {request.note}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            {request.waited}
          </p>
        </div>
        {isPending ? (
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => onStatus(request.id, "accepted")}
            >
              <Check data-icon="inline-start" />
              Connect
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => onStatus(request.id, "waitlisted")}
            >
              Waitlist
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
