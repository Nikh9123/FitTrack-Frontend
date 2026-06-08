import { useAuth } from "@/context/AuthContext";
import {
  fetchWorkoutPlanBundle,
  type WorkoutDayPlan,
  type WorkoutPlanBundle,
} from "@/lib/workout-plan-api";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

export function useWorkoutPlan() {
  const { token } = useAuth();
  const [planBundle, setPlanBundle] = useState<WorkoutPlanBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setPlanBundle(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchWorkoutPlanBundle(token);
      setPlanBundle(bundle);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workout plan");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const days: WorkoutDayPlan[] = planBundle?.days ?? [];

  return {
    planBundle,
    planId: planBundle?.id ?? null,
    planTitle: planBundle?.title ?? null,
    planGoal: planBundle?.goal ?? null,
    days,
    loading,
    error,
    refresh,
  };
}
