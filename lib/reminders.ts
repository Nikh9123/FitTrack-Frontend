import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const PREFS_KEY = "@fittrack_reminder_prefs";

export type ReminderKey = "weight" | "food" | "exercise" | "steps";

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface ReminderPref {
  enabled: boolean;
  time: ReminderTime;
  weekday?: number;
}

export interface ReminderPrefs {
  weight: ReminderPref;
  food: ReminderPref;
  exercise: ReminderPref;
  steps: ReminderPref;
}

const REMINDER_META: Record<
  ReminderKey,
  { id: string; title: string; body: string; route: string }
> = {
  weight: {
    id: "reminder-weight",
    title: "Log your weight",
    body: "Weekly check-in — track your progress.",
    route: "/(tabs)",
  },
  food: {
    id: "reminder-food",
    title: "Log your meals",
    body: "Keep your nutrition journal up to date.",
    route: "/(tabs)/diet",
  },
  exercise: {
    id: "reminder-exercise",
    title: "Time to train",
    body: "Log today's workout or start your session.",
    route: "/(tabs)/workout",
  },
  steps: {
    id: "reminder-steps",
    title: "Check your steps",
    body: "Review today's activity in your journal.",
    route: "/(tabs)/progress",
  },
};

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  weight: { enabled: true, time: { hour: 8, minute: 0 }, weekday: 1 },
  food: { enabled: true, time: { hour: 20, minute: 0 } },
  exercise: { enabled: true, time: { hour: 18, minute: 0 } },
  steps: { enabled: true, time: { hour: 21, minute: 0 } },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_REMINDER_PREFS;
    return { ...DEFAULT_REMINDER_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_PREFS;
  }
}

export async function saveReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("habit-reminders", {
    name: "Habit Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
  });
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleAllReminders(prefs: ReminderPrefs): Promise<void> {
  if (Platform.OS === "web") return;

  await ensureAndroidChannel();
  await cancelAllReminders();

  const keys: ReminderKey[] = ["weight", "food", "exercise", "steps"];
  for (const key of keys) {
    const pref = prefs[key];
    if (!pref.enabled) continue;

    const meta = REMINDER_META[key];
    const trigger =
      key === "weight"
        ? {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: pref.weekday ?? 1,
            hour: pref.time.hour,
            minute: pref.time.minute,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: pref.time.hour,
            minute: pref.time.minute,
          };

    await Notifications.scheduleNotificationAsync({
      identifier: meta.id,
      content: {
        title: meta.title,
        body: meta.body,
        data: { route: meta.route },
        ...(Platform.OS === "android" ? { channelId: "habit-reminders" } : {}),
      },
      trigger: trigger as Notifications.NotificationTriggerInput,
    });
  }
}

export async function initRemindersOnLaunch(): Promise<void> {
  if (Platform.OS === "web") return;
  const prefs = await loadReminderPrefs();
  const anyEnabled = Object.values(prefs).some((p) => p.enabled);
  if (!anyEnabled) return;

  const granted = await requestReminderPermission();
  if (granted) {
    await scheduleAllReminders(prefs);
  }
}

export function formatReminderTime(time: ReminderTime): string {
  const h = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? "AM" : "PM";
  const m = String(time.minute).padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

export function adjustTime(time: ReminderTime, deltaMinutes: number): ReminderTime {
  const total = time.hour * 60 + time.minute + deltaMinutes;
  const normalized = ((total % 1440) + 1440) % 1440;
  return { hour: Math.floor(normalized / 60), minute: normalized % 60 };
}
