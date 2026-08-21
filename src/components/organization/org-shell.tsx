"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/organization", label: "Overview", icon: LayoutDashboard },
  { href: "/organization/requests", label: "Incoming requests", icon: ClipboardList },
  { href: "/organization/programs", label: "Programs & capacity", icon: BedDouble },
  { href: "/organization/people", label: "People connected", icon: Users },
];

function isActive(pathname: string, href: string) {
  if (href === "/organization") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Organization" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  onNavigate,
  organizationName,
  location,
}: {
  onNavigate?: () => void;
  organizationName: string;
  location: string | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <BrandMark inverted />
      </div>
      <div className="px-3">
        <p className="px-3 text-[11px] font-medium tracking-wider text-sidebar-foreground/50 uppercase">
          Signed in as
        </p>
        <div className="mt-1 rounded-lg px-3 py-2">
          <p className="text-sm font-medium text-sidebar-foreground">
            {organizationName}
          </p>
          {location ? (
            <p className="text-xs text-sidebar-foreground/60">{location}</p>
          ) : null}
        </div>
      </div>
      <Separator className="my-4 bg-sidebar-border" />
      <div className="flex-1 px-3">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="p-4">
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

export function OrgShell({
  children,
  organizationName,
  location,
}: {
  children: React.ReactNode;
  organizationName: string;
  location: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = navItems.find((item) => isActive(pathname, item.href));

  return (
    <div className="flex min-h-full bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 bg-sidebar text-sidebar-foreground lg:block">
        <SidebarBody
          organizationName={organizationName}
          location={location}
        />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-md lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="w-72 bg-sidebar p-0 text-sidebar-foreground"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Organization menu</SheetTitle>
              </SheetHeader>
              <SidebarBody
                organizationName={organizationName}
                location={location}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <p className="font-heading text-base">{current?.label ?? "Organization"}</p>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
