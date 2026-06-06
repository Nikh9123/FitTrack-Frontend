import { getApiBaseUrl } from "@/lib/api";
import type { CompletedWorkout, SetLog } from "@/lib/workout-types";

export interface WorkoutHistoryLogDto {
  logId: string;
  weight: string | number | null;
  reps: number | null;
  setsCompleted: number;
  loggedAt: string;
  exerciseId: string;
  exerciseName: string;
  bodyPart: string | null;
}

export interface WorkoutHistorySessionDto {
  id: string;
  startedAt: string;
  completedAt: string | null;
  totalDuration: number | null;
  caloriesBurned: number | null;
  completionPercentage: number | null;
  logs: WorkoutHistoryLogDto[];
}

function parseNum(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapSessionToCompletedWorkout(session: WorkoutHistorySessionDto): CompletedWorkout {
  const completedAt = session.completedAt ?? session.startedAt;
  const date = completedAt.split("T")[0];
  const dayName = new Date(completedAt).toLocaleDateString("en-US", { weekday: "long" });

  const exerciseMap = new Map<string, { name: string; setsLogged: SetLog[] }>();
  let totalVolume = 0;
  let setsCount = 0;

  for (const log of session.logs ?? []) {
    const weight = parseNum(log.weight);
    const reps = log.reps ?? 0;
    const sets = log.setsCompleted ?? 1;

    totalVolume += weight * reps * sets;
    setsCount += sets;

    const existing = exerciseMap.get(log.exerciseId) ?? { name: log.exerciseName, setsLogged: [] };
    for (let i = 0; i < sets; i++) {
      existing.setsLogged.push({ reps, weight, completed: true });
    }
    exerciseMap.set(log.exerciseId, existing);
  }

  const exercises = Array.from(exerciseMap.values());
  const focus =
    session.logs?.[0]?.bodyPart?.trim() ||
    (exercises.length > 0 ? exercises[0].name.split(" ")[0] : "General");

  const durationSeconds = session.totalDuration ?? 0;
  const duration = durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / 60)) : 1;

  return {
    id: session.id,
    dayName,
    focus,
    date,
    duration,
    calories: session.caloriesBurned ?? 0,
    totalVolume: Math.round(totalVolume),
    setsCount,
    exercises,
  };
}

export async function fetchWorkoutHistory(
  token: string,
  limit = 50,
  offset = 0,
): Promise<CompletedWorkout[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${getApiBaseUrl()}/workouts/history?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to fetch workout history");
  const sessions = (body.history ?? []) as WorkoutHistorySessionDto[];
  return sessions.map(mapSessionToCompletedWorkout);
}
