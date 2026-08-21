"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  availabilityLabels,
  enrichCapacityRows,
  formatVacancyLabel,
  groupCapacityByService,
  shortOrgLabel,
  vacancySummary,
  type AvailabilityStatus,
  type CapacityAvailabilityRow,
} from "@/lib/data/capacity-availability";
import { formatCapacityValue } from "@/lib/data/org-capacity-match";
import type { CapacityConfidence, OrgCapacityRow } from "@/lib/data/types";
import {
  SERVICE_KINDS,
  serviceShortLabels,
  type ServiceKind,
} from "@/lib/services";
import { cn } from "@/lib/utils";

const confidenceStyles: Record<CapacityConfidence, string> = {
  HIGH: "bg-primary/15 text-primary ring-primary/25",
  MEDIUM:
    "bg-[oklch(0.92_0.05_85)] text-[oklch(0.38_0.06_70)] ring-[oklch(0.8_0.05_80)]",
  LOW: "bg-destructive/10 text-destructive ring-destructive/20",
  MODELED_FALLBACK: "bg-muted text-muted-foreground ring-foreground/10",
};

const statusStyles: Record<AvailabilityStatus, string> = {
  available: "bg-primary/15 text-primary ring-primary/25",
  limited:
    "bg-[oklch(0.92_0.05_85)] text-[oklch(0.38_0.06_70)] ring-[oklch(0.8_0.05_80)]",
  at_capacity: "bg-destructive/10 text-destructive ring-destructive/20",
  unknown: "bg-muted text-muted-foreground ring-foreground/10",
};

const barFillByStatus: Record<AvailabilityStatus, string> = {
  available: "oklch(0.45 0.08 175)",
  limited: "oklch(0.62 0.12 75)",
  at_capacity: "oklch(0.55 0.14 25)",
  unknown: "oklch(0.72 0.02 80)",
};

function confidenceLabel(level: CapacityConfidence) {
  return level === "MODELED_FALLBACK" ? "MODELED" : level;
}

