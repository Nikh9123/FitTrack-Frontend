import { getApiBaseUrl } from "@/lib/api";

export async function startWorkoutSessionApi(token: string, workoutPlanId?: string | null) {
  const res = await fetch(`${getApiBaseUrl()}/workouts/session/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ workoutPlanId: workoutPlanId ?? null }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to start workout session");
  return body.session as { id: string };
}

export async function logWorkoutSetApi(
  token: string,
  payload: {
    workoutSessionId: string;
    exerciseId: string;
    exerciseName?: string;
    weight: number;
    reps: number;
    setsCompleted?: number;
  },
) {
  const res = await fetch(`${getApiBaseUrl()}/workouts/session/log`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      workoutSessionId: payload.workoutSessionId,
      exerciseId: payload.exerciseId,
      exerciseName: payload.exerciseName,
      weight: payload.weight,
      reps: payload.reps,
      setsCompleted: payload.setsCompleted ?? 1,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to log set");
  return body;
}

export async function completeWorkoutSessionApi(
  token: string,
  payload: { workoutSessionId: string; totalDuration: number; caloriesBurned?: number },
) {
  const res = await fetch(`${getApiBaseUrl()}/workouts/session/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to complete workout");
  return body.session;
}
