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

export function formatWeightChangeMessage(change: WeightChangeDto | null): string {
  if (!change?.hasData) return "Log weight to track change";
  const abs = Math.abs(change.deltaKg).toFixed(1);
  const prefix = change.isEstimated ? "Est. " : "";
  if (change.direction === "lost") return `${prefix}You lost ${abs} kg`;
  if (change.direction === "gained") return `${prefix}You gained ${abs} kg`;
  return change.isEstimated ? "Est. no change" : "No change";
}
