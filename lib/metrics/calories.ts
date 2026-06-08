import type { User } from "@/context/AuthContext";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface CalorieBreakdown {
  bmr: number;
  activityMultiplier: number;
  activityLevel: ActivityLevel;
  maintenance: number;
  goalAdjustment: number;
  finalGoal: number;
  fitnessGoal: string;
  profileUsed: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: "male" | "female";
  };
}

/** Mifflin–St Jeor BMR estimate using available profile fields */
export function estimateCalorieBreakdown(
  user: User | null,
  dailyCalorieGoal: number,
  options?: { age?: number; gender?: "male" | "female"; activityLevel?: ActivityLevel },
): CalorieBreakdown {
  const weightKg = parseFloat(user?.weightKg ?? "70") || 70;
  const heightCm = parseFloat(user?.heightCm ?? "170") || 170;
  const age = options?.age ?? 30;
  const gender = options?.gender ?? "male";
  const activityLevel = options?.activityLevel ?? "moderate";
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];

  const bmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const maintenance = Math.round(bmr * multiplier);
  const goalAdjustment = dailyCalorieGoal - maintenance;
  const fitnessGoal = user?.fitnessGoal ?? "general fitness";

  return {
    bmr: Math.round(bmr),
    activityMultiplier: multiplier,
    activityLevel,
    maintenance,
    goalAdjustment,
    finalGoal: dailyCalorieGoal,
    fitnessGoal,
    profileUsed: { weightKg, heightCm, age, gender },
  };
}

export function estimateWaterGoalMl(weightKg: number, activityLevel: ActivityLevel = "moderate"): number {
  const base = weightKg * 35;
  const activityBonus = activityLevel === "active" || activityLevel === "very_active" ? 500 : 0;
  return Math.round(base + activityBonus);
}

export function stepsCaloriesBurned(steps: number, weightKg = 70): number {
  // ~0.04 kcal per step per kg baseline (approximation)
  return Math.round(steps * 0.04 * (weightKg / 70));
}
