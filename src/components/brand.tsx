import Link from "next/link";

import { cn } from "@/lib/utils";
import { appName } from "@/lib/placeholder";

export function BrandMark({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          inverted
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "bg-primary text-primary-foreground",
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none">
          <path
            d="M4 20V10.5L12 5l8 5.5V20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9 20v-6h6v6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-heading text-lg tracking-tight",
          inverted ? "text-sidebar-foreground" : "text-foreground",
        )}
      >
        {appName}
      </span>
    </Link>
  );
}
