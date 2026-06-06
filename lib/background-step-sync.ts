import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const BACKGROUND_STEP_SYNC_TASK = "fittrack-background-step-sync";

let taskDefined = false;

function ensureTaskDefined() {
  if (taskDefined) return;
  taskDefined = true;

  TaskManager.defineTask(BACKGROUND_STEP_SYNC_TASK, async () => {
    try {
      const { refreshStepCount } = await import("@/lib/step-tracker");
      await refreshStepCount();
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/** Background fetch is not supported in Expo Go — skip silently. */
function canUseBackgroundFetch(): boolean {
  if (Platform.OS === "web") return false;
  return Constants.appOwnership !== "expo";
}

export async function registerBackgroundStepSync(): Promise<void> {
  if (!canUseBackgroundFetch()) return;

  try {
    ensureTaskDefined();
    const { refreshStepCount } = await import("@/lib/step-tracker");

    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_SYNC_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_SYNC_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    await refreshStepCount();
  } catch {
    // Expo Go / missing native module — foreground tracking still works
  }
}

export async function unregisterBackgroundStepSync(): Promise<void> {
  if (!canUseBackgroundFetch()) return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_STEP_SYNC_TASK);
    }
  } catch {
    // ignore
  }
}
