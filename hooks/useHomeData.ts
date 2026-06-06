import { useAuth } from "@/context/AuthContext";
import {
  fetchCurrentWorkoutPlan,
  fetchHomeWeightSummary,
  type CurrentWorkoutPlan,
  type HomeWeightSummary,
} from "@/lib/home-api";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useHomeData() {
  const { token } = useAuth();
  const [workoutPlan, setWorkoutPlan] = useState<CurrentWorkoutPlan | null>(null);
  const [weightSummary, setWeightSummary] = useState<HomeWeightSummary>({
    points: [],
    source: "none",
    latestKg: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setWorkoutPlan(null);
      setWeightSummary({ points: [], source: "none", latestKg: null });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [plan, weight] = await Promise.all([
        fetchCurrentWorkoutPlan(token).catch(() => null),
        fetchHomeWeightSummary(token).catch(() => ({ points: [], source: "none" as const, latestKg: null })),
      ]);
      setWorkoutPlan(plan);
      setWeightSummary(weight);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load home data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { workoutPlan, weightSummary, loading, error, refresh };
}
