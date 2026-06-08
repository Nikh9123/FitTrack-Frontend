import { useAuth } from "@/context/AuthContext";
import { getTodayDateKey } from "@/lib/activity-storage";
import type { MetricPeriod } from "@/lib/metrics/types";
import {
  fetchProgressHistory,
  type HistoryPeriod,
  type UnifiedHistoryDto,
} from "@/lib/progress-history-api";
import { useCallback, useEffect, useState } from "react";

function periodToApi(period: MetricPeriod): HistoryPeriod {
  switch (period) {
    case "today":
    case "week":
      return "7d";
    case "month":
      return "30d";
    case "year":
      return "1y";
  }
}

export function useMetricHistory(period: MetricPeriod) {
  const { token } = useAuth();
  const [history, setHistory] = useState<UnifiedHistoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setHistory(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProgressHistory(token, periodToApi(period));
      setHistory(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bucketsForChart = history?.buckets ?? [];
  const todayKey = getTodayDateKey();
  const todayBucket = bucketsForChart.find((b) => b.date.startsWith(todayKey));

  return { history, loading, error, refresh, bucketsForChart, todayBucket };
}

export function bucketLabel(date: string, period: MetricPeriod): string {
  const d = new Date(date);
  if (period === "year") return d.toLocaleDateString("en-US", { month: "short" });
  if (period === "month") return d.toLocaleDateString("en-US", { day: "numeric" });
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
