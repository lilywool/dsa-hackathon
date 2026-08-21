import type { ForecastPoint } from "@/lib/data/types";

/**
 * Additive Holt–Winters (triple exponential smoothing) with monthly seasonality.
 * Suitable for 8+ years of PIT-style monthly totals; produces point forecasts
 * and residual-based confidence bands (not a clinical/actuarial claim).
 */
export function forecastMonthlySeries(
  history: { date: string; total: number }[],
  horizon = 6,
  seasonLength = 12,
): ForecastPoint[] {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((point) => Math.max(0, point.total));
  const dates = sorted.map((point) => point.date);

  if (values.length < seasonLength * 2) {
    const mean =
      values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const residualStd = stdDev(values.map((value) => value - mean));
    const historical: ForecastPoint[] = sorted.map((point) => ({
      date: point.date,
      value: point.total,
      lower: point.total,
      upper: point.total,
      kind: "history",
    }));
    const forecast: ForecastPoint[] = [];
    let cursor = parseMonth(dates.at(-1) ?? "2025-12-01");
    for (let step = 1; step <= horizon; step += 1) {
      cursor = addMonths(cursor, 1);
      const band = 1.96 * residualStd * Math.sqrt(step);
      forecast.push({
        date: formatMonth(cursor),
        value: Math.max(0, mean),
        lower: Math.max(0, mean - band),
        upper: mean + band,
        kind: "forecast",
      });
    }
    return [...historical, ...forecast];
  }

  const alpha = 0.35;
  const beta = 0.15;
  const gamma = 0.25;

  const seasons = Math.floor(values.length / seasonLength);
  const seasonals = Array.from({ length: seasonLength }, (_, index) => {
    let sum = 0;
    for (let season = 0; season < seasons; season += 1) {
      sum += values[season * seasonLength + index] ?? 0;
    }
    return sum / seasons;
  });
  const seasonMean =
    seasonals.reduce((sum, value) => sum + value, 0) / seasonLength;
  for (let index = 0; index < seasonLength; index += 1) {
    seasonals[index] -= seasonMean;
  }

  let level = values[0] - seasonals[0];
  let trend = (values[seasonLength] - values[0]) / seasonLength;
  const fitted: number[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const seasonal = seasonals[index % seasonLength];
    const lastLevel = level;
    level = alpha * (value - seasonal) + (1 - alpha) * (level + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    seasonals[index % seasonLength] =
      gamma * (value - level) + (1 - gamma) * seasonal;
    fitted.push(level + trend + seasonals[index % seasonLength]);
  }

  const residuals = values.map((value, index) => value - (fitted[index] ?? value));
  const sigma = stdDev(residuals);

  const historical: ForecastPoint[] = sorted.map((point) => ({
    date: point.date,
    value: point.total,
    lower: point.total,
    upper: point.total,
    kind: "history",
  }));

  const forecast: ForecastPoint[] = [];
  let cursor = parseMonth(dates[dates.length - 1]);
  for (let step = 1; step <= horizon; step += 1) {
    cursor = addMonths(cursor, 1);
    const seasonal = seasonals[(values.length + step - 1) % seasonLength];
    const point = Math.max(0, level + step * trend + seasonal);
    const band = 1.96 * sigma * Math.sqrt(step);
    forecast.push({
      date: formatMonth(cursor),
      value: point,
      lower: Math.max(0, point - band),
      upper: point + band,
      kind: "forecast",
    });
  }

  return [...historical, ...forecast];
}

function stdDev(values: number[]) {
  if (values.length < 2) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function parseMonth(iso: string) {
  const [year, month] = iso.slice(0, 10).split("-").map(Number);
  return { year, month };
}

function addMonths(cursor: { year: number; month: number }, count: number) {
  const index = cursor.year * 12 + (cursor.month - 1) + count;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function formatMonth(cursor: { year: number; month: number }) {
  return `${cursor.year}-${String(cursor.month).padStart(2, "0")}-01`;
}

/** Map block-level neighborhood labels onto the 6 forecast polygons. */
export function neighborhoodForecastKey(label: string) {
  if (label === "South East Village" || label.startsWith("East Village")) {
    return "East Village";
  }
  return label;
}

export function formatMonthLabel(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
