import type { UnifiedHistoryDto } from "@/lib/progress-history-api";
import type { CoachTip } from "@/lib/metrics/types";

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildStepsInsights(
  history: UnifiedHistoryDto | null,
  todaySteps: number,
  stepGoal: number,
): string[] {
  const insights: string[] = [];
  if (history && history.averages.steps > 0) {
    const vs = pctChange(todaySteps, history.averages.steps);
    if (vs != null && vs !== 0) {
      insights.push(
        vs > 0
          ? `You're walking ${vs}% more than your recent daily average.`
          : `Today's steps are ${Math.abs(vs)}% below your recent average.`,
      );
    }
    const daysHit = history.buckets.filter((b) => b.steps >= stepGoal).length;
    if (daysHit > 0) {
      insights.push(`You hit your step goal on ${daysHit} of the last ${history.buckets.length} days.`);
    }
  }
  if (todaySteps >= stepGoal) insights.push("Step goal achieved today — great consistency!");
  return insights.slice(0, 4);
}

export function buildWaterInsights(history: UnifiedHistoryDto | null, todayGlasses: number, goal: number): string[] {
  const insights: string[] = [];
  if (history) {
    const withData = history.buckets.filter((b) => b.waterGlasses > 0);
    const missed = history.buckets.length - withData.length;
    if (missed > 0) insights.push(`${missed} day${missed === 1 ? "" : "s"} without hydration logs in this period.`);
    if (history.averages.waterGlasses > 0) {
      insights.push(`Average intake: ${history.averages.waterGlasses.toFixed(1)} glasses/day.`);
    }
  }
  if (todayGlasses < goal) {
    insights.push(`${goal - todayGlasses} glass${goal - todayGlasses === 1 ? "" : "es"} remaining today.`);
  }
  return insights.slice(0, 4);
}

export function buildCalorieInsights(
  history: UnifiedHistoryDto | null,
  consumed: number,
  goal: number,
  burned: number,
): string[] {
  const net = consumed - burned;
  const insights: string[] = [`Net calories today: ${net} kcal (food − activity).`];
  if (history?.averages.caloriesConsumed) {
    const vs = pctChange(consumed, history.averages.caloriesConsumed);
    if (vs != null && Math.abs(vs) >= 5) {
      insights.push(`Intake is ${Math.abs(vs)}% ${vs > 0 ? "above" : "below"} your recent average.`);
    }
  }
  const remaining = goal - consumed;
  if (remaining > 0) insights.push(`${remaining} kcal left in your budget today.`);
  else if (remaining < 0) insights.push(`${Math.abs(remaining)} kcal over goal today.`);
  return insights.slice(0, 4);
}

export function buildSleepInsights(history: UnifiedHistoryDto | null, todayHours: number): string[] {
  const insights: string[] = [];
  if (history && history.averages.sleepHours > 0) {
    insights.push(`Average sleep this period: ${history.averages.sleepHours.toFixed(1)}h.`);
    const weekend = history.buckets.filter((_, i) => {
      const d = new Date(history.buckets[i].date);
      const day = d.getDay();
      return day === 0 || day === 6;
    });
    const weekday = history.buckets.filter((_, i) => {
      const d = new Date(history.buckets[i].date);
      const day = d.getDay();
      return day >= 1 && day <= 5;
    });
    const wkndAvg =
      weekend.length > 0 ? weekend.reduce((s, b) => s + b.sleepHours, 0) / weekend.length : 0;
    const wkdyAvg =
      weekday.length > 0 ? weekday.reduce((s, b) => s + b.sleepHours, 0) / weekday.length : 0;
    if (wkndAvg > 0 && wkdyAvg > 0 && Math.abs(wkndAvg - wkdyAvg) >= 0.5) {
      const diffMin = Math.round(Math.abs(wkndAvg - wkdyAvg) * 60);
      insights.push(
        wkndAvg > wkdyAvg
          ? `You sleep ~${diffMin} minutes more on weekends.`
          : `You sleep ~${diffMin} minutes less on weekends.`,
      );
    }
  }
  if (todayHours > 0 && todayHours < 7) insights.push("Below 7h — recovery and hunger regulation may suffer.");
  return insights.slice(0, 4);
}

export function buildCoachTips(params: {
  steps: number;
  stepGoal: number;
  water: number;
  waterGoal: number;
  sleepHours: number;
  caloriesRemaining: number;
  calorieGoal: number;
  consumed: number;
}): CoachTip[] {
  const tips: CoachTip[] = [];
  const waterNeed = params.waterGoal - params.water;
  if (waterNeed > 0) {
    tips.push({
      message: `Drink ${waterNeed} more glass${waterNeed === 1 ? "" : "es"} of water before evening.`,
      icon: "water",
    });
  }
  const stepNeed = params.stepGoal - params.steps;
  if (stepNeed > 0 && stepNeed <= 3000) {
    tips.push({
      message: `Walking ${stepNeed.toLocaleString()} more steps will help you reach today's goal.`,
      icon: "walk",
    });
  }
  if (params.sleepHours > 0 && params.sleepHours < 7) {
    tips.push({
      message: `You're at ${params.sleepHours}h sleep. Aim for 30–60 minutes more tonight.`,
      icon: "moon",
    });
  }
  if (params.caloriesRemaining > 200 && params.consumed < params.calorieGoal * 0.7) {
    tips.push({
      message: "You're in a solid deficit — ensure adequate protein for recovery.",
      icon: "nutrition",
    });
  } else if (params.caloriesRemaining <= 0 && params.consumed > params.calorieGoal) {
    tips.push({
      message: "Consider a lighter dinner or extra movement to balance today's surplus.",
      icon: "flame",
    });
  }
  return tips.slice(0, 4);
}
