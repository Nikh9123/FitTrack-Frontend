import { getApiBaseUrl } from "@/lib/api";
import type { TrendPoint } from "@/hooks/useProgressAPI";

export interface CurrentWorkoutPlan {
  id: string;
  title: string;
  category: string | null;
  goal: string | null;
  estimatedCalories: number | null;
  estimatedDuration: string | null;
  exercises: Array<{
    id: string;
    exerciseName: string;
    dayName: string;
    sets: number;
    reps: string | null;
    muscleGroup: string | null;
  }>;
}

export interface WorkoutStreakDetails {
  currentStreak: number;
  totalWorkouts: number;
  consistencyScore: number;
}

export interface HomeWeightSummary {
  points: TrendPoint[];
  source: "manual" | "inbody" | "none";
  latestKg: number | null;
}

export async function fetchWorkoutStreak(token: string): Promise<WorkoutStreakDetails> {
  const res = await fetch(`${getApiBaseUrl()}/workouts/streaks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load streak");
  return {
    currentStreak: data.currentStreak ?? 0,
    totalWorkouts: data.totalWorkouts ?? 0,
    consistencyScore: data.consistencyScore ?? 0,
  };
}

export async function fetchCurrentWorkoutPlan(token: string): Promise<CurrentWorkoutPlan | null> {
  const res = await fetch(`${getApiBaseUrl()}/workouts/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load workout plan");
  if (!data.plan) return null;
  const plan = data.plan as CurrentWorkoutPlan;
  return plan;
}

export async function fetchHomeWeightSummary(token: string): Promise<HomeWeightSummary> {
  const res = await fetch(`${getApiBaseUrl()}/progress/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load weight summary");

  const manual: TrendPoint[] = data.manualWeightTrend ?? [];
  const inbody: TrendPoint[] = data.inbodyWeightTrend ?? data.weightTrend ?? [];
  const source = data.weightSource as HomeWeightSummary["source"] | undefined;

  const points =
    source === "inbody" || (inbody.length >= 2 && manual.length < 2)
      ? inbody.slice(-8)
      : manual.length >= 2
        ? manual.slice(-8)
        : inbody.length > 0
          ? inbody.slice(-8)
          : [];

  const resolvedSource: HomeWeightSummary["source"] =
    points === inbody.slice(-8) && inbody.length > 0
      ? "inbody"
      : points.length > 0
        ? "manual"
        : "none";

  const latest = points.length > 0 ? points[points.length - 1].value : data.currentMetrics?.weight ?? null;

  return {
    points,
    source: source && source !== "both" && source !== "none" ? source : resolvedSource,
    latestKg: typeof latest === "number" ? latest : null,
  };
}

import { getWeekdayName } from "@/lib/activity-storage";

/** Exercises scheduled for today's weekday in the plan */
export function getTodaysPlanExercises(plan: CurrentWorkoutPlan) {
  if (!plan.exercises?.length) {
    return { dayName: "Workout", exercises: [] as CurrentWorkoutPlan["exercises"] };
  }
  const dayName = getWeekdayName();
  const exercises = plan.exercises.filter((e) => e.dayName === dayName);
  return { dayName, exercises };
}
