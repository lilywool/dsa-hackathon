"use client";

import { useActionState } from "react";

import { AuthError } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInParticipant,
  signUpParticipant,
  type AuthState,
} from "@/lib/auth/actions";

const initial: AuthState = { error: null };

const fieldClass = "h-11 px-3";

export function ParticipantSignInForm() {
  const [state, action, pending] = useActionState(signInParticipant, initial);

  return (
    <form action={action} className="space-y-4">
      <AuthError message={state.error} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function ParticipantSignUpForm() {
  const [state, action, pending] = useActionState(signUpParticipant, initial);

  return (
    <form action={action} className="space-y-4">
      <AuthError message={state.error} />
      <div className="space-y-2">
        <Label htmlFor="firstName">First name</Label>
        <Input
          id="firstName"
          name="firstName"
          autoComplete="given-name"
          required
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={fieldClass}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
