import { getApiBaseUrl } from "@/lib/api";
import { Platform } from "react-native";

export interface FoodItemDto {
  id: string;
  name: string;
  category: string | null;
  servingDescription: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DietLogDto {
  id: string;
  mealTime: string;
  name: string;
  foodItemId: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
  notes: string | null;
}

export interface DietSummaryDto {
  date: string;
  logs: DietLogDto[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  calorieGoal: number;
  proteinGoalG: number;
  carbsGoalG: number;
  fatGoalG: number;
}

export interface WaterSummaryDto {
  date: string;
  totalMl: number;
  glasses: number;
  goalMl: number;
  goalGlasses: number;
  logs: Array<{ id: string; amountMl: number; loggedAt: string }>;
}

export interface NutritionGoalsDto {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterGoalMl: number;
  waterGoalGlasses: number;
}

export interface MealVisionItemDto {
  name: string;
  servingDescription: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number;
}

export interface MealVisionResultDto {
  items: MealVisionItemDto[];
  notes: string;
  source: "groq" | "unavailable";
}

export type DietPlanGoal = "weight_loss" | "maintenance" | "muscle_gain" | "fat_loss";
export type DietPlanDuration = "daily" | "weekly";
export type DietPlanRegion =
  | "south_indian"
  | "north_indian"
  | "west_indian"
  | "east_indian"
  | "pan_indian";
export type DietPlanSource = "ai" | "trainer" | "doctor";

export interface DietPlanListItemDto {
  id: string;
  title: string;
  goal: string;
  status: string;
  source: DietPlanSource;
  summary: string | null;
  assignedBy: string | null;
  assignerName: string | null;
  startDate: string;
  createdAt: string;
}

export interface DietPlanMealItemDto {
  id: string;
  foodItemId: string;
  foodName: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string | null;
}

export interface DietPlanMealDto {
  id: string;
  mealTime: string;
  name: string | null;
  notes: string | null;
  orderIndex: number;
  dayName?: string | null;
  dayIndex?: number | null;
  items: DietPlanMealItemDto[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export interface DietPlanDaySectionDto {
  dayName: string;
  dayIndex: number;
  meals: DietPlanMealDto[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export interface DietPlanPersonalizationDto {
  usedInbody: boolean;
  usedWeightLogs: boolean;
  usedNutritionLogs: boolean;
  usedActivity: boolean;
  currentWeightKg: number | null;
  weightTrendKg30d: number | null;
  bodyFatPercent: string | null;
  bmr: string | null;
  avgDailyCalories7d: number | null;
  avgSteps7d: number | null;
}

export interface DietPlanDto {
  id: string;
  title: string;
  goal: string;
  status: string;
  source: DietPlanSource;
  duration: DietPlanDuration;
  region: DietPlanRegion | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  summary: string | null;
  tips: string[];
  personalization: DietPlanPersonalizationDto | null;
  assignedBy: string | null;
  assignerName: string | null;
  dailyTargets: { calories: number; proteinG: number; carbsG: number; fatG: number };
  meals: DietPlanMealDto[];
  daySections: DietPlanDaySectionDto[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  createdAt: string;
}

async function apiFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function searchFoods(token: string, query: string) {
  const params = new URLSearchParams({ q: query, limit: "30" });
  const data = await apiFetch<{ items: FoodItemDto[] }>(token, `/food/search?${params}`);
  return data.items;
}

export async function analyzeMealPhotoApi(
  token: string,
  uri: string,
  mimeType: string,
  fileName: string,
): Promise<MealVisionResultDto> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("photo", blob, fileName);
  } else {
    formData.append("photo", { uri, type: mimeType, name: fileName } as any);
  }

  const response = await fetch(`${getApiBaseUrl()}/food/analyze-photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Meal analysis failed (${response.status})`);
  }

  return body as MealVisionResultDto;
}

export async function fetchDietSummary(token: string, date: string) {
  return apiFetch<DietSummaryDto>(token, `/diet/summary?date=${encodeURIComponent(date)}`);
}

export async function fetchDietHistory(token: string, days = 7) {
  return apiFetch<{ history: Array<{ date: string; calories: number }> }>(
    token,
    `/diet/history?days=${days}`,
  );
}

export async function logMealApi(
  token: string,
  payload: {
    logDate: string;
    mealTime: "breakfast" | "lunch" | "dinner" | "snack";
    foodItemId?: string;
    customFood?: {
      name: string;
      caloriesKcal: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    };
    quantity?: string;
    servings?: number;
  },
) {
  return apiFetch<{ summary: DietSummaryDto }>(token, "/diet/logs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteMealApi(token: string, logId: string, date: string) {
  return apiFetch<{ summary: DietSummaryDto }>(
    token,
    `/diet/logs/${logId}?date=${encodeURIComponent(date)}`,
    { method: "DELETE" },
  );
}

export async function fetchWaterSummary(token: string, date: string) {
  return apiFetch<WaterSummaryDto>(token, `/hydration/summary?date=${encodeURIComponent(date)}`);
}

export async function logWaterApi(token: string, logDate: string, glasses = 1) {
  return apiFetch<{ summary: WaterSummaryDto }>(token, "/hydration/log", {
    method: "POST",
    body: JSON.stringify({ logDate, glasses }),
  });
}

export async function fetchNutritionGoals(token: string) {
  return apiFetch<NutritionGoalsDto>(token, "/nutrition/goals");
}

export async function logWeightApi(token: string, weightKg: number, notes?: string) {
  return apiFetch<{ success: boolean }>(token, "/progress/weight", {
    method: "POST",
    body: JSON.stringify({ weightKg, notes }),
  });
}

export async function fetchTodayCheckin(token: string) {
  return apiFetch<{ checkin: { sleepHours?: string | null } | null }>(token, "/progress/checkin/today");
}

export async function fetchActiveDietPlan(token: string) {
  const data = await apiFetch<{ plan: DietPlanDto | null }>(token, "/diet/plans/active");
  return data.plan;
}

export async function fetchDietPlans(token: string) {
  const data = await apiFetch<{ plans: DietPlanListItemDto[] }>(token, "/diet/plans");
  return data.plans;
}

export async function fetchDietPlanById(token: string, planId: string) {
  const data = await apiFetch<{ plan: DietPlanDto }>(token, `/diet/plans/${planId}`);
  return data.plan;
}

export async function generateAiDietPlanApi(
  token: string,
  payload?: {
    goal?: DietPlanGoal;
    duration?: DietPlanDuration;
    region?: DietPlanRegion;
    notes?: string;
    activate?: boolean;
  },
) {
  const data = await apiFetch<{ success: boolean; plan: DietPlanDto }>(token, "/diet/plans/generate", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
  return data.plan;
}

export async function activateDietPlanApi(token: string, planId: string) {
  const data = await apiFetch<{ success: boolean; plan: DietPlanDto }>(
    token,
    `/diet/plans/${planId}/activate`,
    { method: "PATCH" },
  );
  return data.plan;
}

export async function assignDietPlanApi(
  token: string,
  payload: {
    userId?: string;
    title: string;
    goal: DietPlanGoal;
    summary?: string;
    professionalNotes?: string;
    source?: "trainer" | "doctor";
    dailyTargets: { calories: number; proteinG: number; carbsG: number; fatG: number };
    meals: Array<{
      mealTime: "breakfast" | "lunch" | "dinner" | "snack";
      name: string;
      notes?: string;
      items: Array<{
        foodName: string;
        quantity: string;
        caloriesKcal: number;
        proteinG: number;
        carbsG: number;
        fatG: number;
      }>;
    }>;
    tips?: string[];
    activate?: boolean;
  },
) {
  const data = await apiFetch<{ success: boolean; plan: DietPlanDto }>(token, "/diet/plans/assign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.plan;
}
