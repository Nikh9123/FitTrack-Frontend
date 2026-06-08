import {
  getDevDateOffsetDays,
  getTodayDateKey,
  getWeekdayName,
  setDevDateOffsetDays,
} from "@/lib/activity-storage";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

export { getWeekdayName };

/** Milliseconds until the next local midnight (+ small buffer). */
export function msUntilNextMidnight(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 1, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

const dayChangeSubscribers = new Set<() => void>();

function notifyDayChangeSubscribers() {
  dayChangeSubscribers.forEach((fn) => fn());
}

/**
 * Dev-only: advance the app’s notion of “today” by one day and fire all daily-refresh handlers.
 * Use Profile → “Simulate Next Day” to test without changing the device clock.
 */
export function advanceDevDayForTesting(): void {
  if (!__DEV__) return;
  setDevDateOffsetDays(getDevDateOffsetDays() + 1);
  notifyDayChangeSubscribers();
}

/** Dev-only: restore real calendar date and re-run daily refresh. */
export function resetDevDateOverride(): void {
  if (!__DEV__) return;
  setDevDateOffsetDays(0);
  notifyDayChangeSubscribers();
}

export function getDailyRefreshDebugInfo() {
  return {
    effectiveDate: getTodayDateKey(),
    weekday: getWeekdayName(),
    offsetDays: getDevDateOffsetDays(),
  };
}

/**
 * Calls `onNewDay` when the local calendar date rolls over — at midnight,
 * on app foreground, and on a periodic check while the app stays open.
 */
export function useDailyRefresh(onNewDay: () => void) {
  const dateRef = useRef(getTodayDateKey());
  const callbackRef = useRef(onNewDay);
  callbackRef.current = onNewDay;

  const checkDay = useCallback(() => {
    const today = getTodayDateKey();
    if (dateRef.current === today) return;
    dateRef.current = today;
    callbackRef.current();
  }, []);

  useEffect(() => {
    checkDay();
    dayChangeSubscribers.add(checkDay);

    const interval = setInterval(checkDay, 60_000);
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkDay();
    });

    let midnightTimer: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      midnightTimer = setTimeout(() => {
        checkDay();
        scheduleMidnight();
      }, msUntilNextMidnight());
    };
    scheduleMidnight();

    return () => {
      dayChangeSubscribers.delete(checkDay);
      clearInterval(interval);
      clearTimeout(midnightTimer);
      appSub.remove();
    };
  }, [checkDay]);
}
