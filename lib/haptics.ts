import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const enabled = Platform.OS !== "web";

export async function hapticSelection() {
  if (!enabled) return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // ignore — simulators may not support haptics
  }
}

export async function hapticLight() {
  if (!enabled) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export async function hapticMedium() {
  if (!enabled) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

export async function hapticHeavy() {
  if (!enabled) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

export async function hapticSuccess() {
  if (!enabled) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

export async function hapticWarning() {
  if (!enabled) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

export async function hapticError() {
  if (!enabled) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

/** Wrap an onPress handler with light haptic feedback */
export function withHaptic<T extends (...args: any[]) => void>(
  fn: T,
  style: "selection" | "light" | "medium" | "success" = "light",
): T {
  return ((...args: Parameters<T>) => {
    const fire =
      style === "selection"
        ? hapticSelection
        : style === "medium"
          ? hapticMedium
          : style === "success"
            ? hapticSuccess
            : hapticLight;
    void fire();
    fn(...args);
  }) as T;
}
