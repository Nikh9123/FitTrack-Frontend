import { getApiBaseUrl } from "@/lib/api";
import type { ActivitySummary } from "@/context/FitnessContext";

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

export async function syncActivityToServer(
  token: string,
  summary: ActivitySummary,
  summaryDate: string,
): Promise<void> {
  const payload: ActivitySyncPayload = {
    summaryDate,
    steps: summary.steps,
    walkingMinutes: summary.walkingMinutes,
    runningMinutes: summary.runningMinutes,
    caloriesBurned: summary.caloriesBurned,
    distanceMeters: Math.round(summary.distanceKm * 1000),
    source: "phone_sensors",
    rawPayload: {
      syncedFrom: "mobile",
      distanceKm: summary.distanceKm,
    },
  };

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
