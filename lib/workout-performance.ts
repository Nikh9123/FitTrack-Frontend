import type { CompletedWorkout } from "@/lib/workout-types";

export interface ExercisePerformance {
  weight: number;
  reps: number;
  date?: string;
}

export function getLastExercisePerformance(
  exerciseName: string,
  history: CompletedWorkout[],
): ExercisePerformance | null {
  const normalized = exerciseName.trim().toLowerCase();
  for (const workout of history) {
    const ex = workout.exercises.find((e) => e.name.trim().toLowerCase() === normalized);
    if (!ex) continue;
    const completed = ex.setsLogged.filter((s) => s.completed && s.reps > 0);
    if (completed.length === 0) continue;
    const last = completed[completed.length - 1];
    return { weight: last.weight, reps: last.reps, date: workout.date };
  }
  return null;
}
