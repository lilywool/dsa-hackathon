"use client";

import { useActionState } from "react";

import { AuthError } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { needShortLabels, type NeedType } from "@/lib/placeholder";
import {
  applyAsOrganization,
  requestPasswordReset,
  signInOrganization,
  signInToCheckStatus,
  updatePassword,
  type AuthState,
} from "@/lib/auth/actions";

const initial: AuthState = { error: null };
const fieldClass = "h-11 px-3";
const services: NeedType[] = [
  "shelter",
  "food",
  "healthcare",
  "employment",
  "clothing",
  "other",
];

export function OrganizationSignInForm() {
  const [state, action, pending] = useActionState(signInOrganization, initial);

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
        {pending ? "Signing in…" : "Open dashboard"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

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
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);

  return (
    <form action={action} className="space-y-4">
      <AuthError message={state.error} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={fieldClass}
        />
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}

export function OrganizationApplyForm() {
  const [state, action, pending] = useActionState(applyAsOrganization, initial);

  return (
    <form action={action} className="space-y-5">
      <AuthError message={state.error} />
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization name</Label>
        <Input
          id="organizationName"
          name="organizationName"
          required
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Where you are based</Label>
        <Input
          id="location"
          name="location"
          placeholder="City, neighborhood, or region"
          required
          className={fieldClass}
        />
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Services you provide</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((service) => (
            <label
              key={service}
              className="flex min-h-11 items-center gap-3 rounded-lg bg-card px-3 ring-1 ring-foreground/10"
            >
              <input
                type="checkbox"
                name="services"
                value={service}
                className="size-4 accent-primary"
              />
              <span className="text-sm">{needShortLabels[service]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="email">Contact email</Label>
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
        <p className="text-xs text-muted-foreground">
          You will use this email and password to sign in after you apply.
        </p>
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}

export function OrganizationStatusForm() {
  const [state, action, pending] = useActionState(signInToCheckStatus, initial);

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
        {pending ? "Checking…" : "Check status"}
      </Button>
    </form>
  );
}
