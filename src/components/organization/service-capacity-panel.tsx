"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
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
  CAPACITY_JITTER,
  enrichCapacityRows,
  formatVacancyLabel,
  groupCapacityByService,
  shortOrgLabel,
  unfilledSupportAlert,
  vacancySummary,
  type AvailabilityStatus,
  type CapacityAvailabilityRow,
  type ExplicitServiceIndex,
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

const FOOD_PANTRY_ORG_KEYS = new Set([
  "feeding-san-diego",
  "jacobs-cushman-san-diego-food-bank",
]);

const EXCLUDED_FOOD_CHART_ORG_KEYS = new Set([
  "new-day-urban-ministries",
]);

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
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Organization</th>
            <th className="px-3 py-2.5 font-medium">Live capacity</th>
            <th className="px-3 py-2.5 font-medium">Estimated demand</th>
            <th className="px-3 py-2.5 font-medium">Estimated vacancies</th>
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
                        {row.vacancySimulated ? " · simulated" : ""}
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
                    avg {formatCapacityValue(row.baselineTotal)}
                    {row.displayTotal !== row.baselineTotal
                      ? ` · ${row.displayTotal > row.baselineTotal ? "+" : ""}${row.displayTotal - row.baselineTotal}`
                      : ""}
                  </p>
                </td>
                <td className="px-3 py-3 align-top tabular-nums">
                  <p className="font-medium">
                    {formatCapacityValue(row.displayNeed)}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.unitNoun}</p>
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

function ServiceCapacityChart({
  rows,
  title,
  organizationFilter,
}: {
  rows: CapacityAvailabilityRow[];
  title?: string;
  organizationFilter?: (row: CapacityAvailabilityRow) => boolean;
}) {
  const data = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row.capacity_confidence === "HIGH" ||
            row.capacity_confidence === "MEDIUM",
        )
          .filter((row) => organizationFilter?.(row) ?? true)
        .map((row) => ({
          name: shortOrgLabel(row.organization),
          fullName: row.organization,
          capacity: row.displayTotal,
          vacancies: row.displayVacancies ?? 0,
          demand: row.displayNeed,
          unit: row.displayUnit,
        })),
    [organizationFilter, rows],
  );

  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
        Charts use HIGH/MEDIUM published figures only for this service.
      </p>
    );
  }

  return (
    <div className="w-full">
      {title ? <p className="mb-2 text-sm font-medium">{title}</p> : null}
      <div
        aria-label="Chart legend"
        className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-sm bg-primary/35 ring-1 ring-primary/40" />
          Capacity
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-sm bg-primary" />
          Vacancies
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-sm bg-[oklch(0.55_0.06_250)]/60" />
          Demand
        </span>
      </div>
      <div className="h-72">
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
            <YAxis tick={{ fontSize: 10 }} width={60}>
              <Label
                value="Daily count"
                angle={-90}
                position="insideLeft"
                offset={8}
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
                return [`${formatCapacityValue(numeric)} ${unit}`, String(name)];
              }}
              labelFormatter={(_, payload) => {
                const first = payload?.[0]?.payload as
                  | { fullName?: string }
                  | undefined;
                return first?.fullName ?? "";
              }}
            />
            <Bar
              dataKey="capacity"
              name="Capacity"
              fill="oklch(0.45 0.08 175)"
              fillOpacity={0.35}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="vacancies"
              name="Vacancies"
              fill="oklch(0.45 0.08 175)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="demand"
              name="Demand"
              fill="oklch(0.55 0.06 250)"
              fillOpacity={0.55}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
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
          Referral options with vacancies
        </p>
        <p className="mt-1 text-muted-foreground">
          {peers
            .slice(0, 4)
            .map(
              (row) =>
                `${row.organization} (${formatVacancyLabel(row)})`,
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
          <div
            aria-label="Chart legend"
            className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm bg-primary/35 ring-1 ring-primary/40" />
              Capacity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm bg-primary" />
              Estimated vacancies
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm bg-[oklch(0.55_0.06_250)]/60" />
              Estimated demand
            </span>
          </div>
        {peers
          .slice(0, 4)
          .map(
            (row) =>
              `${row.organization} (${formatVacancyLabel(row)})`,
          )
          .join(" · ")}
        {peers.length > 4 ? ` · +${peers.length - 4} more` : ""}
      </p>
    </div>
  );
}

function UnfilledAlert({ rows }: { rows: CapacityAvailabilityRow[] }) {
  const alert = unfilledSupportAlert(rows);
  if (!alert) {
    return null;
  }

  return (
    <div
      role="status"
      className="rounded-xl bg-[oklch(0.96_0.04_75)] px-4 py-3 ring-1 ring-[oklch(0.82_0.08_70)]"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[oklch(0.42_0.08_55)]">
        Alert
      </p>
      <p className="mt-0.5 font-heading text-lg tracking-tight text-foreground">
        {alert.message}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Live snapshot for this service filter — capacity, need, and vacancies
        refresh when you change the filter.
      </p>
    </div>
  );
}

