import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/lib/api";
import type { ActivitySummary } from "@/context/FitnessContext";

const SYNC_QUEUE_KEY = "@fittrack_activity_sync_queue";

export interface ActivitySyncPayload {
  summaryDate: string;
  steps: number;
  walkingMinutes: number;
  runningMinutes: number;
  caloriesBurned: number;
  distanceMeters: number;
  source?: string;
  rawPayload?: Record<string, unknown>;
}

function summaryToPayload(
  summary: ActivitySummary,
  summaryDate: string,
  source: "phone_sensors" | "manual" = "phone_sensors",
): ActivitySyncPayload {
  return {
    summaryDate,
    steps: summary.steps,
    walkingMinutes: summary.walkingMinutes,
    runningMinutes: summary.runningMinutes,
    caloriesBurned: summary.caloriesBurned,
    distanceMeters: Math.round(summary.distanceKm * 1000),
    source,
    rawPayload: {
      syncedFrom: "mobile",
      distanceKm: summary.distanceKm,
    },
  };
}

async function postActivitySync(token: string, payload: ActivitySyncPayload): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/progress/activity/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = "Failed to sync activity";
    try {
      const body = JSON.parse(text) as { error?: string };
      message = body.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}

async function loadSyncQueue(): Promise<ActivitySyncPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivitySyncPayload[];
  } catch {
    return [];
  }
}

async function saveSyncQueue(queue: ActivitySyncPayload[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueFailedSync(payload: ActivitySyncPayload): Promise<void> {
  const queue = await loadSyncQueue();
  const idx = queue.findIndex((q) => q.summaryDate === payload.summaryDate);
  if (idx >= 0) queue[idx] = payload;
  else queue.push(payload);
  await saveSyncQueue(queue);
}

export async function flushSyncQueue(token: string): Promise<void> {
  const queue = await loadSyncQueue();
  if (!queue.length) return;

  const remaining: ActivitySyncPayload[] = [];
  for (const payload of queue) {
    try {
      await postActivitySync(token, payload);
    } catch {
      remaining.push(payload);
    }
  }
  await saveSyncQueue(remaining);
}

export async function syncActivityToServer(
  token: string,
  summary: ActivitySummary,
  summaryDate: string,
  source: "phone_sensors" | "manual" = "phone_sensors",
): Promise<void> {
  const payload = summaryToPayload(summary, summaryDate, source);
  try {
    await postActivitySync(token, payload);
    await flushSyncQueue(token);
  } catch (err) {
    await enqueueFailedSync(payload);
    throw err;
  }
}
