import { getApiBaseUrl } from "@/lib/api";

export type HistoryPeriod = "7d" | "30d" | "90d" | "1y";

export interface HistoryDayBucket {
  date: string;
  steps: number;
  caloriesBurned: number;
  sleepHours: number;
  caloriesConsumed: number;
  proteinG: number;
  waterMl: number;
  waterGlasses: number;
  weightKg: number | null;
}

export interface UnifiedHistoryDto {
  period: HistoryPeriod;
  days: number;
  buckets: HistoryDayBucket[];
  totals: {
    steps: number;
    caloriesBurned: number;
    caloriesConsumed: number;
    waterGlasses: number;
    daysWithSteps: number;
    daysWithMeals: number;
  };
  averages: {
    steps: number;
    caloriesBurned: number;
    caloriesConsumed: number;
    waterGlasses: number;
    sleepHours: number;
  };
}

export interface HistoryInsightDto {
  id: string;
  message: string;
  trend: "up" | "down" | "neutral";
  metric: string;
}

export async function fetchProgressHistory(token: string, period: HistoryPeriod = "7d") {
  const res = await fetch(`${getApiBaseUrl()}/progress/history?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `History fetch failed (${res.status})`);
  }
  const data = (await res.json()) as { history: UnifiedHistoryDto };
  return data.history;
}

export async function fetchProgressInsights(token: string, period: HistoryPeriod = "7d") {
  const res = await fetch(`${getApiBaseUrl()}/progress/insights?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Insights fetch failed (${res.status})`);
  }
  const data = (await res.json()) as { insights: HistoryInsightDto[] };
  return data.insights;
}