export function ServiceCapacityPanel({
  capacity,
  currentOrgName,
  defaultService,
  explicitOffers,
}: {
  capacity: OrgCapacityRow[];
  currentOrgName?: string | null;
  defaultService?: ServiceKind | null;
  explicitOffers?: ExplicitServiceIndex | null;
}) {
  const [active, setActive] = useState<ServiceKind | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);

  const enriched = useMemo(
    () => enrichCapacityRows(capacity, String(refreshSeed), explicitOffers),
    [capacity, refreshSeed, explicitOffers],
  );
  const byService = useMemo(
    () => groupCapacityByService(enriched),
    [enriched],
  );

  const servicesWithRows = SERVICE_KINDS.filter(
    (service) => (byService.get(service)?.length ?? 0) > 0,
  );

  const resolvedActive =
    active && servicesWithRows.includes(active)
      ? active
      : defaultService && servicesWithRows.includes(defaultService)
        ? defaultService
        : (servicesWithRows[0] ?? "shelter");

  if (servicesWithRows.length === 0) {
    return null;
  }

  const activeRows = byService.get(resolvedActive) ?? [];
  const foodPantryRows = activeRows.filter((row) =>
    FOOD_PANTRY_ORG_KEYS.has(row.org_key),
  );
  const warmMealRows = activeRows.filter(
    (row) => !FOOD_PANTRY_ORG_KEYS.has(row.org_key),
  );
  const summary = vacancySummary(activeRows);
  const summaryRows = resolvedActive === "food" ? warmMealRows : activeRows;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="font-heading text-xl">
          Service capacity &amp; vacancies
        </CardTitle>
        <CardDescription>
          Organizations that explicitly offer each service, with a live-style
          capacity snapshot (±{CAPACITY_JITTER * 100}% of published averages).
          Need and vacancies
          re-roll when you change the service filter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="space-y-2">
          <label
            htmlFor="capacity-service-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Filter by service offered
          </label>
          <select
            id="capacity-service-filter"
            className="flex h-10 w-full max-w-md rounded-lg border border-foreground/10 bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/30"
            value={resolvedActive}
            onChange={(event) => {
              const next = event.target.value as ServiceKind;
              setActive(next);
              setRefreshSeed((seed) => seed + 1);
            }}
          >
            {servicesWithRows.map((service) => (
              <option key={service} value={service}>
                {serviceShortLabels[service]} (
                {byService.get(service)?.length ?? 0})
              </option>
            ))}
          </select>
        </div>

        <Tabs
          value={resolvedActive}
          onValueChange={(value) => {
            setActive(value as ServiceKind);
            setRefreshSeed((seed) => seed + 1);
          }}
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

          <TabsContent value={resolvedActive} className="space-y-4">
            <UnfilledAlert rows={summaryRows} />

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
                {summary.unknown} simulated from modeled data
              </span>
            </div>

            <ReferralCallout
              rows={summaryRows}
              currentOrgName={currentOrgName}
            />

            <div className="space-y-4">
              <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                {resolvedActive === "food" ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ServiceCapacityChart
                      rows={foodPantryRows}
                      title="Capacity vs Vacancies vs Demand"
                      organizationFilter={(row) =>
                        FOOD_PANTRY_ORG_KEYS.has(row.org_key)
                      }
                    />
                    <ServiceCapacityChart
                      rows={warmMealRows}
                      title="Capacity vs Vacancies vs Demand"
                      organizationFilter={(row) =>
                        !FOOD_PANTRY_ORG_KEYS.has(row.org_key) &&
                        !EXCLUDED_FOOD_CHART_ORG_KEYS.has(row.org_key)
                      }
                    />
                  </div>
                ) : (
                  <>
                    <p className="mb-2 text-sm font-medium">
                      Capacity vs Vacancies vs Demand
                    </p>
                    <ServiceCapacityChart rows={activeRows} />
                  </>
                )}
              </div>
              {resolvedActive === "food" ? (
                <div className="space-y-4">
                  <section className="space-y-2">
                    <h3 className="font-heading text-lg">Food pantries</h3>
                    <ServiceCapacityTable
                      rows={foodPantryRows}
                      currentOrgName={currentOrgName}
                    />
                  </section>
                  <section className="space-y-2">
                    <h3 className="font-heading text-lg">Warm meals</h3>
                    <ServiceCapacityTable
                      rows={warmMealRows}
                      currentOrgName={currentOrgName}
                    />
                  </section>
                </div>
              ) : (
                <ServiceCapacityTable
                  rows={activeRows}
                  currentOrgName={currentOrgName}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Live capacity is synthetic within ±{CAPACITY_JITTER * 100}% of each
          organization&apos;s published daily average so the table can preview
          real-time reporting.
          LOW / MODELED rows still show simulated vacancies derived from those
          baselines. Replace with provider-reported inventory when available.
        </p>
      </CardContent>
    </Card>
  );
}
