import type { User } from "@/context/AuthContext";
import { estimateCalorieBreakdown, estimateWaterGoalMl, stepsCaloriesBurned } from "@/lib/metrics/calories";
import type { DetailedDailyScore } from "@/lib/metrics/score";
import type { MetricExplanation } from "@/lib/metrics/types";

export function buildCaloriesExplanation(
  user: User | null,
  dailyGoal: number,
  consumed: number,
): MetricExplanation {
  const bd = estimateCalorieBreakdown(user, dailyGoal);
  const adjLabel = bd.goalAdjustment >= 0 ? `+${bd.goalAdjustment}` : String(bd.goalAdjustment);

  return {
    headline: `Why is my goal ${dailyGoal} kcal?`,
    whatItMeans:
      "Your calorie goal is the daily energy target that balances your metabolism, activity, and fitness objective.",
    whyItMatters:
      "Consistent intake near your goal supports sustainable weight change, stable energy, and recovery from training.",
    howCalculated:
      "We estimate Basal Metabolic Rate (BMR), multiply by an activity factor for maintenance (TDEE), then apply a deficit or surplus based on your goal.",
    influences: [
      `Weight (${bd.profileUsed.weightKg} kg)`,
      `Height (${bd.profileUsed.heightCm} cm)`,
      `Estimated age (${bd.profileUsed.age})`,
      `Activity level (${bd.activityLevel.replace("_", " ")})`,
      `Fitness goal (${bd.fitnessGoal})`,
    ],
    improveTips: [
      consumed < dailyGoal * 0.85
        ? "Add a balanced snack if energy is low."
        : "Prioritize protein and fiber to stay full on your target.",
      "Log meals consistently for accurate tracking.",
      "Pair nutrition with daily movement for better body composition.",
    ],
    tooLow:
      "Eating well below goal can speed weight loss but may reduce energy, recovery, and training performance.",
    tooHigh:
      "Eating above goal regularly may lead to weight gain, though it can support muscle gain when paired with strength training.",
    calculationRows: [
      { label: "BMR", value: `${bd.bmr} kcal` },
      { label: "Activity multiplier", value: `× ${bd.activityMultiplier}` },
      { label: "Maintenance (TDEE)", value: `${bd.maintenance} kcal` },
      { label: "Goal adjustment", value: `${adjLabel} kcal` },
      { label: "Final goal", value: `${bd.finalGoal} kcal`, highlight: true },
    ],
    personalizedNote: `You've logged ${consumed} kcal today (${Math.max(0, dailyGoal - consumed)} remaining).`,
  };
}

export function buildStepsExplanation(
  stepGoal: number,
  steps: number,
  weightKg: number,
): MetricExplanation {
  const burned = stepsCaloriesBurned(steps, weightKg);
  return {
    headline: `Why is my step goal ${stepGoal.toLocaleString()}?`,
    whatItMeans:
      "Daily steps measure overall movement. Higher step counts correlate with better cardiovascular health and calorie expenditure.",
    whyItMatters:
      "Walking is low-impact, improves recovery between workouts, and helps weight management without extra gym time.",
    howCalculated:
      "Your goal starts from the widely recommended 10,000-step benchmark and can be personalized in the app. Active lifestyles may warrant higher targets.",
    influences: ["Daily routine", "Commute patterns", "Workout frequency", "Recovery days"],
    improveTips: [
      steps < stepGoal
        ? `Walk ${(stepGoal - steps).toLocaleString()} more steps to hit today's goal.`
        : "Great work — maintain this pace for consistency.",
      "Take a 10-minute walk after meals.",
      "Use stairs and short walking breaks during work.",
    ],
    tooLow: "Low daily movement may reduce calorie burn and cardiovascular fitness over time.",
    tooHigh: "Very high step counts are generally safe; prioritize rest if you feel joint fatigue.",
    personalizedNote: `Your steps today have burned approximately ${burned} kcal (estimate based on ${weightKg} kg).`,
  };
}

export function buildWaterExplanation(
  waterGoalGlasses: number,
  glasses: number,
  weightKg: number,
): MetricExplanation {
  const goalMl = estimateWaterGoalMl(weightKg);
  const liters = (goalMl / 1000).toFixed(1);
  return {
    headline: `Why is my target ${waterGoalGlasses} glasses (~${liters} L)?`,
    whatItMeans:
      "Hydration supports performance, focus, digestion, and recovery. Your target approximates daily fluid needs.",
    whyItMatters:
      "Even mild dehydration can reduce energy, workout performance, and cognitive focus.",
    howCalculated:
      "A common guideline is ~35 ml per kg body weight, plus extra for exercise and active climates.",
    influences: ["Body weight", "Exercise duration", "Climate", "Sodium/caffeine intake"],
    improveTips: [
      glasses < waterGoalGlasses
        ? `Drink ${waterGoalGlasses - glasses} more glass${waterGoalGlasses - glasses === 1 ? "" : "es"} today.`
        : "Hydration goal met — keep steady intake through the evening.",
      "Drink a glass upon waking and before workouts.",
      "Add ~500 ml after intense training sessions.",
    ],
    tooLow: "Chronic under-hydration may cause headaches, fatigue, and poorer workout performance.",
    tooHigh: "Excessive rapid intake is rarely an issue for healthy adults; spread intake through the day.",
    personalizedNote: `Based on ${weightKg} kg, baseline need ≈ ${liters} L before activity adjustments.`,
  };
}

