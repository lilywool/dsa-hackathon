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
  alreadyAsked = false,
}: {
  organizationId: string;
  organizationName: string;
  need?: ServiceKind;
  persist?: boolean;
  alreadyAsked?: boolean;
}) {
  const [asked, setAsked] = useState(alreadyAsked);
  const [state, action, pending] = useActionState(askForHelp, {
    ...initial,
    asked: alreadyAsked,
  });

  if (!need) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose a kind of help above to reach out.
      </p>
    );
  }

  if (asked || state.asked) {
    return (
      <p className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary">
        <Check className="size-4" aria-hidden="true" />
        Asked {organizationName}
      </p>
    );
  }

  if (!persist) {
    return (
      <Button className="h-11 px-4 text-sm" onClick={() => setAsked(true)}>
        Ask for help
      </Button>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="need" value={need} />
      {state.error ? (
        <p className="mb-2 text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-11 px-4 text-sm">
        {pending ? "Asking…" : "Ask for help"}
      </Button>
    </form>
  );
}
