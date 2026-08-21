"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { askForHelp, type HelpState } from "@/lib/help/actions";
import type { ServiceKind } from "@/lib/services";

const initial: HelpState = { error: null, asked: false };

export function AskForHelpButton({
  organizationId,
  organizationName,
  need,
  persist = false,
}: {
  organizationId: string;
  organizationName: string;
  need?: ServiceKind;
  persist?: boolean;
}) {
  const [localAsked, setLocalAsked] = useState(false);
  const [state, action, pending] = useActionState(askForHelp, initial);
  const asked = persist ? state.asked : localAsked;

  if (!need) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose a kind of help above to reach out.
      </p>
    );
  }

  if (!persist) {
    return (
      <div className="flex flex-col items-start gap-2">
        {asked ? (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Check className="size-4" aria-hidden="true" />
            Request sent to {organizationName}
          </p>
        ) : null}
        <Button
          className="h-11 px-4 text-sm"
          onClick={() => setLocalAsked(true)}
        >
          {asked ? "Ask again" : "Ask for help"}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="need" value={need} />
      {asked ? (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Check className="size-4" aria-hidden="true" />
          Request sent to {organizationName}
        </p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-11 px-4 text-sm">
        {pending ? "Asking…" : asked ? "Ask again" : "Ask for help"}
      </Button>
    </form>
  );
}
