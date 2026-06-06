import { Accelerometer, Pedometer } from "expo-sensors";
import { Platform } from "react-native";
import {
  deriveActivityMetrics,
  mergeCadenceIntoMetrics,
  type DerivedActivityMetrics,
} from "@/lib/activity-metrics";
import {
  emptyDailyActivity,
  getTodayDateKey,
  loadDailyActivity,
  saveDailyActivity,
  startOfDay,
  type StoredDailyActivity,
} from "@/lib/activity-storage";

export type StepTrackingStatus =
  | "idle"
  | "active"
  | "unavailable"
  | "permission_denied"
  | "error";

export type StepTrackingSnapshot = StoredDailyActivity & DerivedActivityMetrics;

export type StepUpdateListener = (snapshot: StepTrackingSnapshot) => void;

let pedometerSubscription: { remove: () => void } | null = null;
let accelerometerSubscription: { remove: () => void } | null = null;
let sessionStepDelta = 0;
let baselineSteps = 0;
let usingAccelerometerFallback = false;
let lastCadenceSteps = 0;
let cadenceWindowSteps = 0;
let cadenceWindowStartedAt = Date.now();
let currentStatus: StepTrackingStatus = "idle";
let currentDateKey = getTodayDateKey();
const listeners = new Set<StepUpdateListener>();

function notify(snapshot: StepTrackingSnapshot) {
  listeners.forEach((listener) => listener(snapshot));
}

function toSnapshot(stored: StoredDailyActivity): StepTrackingSnapshot {
  const derived = mergeCadenceIntoMetrics(stored.steps, lastCadenceSteps);
  return {
    ...stored,
    ...derived,
    walkingMinutes: stored.walkingMinutes || derived.walkingMinutes,
    runningMinutes: stored.runningMinutes || derived.runningMinutes,
    caloriesBurned: stored.caloriesBurned || derived.caloriesBurned,
    distanceMeters: stored.distanceMeters || derived.distanceMeters,
    distanceKm: derived.distanceKm,
  };
}

async function persistSteps(steps: number, source: StoredDailyActivity["source"]) {
  const today = getTodayDateKey();
  if (today !== currentDateKey) {
    currentDateKey = today;
    sessionStepDelta = 0;
    baselineSteps = 0;
  }

  const derived = mergeCadenceIntoMetrics(steps, lastCadenceSteps);
  const stored: StoredDailyActivity = {
    date: today,
    steps: derived.steps,
    walkingMinutes: derived.walkingMinutes,
    runningMinutes: derived.runningMinutes,
    caloriesBurned: derived.caloriesBurned,
    distanceMeters: derived.distanceMeters,
    source,
    lastUpdated: new Date().toISOString(),
  };
  await saveDailyActivity(stored);
  const snapshot = toSnapshot(stored);
  notify(snapshot);
  return snapshot;
}

export function getStepTrackingStatus(): StepTrackingStatus {
  return currentStatus;
}

export function subscribeStepUpdates(listener: StepUpdateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function requestStepPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const permission = await Pedometer.requestPermissionsAsync();
    return permission.granted;
  } catch {
    return false;
  }
}

async function readPedometerStepsToday(requestPermission = false): Promise<number | null> {
  const available = await Pedometer.isAvailableAsync();
  if (!available) return null;

  let permission = await Pedometer.getPermissionsAsync();
  if (!permission.granted && requestPermission) {
    permission = await Pedometer.requestPermissionsAsync();
  }
  if (!permission.granted) {
    if (requestPermission) {
      currentStatus = "permission_denied";
    }
    return null;
  }

  const start = startOfDay();
  const end = new Date();
  const result = await Pedometer.getStepCountAsync(start, end);
  return Math.max(0, result.steps);
}

function trackCadence(delta: number) {
  cadenceWindowSteps += delta;
  const elapsedMinutes = (Date.now() - cadenceWindowStartedAt) / 60000;
  if (elapsedMinutes >= 1) {
    lastCadenceSteps = Math.round(cadenceWindowSteps / elapsedMinutes);
    cadenceWindowSteps = 0;
    cadenceWindowStartedAt = Date.now();
  }
}

async function applyStepDelta(delta: number, source: StoredDailyActivity["source"]) {
  if (delta <= 0) return null;
  trackCadence(delta);
  sessionStepDelta += delta;
  const total = Math.max(baselineSteps + sessionStepDelta, baselineSteps);
  return persistSteps(total, source);
}

function startAccelerometerFallback() {
  if (accelerometerSubscription || Platform.OS === "web") return;

  usingAccelerometerFallback = true;
  let lastMagnitude = 0;
  let aboveThreshold = false;
  const threshold = 1.12;

  Accelerometer.setUpdateInterval(100);
  accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const peaked = lastMagnitude < threshold && magnitude >= threshold;
    lastMagnitude = magnitude;

    if (peaked && !aboveThreshold) {
      aboveThreshold = true;
      void applyStepDelta(1, "accelerometer");
    } else if (magnitude < threshold) {
      aboveThreshold = false;
    }
  });
}