export function buildSleepExplanation(sleepHours: number, target = 8): MetricExplanation {
  return {
    headline: `Why is my sleep target ${target} hours?`,
    whatItMeans:
      "Sleep is when your body repairs muscle, regulates hormones, and consolidates learning.",
    whyItMatters:
      "Most adults perform best with 7–9 hours. Athletes often benefit from the upper end for recovery.",
    howCalculated:
      "Your 8-hour target aligns with age-based recommendations for adults and recovery-focused fitness goals.",
    influences: ["Bedtime consistency", "Training load", "Stress", "Screen time before bed"],
    improveTips: [
      sleepHours > 0 && sleepHours < target
        ? `Aim for ${(target - sleepHours).toFixed(1)} more hours tonight.`
        : "Log sleep daily to spot weekly patterns.",
      "Keep a consistent bedtime within 30 minutes.",
      "Limit caffeine after 2 PM on training days.",
    ],
    tooLow:
      "Insufficient sleep increases hunger hormones, reduces performance, and slows recovery.",
    tooHigh:
      "Occasional long sleep may reflect recovery needs; persistent oversleep can signal illness or overtraining.",
    personalizedNote:
      sleepHours > 0
        ? `You logged ${sleepHours}h today. Sleep score in daily fitness score uses ${target}h as 100%.`
        : "No sleep logged today — add a check-in on Progress to include sleep in your score.",
  };
}

export function buildScoreExplanation(detailed: DetailedDailyScore): MetricExplanation {
  const rows = detailed.components.map((c) => ({
    label: `${c.label} (${c.weightLabel})`,
    value: `${c.earnedPoints}/${c.maxPoints} pts`,
    highlight: c.earnedPoints < c.maxPoints * 0.5,
  }));
  rows.push({ label: "Total", value: `${detailed.total}/100`, highlight: true });

  return {
    headline: "How is my Daily Score calculated?",
    whatItMeans:
      "Your Daily Score (0–100) reflects how completely you hit today's movement, nutrition, hydration, activity burn, and sleep targets.",
    whyItMatters:
      "Transparent scoring helps you prioritize the habits that move your fitness forward each day.",
    howCalculated:
      "Each pillar contributes a weighted portion of 100 points based on progress toward today's goals.",
    influences: ["Step goal progress", "Calorie logging vs goal", "Water intake", "Activity calories", "Sleep logged"],
    improveTips: detailed.components
      .filter((c) => c.earnedPoints < c.maxPoints)
      .map((c) => `Improve ${c.label}: ${c.current}/${c.goal} (${c.earnedPoints}/${c.maxPoints} pts)`)
      .slice(0, 4),
    calculationRows: rows,
  };
}

export function buildWeightExplanation(
  currentKg: number | null,
  goalKg: number | null,
  fitnessGoal: string | null | undefined,
): MetricExplanation {
  return {
    headline: "How should I interpret my weight trend?",
    whatItMeans:
      "Body weight fluctuates daily from water, food, and training. Trends over weeks matter more than single readings.",
    whyItMatters:
      "Tracking trend helps validate whether your nutrition and training plan is working.",
    howCalculated:
      "We plot manual scale entries and InBody scans. Weekly change rate is averaged from logged data.",
    influences: ["Sodium intake", "Training inflammation", "Sleep", "Calorie balance", "Hydration"],
    improveTips: [
      "Weigh at the same time of day, ideally morning after bathroom.",
      "Target 0.25–0.75 kg/week loss for fat loss; 0.25–0.5 kg/week gain for lean bulk.",
      "Use 7-day averages instead of daily spikes.",
    ],
    tooLow:
      "Losing weight too quickly may sacrifice muscle and recovery — adjust calories gradually.",
    tooHigh:
      "Rapid weight gain often includes excess fat — prioritize protein and progressive training.",
    personalizedNote:
      currentKg != null
        ? `Current: ${currentKg.toFixed(1)} kg${goalKg ? ` · Goal: ${goalKg.toFixed(1)} kg (${fitnessGoal ?? "your plan"})` : ""}`
        : "Log your first weight entry to start trend analysis.",
  };
}
