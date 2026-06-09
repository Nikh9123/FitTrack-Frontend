import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "@/constants/branding";

const STORAGE_KEY = STORAGE_KEYS.dailyActivity;

/** Dev-only: shift "today" forward N days to test daily refresh without waiting for midnight. */
let devDateOffsetDays = 0;

export function getDevDateOffsetDays(): number {
  return __DEV__ ? devDateOffsetDays : 0;
}

export function setDevDateOffsetDays(days: number): void {
  if (!__DEV__) return;
  devDateOffsetDays = days;
}

export function getEffectiveDate(now = new Date()): Date {
  const d = new Date(now);
  if (__DEV__ && devDateOffsetDays !== 0) {
    d.setDate(d.getDate() + devDateOffsetDays);
  }
  return d;
}

export function getTodayDateKey(now = new Date()): string {
  const d = getEffectiveDate(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getWeekdayName(now = new Date()): string {
  return getEffectiveDate(now).toLocaleDateString("en-US", { weekday: "long" });
}

export interface StoredDailyActivity {
  date: string;
  steps: number;
  walkingMinutes: number;
  runningMinutes: number;
  caloriesBurned: number;
  distanceMeters: number;
  source: "pedometer" | "accelerometer" | "manual";
  lastUpdated: string;
}

export function startOfDay(now = new Date()): Date {
  const d = getEffectiveDate(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function emptyDailyActivity(date = getTodayDateKey()): StoredDailyActivity {
  return {
    date,
    steps: 0,
    walkingMinutes: 0,
    runningMinutes: 0,
    caloriesBurned: 0,
    distanceMeters: 0,
    source: "pedometer",
    lastUpdated: new Date().toISOString(),
  };
}

export async function loadDailyActivity(): Promise<StoredDailyActivity> {
  const today = getTodayDateKey();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDailyActivity(today);

    const parsed = JSON.parse(raw) as StoredDailyActivity;
    if (parsed.date !== today) {
      return emptyDailyActivity(today);
    }
    return parsed;
  } catch {
    return emptyDailyActivity(today);
  }
}

export async function saveDailyActivity(activity: StoredDailyActivity): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(activity));
}

export async function clearDailyActivity(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
