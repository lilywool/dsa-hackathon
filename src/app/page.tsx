import Link from "next/link";
import {
  ArrowRight,
  Building2,
  HandHelping,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { appName, appTagline } from "@/lib/placeholder";

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.93_0.04_85),_transparent_58%),radial-gradient(ellipse_at_bottom_right,_oklch(0.93_0.03_175),_transparent_50%)]"
      />
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <BrandMark />
        <p className="hidden text-sm text-muted-foreground sm:block">
          Sign in to continue
        </p>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16 pt-6">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          Two doors in
        </p>
        <h1 className="font-heading mt-3 max-w-2xl text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
          {appName} is how people find help, and how organizations offer it.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          {appTagline} Organizations apply first. Participants can create an
          account with email and password.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <RoleCard
            href="/organization/sign-in"
            icon={Building2}
            eyebrow="For organizations"
            title="Relieve homelessness from your programs"
            body="Apply with your name, location, and services. After approval, sign in with the same email and password."
            action="Organization sign in"
          />
          <RoleCard
            href="/participant/sign-in"
            icon={HandHelping}
            eyebrow="For participants"
            title="Find a bed, a meal, or a next step"
            body="Create an account with a regular email and password, then look for nearby help in plain language."
            action="Participant sign in"
          />
        </div>
      </main>
    </div>
  );
}

function RoleCard({
  href,
  icon: Icon,
  eyebrow,
  title,
  body,
  action,
}: {
  href: string;
  icon: typeof Building2;
  eyebrow: string;
  title: string;
  body: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl bg-card p-6 ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-xs font-medium tracking-wider text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="font-heading mt-2 text-2xl tracking-tight text-balance">
        {title}
      </h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <span className="mt-6 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
        {action}
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
