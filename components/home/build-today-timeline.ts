import type { TimelineEvent } from "@/components/home/ActivityTimeline";
import type { Meal } from "@/context/FitnessContext";

interface BuildTodayTimelineParams {
  steps: number;
  stepGoal: number;
  meals: Meal[];
  waterGlasses: number;
  waterGoal: number;
  caloriesBurned: number;
  sleepHours: number;
  workoutCount: number;
}

export function buildTodayTimeline(params: BuildTodayTimelineParams): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (params.sleepHours > 0) {
    events.push({
      id: "sleep",
      timeLabel: "Last night",
      title: `${params.sleepHours}h sleep logged`,
      subtitle: params.sleepHours >= 7 ? "Recovery on track" : "Aim for 7–8 hours tonight",
      icon: "moon",
      color: "#A78BFA",
    });
  }

  if (params.steps > 0) {
    const pct = Math.round((params.steps / params.stepGoal) * 100);
    events.push({
      id: "steps",
      timeLabel: "Today",
      title: `${params.steps.toLocaleString()} steps`,
      subtitle: `${pct}% of ${params.stepGoal.toLocaleString()} goal · ${params.caloriesBurned} kcal burned`,
      icon: "footsteps",
      color: "#FF6B35",
    });
  }

  for (const meal of params.meals) {
    events.push({
      id: `meal-${meal.id}`,
      timeLabel: meal.time,
      title: meal.name,
      subtitle: `${meal.calories} kcal · P ${meal.protein.toFixed(0)}g C ${meal.carbs.toFixed(0)}g F ${meal.fat.toFixed(0)}g`,
      icon: "restaurant",
      color: "#4ADE80",
    });
  }

  if (params.waterGlasses > 0) {
    events.push({
      id: "water",
      timeLabel: "Today",
      title: `${params.waterGlasses} glasses of water`,
      subtitle:
        params.waterGlasses >= params.waterGoal
          ? "Hydration goal met"
          : `${params.waterGoal - params.waterGlasses} to go`,
      icon: "water",
      color: "#38BDF8",
    });
  }

  if (params.workoutCount > 0) {
    events.push({
      id: "workout",
      timeLabel: "Today",
      title: params.workoutCount === 1 ? "Workout completed" : `${params.workoutCount} workouts logged`,
      subtitle: "Great consistency",
      icon: "barbell",
      color: "#FBBF24",
    });
  }

  return events;
}
