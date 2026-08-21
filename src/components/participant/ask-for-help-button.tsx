"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AskForHelpButton({ organization }: { organization: string }) {
  const [asked, setAsked] = useState(false);

  if (asked) {
    return (
      <p className="inline-flex h-11 items-center gap-2 text-sm font-medium text-primary">
        <Check className="size-4" aria-hidden="true" />
        Asked {organization}
      </p>
    );
  }

  return (
    <Button
      className="h-11 px-4 text-sm"
      onClick={() => setAsked(true)}
    >
      Ask for help
    </Button>
  );
}