let lastWatchTotal = 0;

function startPedometerWatch() {
  if (pedometerSubscription || Platform.OS === "web") return;

  lastWatchTotal = 0;
  pedometerSubscription = Pedometer.watchStepCount((event) => {
    const delta = Math.max(0, event.steps - lastWatchTotal);
    lastWatchTotal = event.steps;
    if (delta > 0) {
      void applyStepDelta(delta, "pedometer");
    }
  });
}

export async function refreshStepCount(requestPermission = false): Promise<StepTrackingSnapshot | null> {
  if (Platform.OS === "web") {
    currentStatus = "unavailable";
    return null;
  }

  try {
    const today = getTodayDateKey();
    if (today !== currentDateKey) {
      currentDateKey = today;
      sessionStepDelta = 0;
      baselineSteps = 0;
    }

    const osSteps = await readPedometerStepsToday(requestPermission);
    if (osSteps !== null) {
      baselineSteps = osSteps;
      sessionStepDelta = 0;
      currentStatus = currentStatus === "permission_denied" ? "permission_denied" : "active";
      return persistSteps(osSteps, "pedometer");
    }

    const stored = await loadDailyActivity();
    if (stored.steps > 0) {
      baselineSteps = stored.steps;
      currentStatus = usingAccelerometerFallback ? "active" : "unavailable";
      return toSnapshot(stored);
    }

    currentStatus = "unavailable";
    return null;
  } catch {
    currentStatus = "error";
    return null;
  }
}

export async function startStepTracking(options?: {
  requestPermission?: boolean;
}): Promise<StepTrackingStatus> {
  const requestPermission = options?.requestPermission ?? false;
  if (Platform.OS === "web") {
    currentStatus = "unavailable";
    return currentStatus;
  }

  try {
    const stored = await loadDailyActivity();
    currentDateKey = stored.date;

    const osSteps = await readPedometerStepsToday(requestPermission);
    if (osSteps !== null) {
      baselineSteps = osSteps;
      sessionStepDelta = 0;
      startPedometerWatch();
      currentStatus = "active";
      await persistSteps(osSteps, "pedometer");
      return currentStatus;
    }

    if (!requestPermission) {
      baselineSteps = stored.steps;
      if (stored.steps > 0) {
        notify(toSnapshot(stored));
        currentStatus = "active";
      } else {
        currentStatus = "idle";
      }
      return currentStatus;
    }

    if (currentStatus === "permission_denied") {
      return currentStatus;
    }

    baselineSteps = stored.steps;
    sessionStepDelta = 0;
    startAccelerometerFallback();
    currentStatus = "active";
    if (stored.steps === 0) {
      await persistSteps(0, "accelerometer");
    } else {
      notify(toSnapshot(stored));
    }
    return currentStatus;
  } catch {
    currentStatus = "error";
    return currentStatus;
  }
}

export async function stopStepTracking(): Promise<void> {
  pedometerSubscription?.remove();
  pedometerSubscription = null;
  accelerometerSubscription?.remove();
  accelerometerSubscription = null;
  if (currentStatus === "active") {
    currentStatus = "idle";
  }
}

export async function getStepTrackingSnapshot(): Promise<StepTrackingSnapshot> {
  const stored = await loadDailyActivity();
  if (stored.date !== getTodayDateKey()) {
    return toSnapshot(emptyDailyActivity());
  }
  return toSnapshot(stored);
}

export function handleAppForeground(): Promise<StepTrackingSnapshot | null> {
  return refreshStepCount();
}

export async function getStepsForDate(dateKey: string): Promise<number | null> {
  if (Platform.OS === "web") return null;

  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return null;

    const permission = await Pedometer.getPermissionsAsync();
    if (!permission.granted) return null;

    const [y, m, d] = dateKey.split("-").map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    const result = await Pedometer.getStepCountAsync(start, end);
    return Math.max(0, result.steps);
  } catch {
    return null;
  }
}

export async function backfillRecentDays(days = 7): Promise<
  Array<{ date: string; steps: number; snapshot: StepTrackingSnapshot }>
> {
  if (Platform.OS === "web") return [];

  const results: Array<{ date: string; steps: number; snapshot: StepTrackingSnapshot }> = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = getTodayDateKey(d);
    const steps = await getStepsForDate(dateKey);
    if (steps == null || steps === 0) continue;

    const derived = mergeCadenceIntoMetrics(steps, 0);
    const snapshot: StepTrackingSnapshot = {
      date: dateKey,
      steps: derived.steps,
      walkingMinutes: derived.walkingMinutes,
      runningMinutes: derived.runningMinutes,
      activeMinutes: derived.activeMinutes,
      caloriesBurned: derived.caloriesBurned,
      distanceMeters: derived.distanceMeters,
      distanceKm: derived.distanceKm,
      source: "pedometer",
      lastUpdated: new Date().toISOString(),
    };
    results.push({ date: dateKey, steps, snapshot });
  }

  return results;
}