function ServiceCapacityTable({
  rows,
  currentOrgName,
}: {
  rows: CapacityAvailabilityRow[];
  currentOrgName?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
        No capacity rows are published for this service yet.
      </p>
    );
  }

  const currentLower = currentOrgName?.trim().toLowerCase() ?? "";

  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Organization</th>
            <th className="px-3 py-2.5 font-medium">Published capacity</th>
            <th className="px-3 py-2.5 font-medium">Open now</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {rows.map((row) => {
            const isCurrent =
              currentLower.length > 0 &&
              row.organization.trim().toLowerCase() === currentLower;
            const fillPct =
              row.displayOccupied != null && row.displayTotal > 0
                ? Math.min(
                    100,
                    Math.round((row.displayOccupied / row.displayTotal) * 100),
                  )
                : null;

            return (
              <tr
                key={`${row.org_key}-${row.category_enum}`}
                className={cn(isCurrent && "bg-primary/5")}
              >
                <td className="px-3 py-3 align-top">
                  <p className="font-medium text-foreground">
                    {row.organization}
                    {isCurrent ? (
                      <span className="ml-2 text-xs font-normal text-primary">
                        You
                      </span>
                    ) : null}
                  </p>
                  {row.canEstimateVacancy && fillPct != null ? (
                    <div className="mt-2 max-w-[200px] space-y-1">
                      <Progress value={fillPct} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground">
                        {fillPct}% occupied · {row.displayUnit}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {row.displayUnit}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 align-top tabular-nums">
                  <p className="font-medium">
                    {formatCapacityValue(row.displayTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.capacity_unit !== row.displayUnit
                      ? `from ${formatCapacityValue(row.capacity_value)} ${row.capacity_unit}`
                      : row.capacity_unit}
                  </p>
                </td>
                <td className="px-3 py-3 align-top tabular-nums">
                  <p
                    className={cn(
                      "font-medium",
                      row.status === "available" && "text-primary",
                      row.status === "at_capacity" && "text-destructive",
                    )}
                  >
                    {formatVacancyLabel(row)}
                  </p>
                </td>
                <td className="px-3 py-3 align-top">
                  <Badge
                    variant="outline"
                    className={cn("ring-1", statusStyles[row.status])}
                  >
                    {availabilityLabels[row.status]}
                  </Badge>
                </td>
                <td className="px-3 py-3 align-top">
                  <Badge
                    variant="outline"
                    className={cn(
                      "ring-1",
                      confidenceStyles[row.capacity_confidence],
                    )}
                  >
                    {confidenceLabel(row.capacity_confidence)}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ServiceCapacityChart({ rows }: { rows: CapacityAvailabilityRow[] }) {
  const data = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row.capacity_confidence === "HIGH" ||
            row.capacity_confidence === "MEDIUM",
        )
        .map((row) => ({
          name: shortOrgLabel(row.organization),
          fullName: row.organization,
          capacity: row.displayTotal,
          open: row.displayVacancies ?? 0,
          status: row.status,
          unit: row.displayUnit,
        })),
    [rows],
  );

  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
        Charts use HIGH/MEDIUM published figures only for this service.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 48, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5dfd3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 10 }} width={48}>
            <Label
              value="Capacity / open slots"
              angle={-90}
              position="insideLeft"
              style={{
                fontSize: 12,
                fill: "oklch(0.48 0.03 55)",
                textAnchor: "middle",
              }}
            />
          </YAxis>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              borderColor: "#e5dfd3",
              fontSize: 12,
            }}
            formatter={(value, name, item) => {
              const numeric =
                typeof value === "number" ? value : Number(value ?? 0);
              const unit =
                (item?.payload as { unit?: string } | undefined)?.unit ?? "";
              const label = name === "open" ? "Open now" : "Capacity";
              return [`${formatCapacityValue(numeric)} ${unit}`, label];
            }}
            labelFormatter={(_, payload) => {
              const first = payload?.[0]?.payload as
                | { fullName?: string }
                | undefined;
              return first?.fullName ?? "";
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" />
          <Bar dataKey="capacity" name="Capacity" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={`cap-${entry.fullName}`}
                fill={barFillByStatus[entry.status]}
                fillOpacity={0.35}
              />
            ))}
          </Bar>
          <Bar dataKey="open" name="Open now" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={`open-${entry.fullName}`}
                fill={barFillByStatus[entry.status]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReferralCallout({
  rows,
  currentOrgName,
}: {
  rows: CapacityAvailabilityRow[];
  currentOrgName?: string | null;
}) {
  const currentLower = currentOrgName?.trim().toLowerCase() ?? "";
  const current = rows.find(
    (row) => row.organization.trim().toLowerCase() === currentLower,
  );
  const peers = rows.filter(
    (row) =>
      row.organization.trim().toLowerCase() !== currentLower &&
      (row.status === "available" || row.status === "limited"),
  );

  if (!current || current.status !== "at_capacity" || peers.length === 0) {
    if (peers.length === 0) {
      return null;
    }
    return (
      <div className="rounded-xl bg-primary/8 px-4 py-3 text-sm ring-1 ring-primary/15">
        <p className="font-medium text-foreground">
          Referral options with open capacity
        </p>
        <p className="mt-1 text-muted-foreground">
          {peers
            .slice(0, 4)
            .map(
              (row) =>
                `${row.organization} (${formatVacancyLabel(row)} ${row.displayUnit})`,
            )
            .join(" · ")}
          {peers.length > 4 ? ` · +${peers.length - 4} more` : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-destructive/8 px-4 py-3 text-sm ring-1 ring-destructive/15">
      <p className="font-medium text-foreground">
        You are at capacity for this service
      </p>
      <p className="mt-1 text-muted-foreground">
        Send participants to:{" "}
        {peers
          .slice(0, 4)
          .map(
            (row) =>
              `${row.organization} (${formatVacancyLabel(row)} ${row.displayUnit})`,
          )
          .join(" · ")}
        {peers.length > 4 ? ` · +${peers.length - 4} more` : ""}
      </p>
    </div>
  );
}

export function ServiceCapacityPanel({
  capacity,
  currentOrgName,
  defaultService,
}: {
  capacity: OrgCapacityRow[];
  currentOrgName?: string | null;
  defaultService?: ServiceKind | null;
}) {
  const enriched = useMemo(() => enrichCapacityRows(capacity), [capacity]);
  const byService = useMemo(
    () => groupCapacityByService(enriched),
    [enriched],
  );

  const servicesWithRows = SERVICE_KINDS.filter(
    (service) => (byService.get(service)?.length ?? 0) > 0,
  );

  const initial =
    defaultService && servicesWithRows.includes(defaultService)
      ? defaultService
      : (servicesWithRows[0] ?? "shelter");

  const [active, setActive] = useState<ServiceKind>(initial);

  if (servicesWithRows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-xl">
          Service capacity &amp; vacancies
        </CardTitle>
        <CardDescription>
          Same published capacity figures shown on the need map (HIGH sites as
          teal dots), grouped by service. Occupancy and open beds/meals are a
          demo availability layer so full organizations can spot peers who can
          take a referral.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <Tabs
          value={active}
          onValueChange={(value) => setActive(value as ServiceKind)}
        >
          <TabsList variant="line" className="flex h-auto w-full flex-wrap">
            {servicesWithRows.map((service) => (
              <TabsTrigger key={service} value={service} className="px-3">
                {serviceShortLabels[service]}
                <span className="text-muted-foreground">
                  ({byService.get(service)?.length ?? 0})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {servicesWithRows.map((service) => {
            const rows = byService.get(service) ?? [];
            const summary = vacancySummary(rows);
            return (
              <TabsContent key={service} value={service} className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-primary ring-1 ring-primary/20">
                    {summary.available} with vacancies
                  </span>
                  <span className="rounded-md bg-[oklch(0.92_0.05_85)] px-2 py-1 text-[oklch(0.38_0.06_70)] ring-1 ring-[oklch(0.8_0.05_80)]">
                    {summary.limited} limited
                  </span>
                  <span className="rounded-md bg-destructive/10 px-2 py-1 text-destructive ring-1 ring-destructive/20">
                    {summary.atCapacity} at capacity
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1 ring-1 ring-foreground/10">
                    {summary.unknown} modeled / unknown
                  </span>
                </div>

                <ReferralCallout
                  rows={rows}
                  currentOrgName={currentOrgName}
                />

                <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
                  <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                    <p className="mb-2 text-sm font-medium">
                      Capacity vs open slots
                    </p>
                    <ServiceCapacityChart rows={rows} />
                  </div>
                  <ServiceCapacityTable
                    rows={rows}
                    currentOrgName={currentOrgName}
                  />
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Vacancy estimates apply to HIGH/MEDIUM bed and meal figures only.
          MODELED rows stay marked unknown — they are demand proxies, not live
          inventory. Replace the demo occupancy layer with live bed/meal counts
          when providers report them.
        </p>
      </CardContent>
    </Card>
  );
}
