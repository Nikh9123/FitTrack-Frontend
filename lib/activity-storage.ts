import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@fittrack_daily_activity";

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

export function getTodayDateKey(now = new Date()): string {
  return now.toISOString().split("T")[0];
}

export function startOfDay(now = new Date()): Date {
  const d = new Date(now);
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
