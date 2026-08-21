"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, HeartHandshake } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/participant", label: "Home", icon: Home },
  { href: "/participant/find", label: "Find help", icon: Search },
  {
    href: "/participant/connections",
    label: "My connections",
    icon: HeartHandshake,
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/participant") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ParticipantShell({
  children,
  firstName,
}: {
  children: React.ReactNode;
  firstName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col bg-[oklch(0.97_0.018_85)]">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-[oklch(0.97_0.018_85)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <BrandMark />
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Hi, {firstName}</p>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-28 sm:py-8">
        {children}
      </main>
      <nav
        aria-label="Participant"
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-3 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
