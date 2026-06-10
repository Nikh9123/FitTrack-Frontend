import { getApiBaseUrl } from "@/lib/api";

export type WeightChangePeriod = "1d" | "1w" | "1m" | "all";
export type WeightChangeSource = "scale" | "inbody";

export interface WeightChangeDto {
  deltaKg: number;
  direction: "lost" | "gained" | "unchanged";
  startKg: number;
  endKg: number;
  hasData: boolean;
  isEstimated?: boolean;
  disclaimer?: string | null;
  anchorDate?: string | null;
}

export const BANNER_WEIGHT_PERIODS: WeightChangePeriod[] = ["1d", "1w", "1m", "all"];

export type BannerWeightChangeMap = Partial<Record<WeightChangePeriod, WeightChangeDto>>;

export async function fetchWeightChange(
  token: string,
  period: WeightChangePeriod = "1w",
  source: WeightChangeSource = "scale",
): Promise<WeightChangeDto> {
  const res = await fetch(
    `${getApiBaseUrl()}/progress/weight-change?period=${period}&source=${source}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Weight change fetch failed (${res.status})`);
  }
  const data = (await res.json()) as { change: WeightChangeDto };
  return data.change;
}

/** Prefetch all banner periods in one parallel round-trip batch. */
export async function fetchAllBannerWeightChanges(
  token: string,
  source: WeightChangeSource = "scale",
): Promise<BannerWeightChangeMap> {
  const entries = await Promise.all(
    BANNER_WEIGHT_PERIODS.map(async (period) => {
      try {
        const change = await fetchWeightChange(token, period, source);
        return [period, change] as const;
      } catch {
        return [period, null] as const;
      }
    }),
  );
  const map: BannerWeightChangeMap = {};
  for (const [period, change] of entries) {
    if (change) map[period] = change;
  }
  return map;
}

export function filterTrendByPeriod<T extends { date?: string }>(
  points: T[],
  period: WeightChangePeriod,
): T[] {
  if (period === "all" || points.length === 0) return points;

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);

  if (period === "1d") {
    cutoff.setDate(cutoff.getDate() - 1);
  } else if (period === "1w") {
    cutoff.setDate(cutoff.getDate() - 6);
  } else {
    cutoff.setDate(cutoff.getDate() - 29);
  }

  const filtered = points.filter((p) => p.date && new Date(p.date) >= cutoff);
  return filtered.length >= 2 ? filtered : points;
}

export const PERIOD_LABELS: Record<WeightChangePeriod, string> = {
  "1d": "Yesterday",
  "1w": "Week",
  "1m": "Month",
  all: "All",
};

export const BANNER_PERIOD_OPTIONS: Array<{ key: WeightChangePeriod; label: string }> = [
  { key: "1d", label: "Yesterday" },
  { key: "1w", label: "7d" },
  { key: "1m", label: "30d" },
  { key: "all", label: "All" },
];

export const ESTIMATED_WEIGHT_INFO =
  "Actual weight change may take up to 3 weeks to show on the scale.";

function formatDeltaAmount(deltaKg: number): string {
  const absKg = Math.abs(deltaKg);
  if (absKg < 1) return `${Math.round(absKg * 1000)}g`;
  return `${absKg.toFixed(1)} kg`;
}

export function formatWeightChangeMessage(change: WeightChangeDto | null): string {
  if (!change?.hasData) return "Log weight to track change";
  const amount = formatDeltaAmount(change.deltaKg);
  const prefix = change.isEstimated ? "Est. " : "";
  if (change.direction === "lost") return `${prefix}You lost ${amount}`;
  if (change.direction === "gained") return `${prefix}You gained ${amount}`;
  return change.isEstimated ? "Est. no change" : "No change";
}

export function formatBannerWeightChange(
  change: WeightChangeDto | null,
  period: WeightChangePeriod,
): string {
  if (!change?.hasData) {
    return "Log meals & activity to see weight change";
  }
  const amount = formatDeltaAmount(change.deltaKg);
  const prefix = change.isEstimated ? "Est. " : "";
  const periodSuffix =
    period === "1d" ? " yesterday" : period === "1w" ? " this week" : period === "1m" ? " this month" : "";

  if (change.direction === "lost") return `${prefix}You lost ${amount}${periodSuffix}`;
  if (change.direction === "gained") return `${prefix}You gained ${amount}${periodSuffix}`;
  return change.isEstimated ? `Est. no change${periodSuffix}` : `No change${periodSuffix}`;
}
