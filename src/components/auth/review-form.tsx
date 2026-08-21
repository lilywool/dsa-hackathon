"use client";

import { useActionState } from "react";

import { AuthError } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockReview, type AuthState } from "@/lib/auth/actions";

const initial: AuthState = { error: null };

export function ReviewUnlockForm() {
  const [state, action, pending] = useActionState(unlockReview, initial);

  return (
    <form action={action} className="space-y-4">
      <AuthError message={state.error} />
      <div className="space-y-2">
        <Label htmlFor="password">Review password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 px-3"
        />
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Checking…" : "Open applications"}
      </Button>
    </form>
  );
}
