import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  needShortLabels,
  type NeedType,
  type RequestStatus,
} from "@/lib/placeholder";

export function NeedBadge({ need }: { need: NeedType }) {
  return <Badge variant="secondary">{needShortLabels[need]}</Badge>;
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const label =
    status === "pending"
      ? "Waiting"
      : status === "accepted"
        ? "Connected"
        : status === "waitlisted"
          ? "Waitlist"
          : "Closed";

  return (
    <Badge
      variant={status === "accepted" ? "default" : "outline"}
      className={cn(
        status === "pending" && "border-amber-700/20 bg-amber-50 text-amber-900",
        status === "waitlisted" && "border-border bg-muted text-muted-foreground",
        status === "declined" && "text-muted-foreground",
      )}
    >
      {label}
    </Badge>
  );
}
