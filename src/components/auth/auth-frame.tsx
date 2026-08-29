import Link from "next/link";

import { BrandMark } from "@/components/brand";

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="mx-auto flex w-full max-w-lg items-center px-6 py-6">
        <BrandMark />
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-16">
        <h1 className="font-heading text-3xl tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}

export function AuthLinks({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">{children}</p>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
