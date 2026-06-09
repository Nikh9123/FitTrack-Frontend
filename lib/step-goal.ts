import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/lib/api";

import { STORAGE_KEYS } from "@/constants/branding";

export const STEP_GOAL_STORAGE_KEY = STORAGE_KEYS.stepGoal;
export const DEFAULT_STEP_GOAL = 10000;

export function clampStepGoal(value: number): number {
  return Math.max(1000, Math.min(50000, Math.round(value)));
}

export async function loadStepGoalFromStorage(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STEP_GOAL_STORAGE_KEY);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed) && parsed > 0) return clampStepGoal(parsed);
    }
  } catch {
    // ignore
  }
  return DEFAULT_STEP_GOAL;
}

export async function saveStepGoalToStorage(goal: number): Promise<number> {
  const clamped = clampStepGoal(goal);
  await AsyncStorage.setItem(STEP_GOAL_STORAGE_KEY, String(clamped));
  return clamped;
}

export async function syncStepGoalToProfile(token: string, goal: number): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/auth/me`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { stepGoal: goal } }),
    });
  } catch {
    // profile preferences column may not exist yet — local storage is source of truth
  }
}
