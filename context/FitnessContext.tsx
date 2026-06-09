import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, Platform } from "react-native";
import { getStorageItem, setStorageItem } from "@/lib/storage-migrate";
import { useAuth } from "@/context/AuthContext";
import { flushSyncQueue, syncActivityToServer } from "@/lib/activity-sync";
import { getTodayDateKey } from "@/lib/activity-storage";
import { useDailyRefresh } from "@/lib/daily-refresh";
import { registerBackgroundStepSync } from "@/lib/background-step-sync";
import {
  deleteMealApi,
  fetchDietHistory,
  fetchDietSummary,
  fetchNutritionGoals,
  fetchTodayCheckin,
  fetchWaterSummary,
  logMealApi,
  logWaterApi,
  logWeightApi,
  type DietLogDto,
} from "@/lib/nutrition-api";
import { fetchWorkoutStreak } from "@/lib/home-api";
import {
  loadStepGoalFromStorage,
  saveStepGoalToStorage,
  syncStepGoalToProfile,
  DEFAULT_STEP_GOAL,
} from "@/lib/step-goal";
import {
  backfillRecentDays,
  getStepTrackingSnapshot,
  handleAppForeground,
  logManualSteps as logManualStepsTracker,
  refreshStepCount,
  requestStepPermissions,
  startStepTracking,
  stopStepTracking,
  subscribeStepUpdates,
  type StepTrackingSnapshot,
  type StepTrackingStatus,
} from "@/lib/step-tracker";

export interface WorkoutSet {
  reps: number;
  weight: number;
  done: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  category: string;
}

export interface Workout {
  id: string;
  name: string;
  date: string;
  duration: number;
  exercises: Exercise[];
  calories: number;
}

export interface Meal {
  id: string;
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  foodItemId?: string;
  quantity?: string;
}

export interface DailyLog {
  date: string;
  calories: number;
  water: number;
  weight?: number;
  workouts: Workout[];
  meals: Meal[];
  steps: number;
}

export interface InBodyReport {
  id: string;
  uri: string;
  source: "camera" | "library";
  fileName: string;
  uploadedAt: string;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  type: "phone" | "fit_band" | "smartwatch";
  provider: "phone_sensors" | "google_fit" | "apple_health" | "fitbit" | "garmin";
  status: "connected" | "available";
  lastSync?: string;
}

export interface ActivitySummary {
  steps: number;
  walkingMinutes: number;
  runningMinutes: number;
  sleepHours: number;
  caloriesBurned: number;
  distanceKm: number;
}

interface FitnessContextType {
  todayLog: DailyLog;
  recentWorkouts: Workout[];
  inBodyReports: InBodyReport[];
  connectedDevices: ConnectedDevice[];
  activitySummary: ActivitySummary;
  stepTrackingStatus: StepTrackingStatus;
  stepTrackingError: string | null;
  syncError: string | null;
  lastSyncedAt: string | null;
  showStepPermissionBanner: boolean;
  nutritionError: string | null;
  isLoadingNutrition: boolean;
  calorieGoal: number;
  waterGoal: number;
  stepGoal: number;
  streak: number;
  weeklyCalories: number[];
  addWater: (glasses?: number) => Promise<void>;
  logWeight: (weight: number) => Promise<import("@/lib/achievements-api").UnlockedAchievement[]>;
  addMeal: (
    meal: Omit<Meal, "id" | "time"> & { foodItemId?: string; servings?: number },
  ) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  addWorkout: (workout: Omit<Workout, "id">) => Promise<void>;
  addInBodyReport: (report: Omit<InBodyReport, "id" | "uploadedAt">) => Promise<void>;
  connectDevice: (deviceId: string) => Promise<void>;
  enableStepTracking: () => Promise<void>;
  dismissStepPermissionBanner: () => void;
  refreshActivity: () => Promise<void>;
  refreshDailyData: () => Promise<void>;
  setStepGoal: (goal: number) => Promise<void>;
  logManualSteps: (steps: number) => Promise<void>;
  syncActivityNow: () => Promise<void>;
  bmi: number;
}

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);

function getToday() {
  return getTodayDateKey();
}

function emptyLog(date = getToday()): DailyLog {
  return {
    date,
    calories: 0,
    water: 0,
    workouts: [],
    meals: [],
    steps: 0,
  };
}

const emptyActivitySummary: ActivitySummary = {
  steps: 0,
  walkingMinutes: 0,
  runningMinutes: 0,
  sleepHours: 0,
  caloriesBurned: 0,
  distanceKm: 0,
};

const defaultDevices: ConnectedDevice[] = [
  {
    id: "phone",
    name: "Phone sensors",
    type: "phone",
    provider: "phone_sensors",
    status: "available",
  },
];

function dietLogToMeal(log: DietLogDto): Meal {
  const logged = new Date(log.loggedAt);
  const time = logged.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const mealTime = log.mealTime as Meal["type"];
  return {
    id: log.id,
    name: log.name,
    type: mealTime === "pre_workout" || mealTime === "post_workout" ? "snack" : mealTime,
    calories: log.calories,
    protein: log.protein,
    carbs: log.carbs,
    fat: log.fat,
    time,
    foodItemId: log.foodItemId,
    quantity: log.quantity || undefined,
  };
}

function snapshotToSummary(snapshot: StepTrackingSnapshot, sleepHours = 0): ActivitySummary {
  return {
    steps: snapshot.steps,
    walkingMinutes: snapshot.walkingMinutes,
    runningMinutes: snapshot.runningMinutes,
    sleepHours,
    caloriesBurned: snapshot.caloriesBurned,
    distanceKm: snapshot.distanceKm,
  };
}

export function FitnessProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [todayLog, setTodayLog] = useState<DailyLog>(emptyLog);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [inBodyReports, setInBodyReports] = useState<InBodyReport[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>(defaultDevices);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary>(emptyActivitySummary);
  const [sleepHours, setSleepHours] = useState(0);
  const [stepTrackingStatus, setStepTrackingStatus] = useState<StepTrackingStatus>("idle");
  const [stepTrackingError, setStepTrackingError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showStepPermissionBanner, setShowStepPermissionBanner] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(2200);
  const [waterGoal, setWaterGoal] = useState(8);
  const [stepGoal, setStepGoalState] = useState(DEFAULT_STEP_GOAL);
  const [streak, setStreak] = useState(0);
  const [weeklyCalories, setWeeklyCalories] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [latestWeight, setLatestWeight] = useState<number | undefined>(undefined);

  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const scheduleServerSync = useCallback((summary: ActivitySummary) => {
    if (!tokenRef.current) return;
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(() => {
      syncActivityToServer(tokenRef.current!, summary, getToday())
        .then(() => {
          setSyncError(null);
          setLastSyncedAt(new Date().toISOString());
        })
        .catch((err: Error) => setSyncError(err.message));
    }, 3000);
  }, []);

  const backfillAndSync = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      await flushSyncQueue(tokenRef.current);

      if (Platform.OS !== "web") {
        const days = await backfillRecentDays(7);
        for (const day of days) {
          const summary = snapshotToSummary(day.snapshot, sleepHours);
          await syncActivityToServer(tokenRef.current, summary, day.date).catch(() => {});
        }
      }

      const cached = await getStepTrackingSnapshot();
      if (cached.date === getTodayDateKey() && cached.steps > 0) {
        const summary = snapshotToSummary(cached, sleepHours);
        await syncActivityToServer(
          tokenRef.current,
          summary,
          cached.date,
          cached.source === "manual" ? "manual" : "phone_sensors",
        ).catch(() => {});
      }

      setLastSyncedAt(new Date().toISOString());
      setSyncError(null);
    } catch {
      // non-fatal
    }
  }, [sleepHours]);

  const applyStepSnapshot = useCallback(
    (snapshot: StepTrackingSnapshot) => {
      const summary = snapshotToSummary(snapshot, sleepHours);
      setActivitySummary(summary);
      setTodayLog((prev) => {
        const today = getToday();
        if (prev.date !== today) return { ...emptyLog(today), steps: summary.steps };
        return { ...prev, steps: summary.steps };
      });
      scheduleServerSync(summary);
    },
    [scheduleServerSync, sleepHours],
  );

  const refreshDailyData = useCallback(async () => {
    if (!tokenRef.current) return;
    setIsLoadingNutrition(true);
    setNutritionError(null);
    const today = getToday();

    setTodayLog((prev) => (prev.date !== today ? emptyLog(today) : prev));

    try {
      const [diet, water, goals, history, checkin, streakData] = await Promise.all([
        fetchDietSummary(tokenRef.current, today),
        fetchWaterSummary(tokenRef.current, today),
        fetchNutritionGoals(tokenRef.current),
        fetchDietHistory(tokenRef.current, 7),
        fetchTodayCheckin(tokenRef.current).catch(() => ({ checkin: null })),
        fetchWorkoutStreak(tokenRef.current).catch(() => ({ currentStreak: 0, totalWorkouts: 0, consistencyScore: 0 })),
      ]);

      setCalorieGoal(goals.dailyCalories);
      setWaterGoal(goals.waterGoalGlasses);

      const meals = diet.logs.map(dietLogToMeal);
      setTodayLog((prev) => ({
        date: today,
        calories: diet.totals.calories,
        water: water.glasses,
        meals,
        workouts: prev.date === today ? prev.workouts : [],
        steps: prev.date === today ? prev.steps : 0,
        weight: latestWeight ?? prev.weight,
      }));

      setWeeklyCalories(history.history.map((h) => h.calories));

      const sleep = checkin.checkin?.sleepHours
        ? parseFloat(String(checkin.checkin.sleepHours))
        : 0;
      setSleepHours(sleep);
      setActivitySummary((prev) => ({ ...prev, sleepHours: sleep }));
      setStreak(streakData.currentStreak ?? 0);

      setSyncError(null);
    } catch (err: any) {
      setNutritionError(err.message ?? "Failed to load nutrition data");
    } finally {
      setIsLoadingNutrition(false);
    }
  }, [latestWeight]);

  const refreshActivity = useCallback(async () => {
    setStepTrackingError(null);
    const snapshot = await refreshStepCount();
    if (snapshot) {
      applyStepSnapshot(snapshot);
      setStepTrackingStatus("active");
    } else {
      const cached = await getStepTrackingSnapshot();
      if (cached.steps > 0) applyStepSnapshot(cached);
    }
  }, [applyStepSnapshot]);

  const handleDayChange = useCallback(() => {
    setTodayLog(emptyLog());
    setSleepHours(0);
    setActivitySummary(emptyActivitySummary);
    void refreshActivity();
    if (tokenRef.current) void refreshDailyData();
  }, [refreshActivity, refreshDailyData]);

  useDailyRefresh(handleDayChange);

  const loadLocalOnly = useCallback(async () => {
    try {
      const storedReports = await getStorageItem("inbodyReports");
      if (storedReports) setInBodyReports(JSON.parse(storedReports) as InBodyReport[]);

      const storedDevices = await getStorageItem("connectedDevices");
      if (storedDevices) setConnectedDevices(JSON.parse(storedDevices) as ConnectedDevice[]);

      const goal = await loadStepGoalFromStorage();
      setStepGoalState(goal);

      const cached = await getStepTrackingSnapshot();
      if (cached.date === getToday() && cached.steps > 0) {
        applyStepSnapshot(cached);
      }
    } catch {
      setStepTrackingError("Failed to load saved activity data.");
    }
  }, [applyStepSnapshot]);

  useEffect(() => {
    void loadLocalOnly();
  }, [loadLocalOnly]);

  useEffect(() => {
    if (isAuthenticated && token) {
      void refreshDailyData();
      void backfillAndSync();
    } else {
      setTodayLog(emptyLog());
      setWeeklyCalories([0, 0, 0, 0, 0, 0, 0]);
      setStreak(0);
    }
  }, [isAuthenticated, token, refreshDailyData, backfillAndSync]);

  useEffect(() => {
    if (Platform.OS === "web") {
      setStepTrackingStatus("unavailable");
      return;
    }

    const unsubscribe = subscribeStepUpdates(applyStepSnapshot);

    void (async () => {
      try {
        const status = await startStepTracking({ requestPermission: false });
        setStepTrackingStatus(status);
        setStepTrackingError(null);
        if (status === "idle" || status === "permission_denied") {
          const dismissed = await getStorageItem("stepBannerDismissed");
          if (!dismissed) setShowStepPermissionBanner(true);
        }
        await refreshActivity();
        await registerBackgroundStepSync();
      } catch {
        setStepTrackingStatus("error");
      }
    })();

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void handleAppForeground().then(async (snapshot) => {
          if (snapshot) applyStepSnapshot(snapshot);
          if (tokenRef.current) await backfillAndSync();
        });
        if (tokenRef.current) void refreshDailyData();
      }
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      void stopStepTracking();
    };
  }, [applyStepSnapshot, backfillAndSync, refreshActivity, refreshDailyData]);

  const requireAuth = () => {
    const message = "Sign in to sync meals, water, and weight to your account.";
    if (Platform.OS === "web") window.alert(message);
    else Alert.alert("Sign in required", message);
    throw new Error(message);
  };

  const addWater = async (glasses = 1) => {
    if (!tokenRef.current) {
      requireAuth();
      return;
    }
    try {
      const { summary } = await logWaterApi(tokenRef.current, getToday(), glasses);
      setTodayLog((prev) => ({ ...prev, water: summary.glasses }));
      setNutritionError(null);
    } catch (err: any) {
      setNutritionError(err.message);
      throw err;
    }
  };

  const logWeight = async (weight: number) => {
    setLatestWeight(weight);
    setTodayLog((prev) => ({ ...prev, weight }));
    if (!tokenRef.current) {
      requireAuth();
      return [];
    }
    try {
      const result = await logWeightApi(tokenRef.current, weight);
      setNutritionError(null);
      return result.newlyUnlocked ?? [];
    } catch (err: any) {
      setNutritionError(err.message);
      throw err;
    }
  };

  const addMeal = async (
    meal: Omit<Meal, "id" | "time"> & { foodItemId?: string; servings?: number },
  ) => {
    if (!tokenRef.current) {
      requireAuth();
      return;
    }
    const servings = meal.servings ?? 1;
    try {
      const { summary } = await logMealApi(tokenRef.current, {
        logDate: getToday(),
        mealTime: meal.type,
        foodItemId: meal.foodItemId,
        servings,
        quantity: meal.quantity,
        customFood: meal.foodItemId
          ? undefined
          : {
              name: meal.name,
              caloriesKcal: meal.calories / servings,
              proteinG: meal.protein / servings,
              carbsG: meal.carbs / servings,
              fatG: meal.fat / servings,
            },
      });
      const meals = summary.logs.map(dietLogToMeal);
      setTodayLog((prev) => ({ ...prev, calories: summary.totals.calories, meals }));
      setWeeklyCalories((prev) => {
        const next = [...prev];
        next[next.length - 1] = summary.totals.calories;
        return next;
      });
      setNutritionError(null);
    } catch (err: any) {
      setNutritionError(err.message);
      throw err;
    }
  };

  const removeMeal = async (id: string) => {
    if (!tokenRef.current) {
      requireAuth();
      return;
    }
    try {
      const { summary } = await deleteMealApi(tokenRef.current, id, getToday());
      const meals = summary.logs.map(dietLogToMeal);
      setTodayLog((prev) => ({ ...prev, calories: summary.totals.calories, meals }));
      setNutritionError(null);
    } catch (err: any) {
      setNutritionError(err.message);
      throw err;
    }
  };

  const addWorkout = async (workout: Omit<Workout, "id">) => {
    const newWorkout: Workout = {
      ...workout,
      id: Date.now().toString(),
    };
    setRecentWorkouts((prev) => [newWorkout, ...prev].slice(0, 20));
  };

  const addInBodyReport = async (report: Omit<InBodyReport, "id" | "uploadedAt">) => {
    const newReport: InBodyReport = {
      ...report,
      id: Date.now().toString(),
      uploadedAt: new Date().toISOString(),
    };
    const updated = [newReport, ...inBodyReports];
    setInBodyReports(updated);
    await setStorageItem("inbodyReports", JSON.stringify(updated));
  };

  const setStepGoal = async (goal: number) => {
    const saved = await saveStepGoalToStorage(goal);
    setStepGoalState(saved);
    if (tokenRef.current) {
      await syncStepGoalToProfile(tokenRef.current, saved);
    }
  };

  const syncActivityNow = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      await flushSyncQueue(tokenRef.current);
      const cached = await getStepTrackingSnapshot();
      if (cached.date === getTodayDateKey() && cached.steps > 0) {
        const summary = snapshotToSummary(cached, sleepHours);
        await syncActivityToServer(
          tokenRef.current,
          summary,
          cached.date,
          cached.source === "manual" ? "manual" : "phone_sensors",
        );
        setLastSyncedAt(new Date().toISOString());
        setSyncError(null);
      }
    } catch (err: any) {
      setSyncError(err.message);
    }
  }, [sleepHours]);

  const logManualSteps = async (steps: number) => {
    const sanitized = Math.max(0, Math.round(steps));
    const snapshot = await logManualStepsTracker(sanitized);
    const summary = snapshotToSummary(snapshot, sleepHours);

    setActivitySummary(summary);
    setTodayLog((prev) => {
      const today = getToday();
      if (prev.date !== today) return { ...emptyLog(today), steps: summary.steps };
      return { ...prev, steps: summary.steps };
    });

    if (!tokenRef.current) {
      requireAuth();
      return;
    }

    try {
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      await syncActivityToServer(tokenRef.current, summary, getToday(), "manual");
      setSyncError(null);
      setLastSyncedAt(new Date().toISOString());
    } catch (err: any) {
      setSyncError(err.message);
      throw err;
    }
  };

  const connectDevice = async (deviceId: string) => {
    const now = new Date().toISOString();

    if (deviceId === "phone") {
      const granted = await requestStepPermissions();
      if (!granted) {
        const message = "Motion permission is required to track steps from your phone.";
        setStepTrackingError(message);
        if (Platform.OS !== "web") Alert.alert("Permission required", message);
        throw new Error(message);
      }
      const status = await startStepTracking({ requestPermission: true });
      setStepTrackingStatus(status);
      await refreshActivity();
    }

    const updated = connectedDevices.map((device) =>
      device.id === deviceId
        ? { ...device, status: "connected" as const, lastSync: now }
        : device,
    );
    setConnectedDevices(updated);
    await setStorageItem("connectedDevices", JSON.stringify(updated));
  };

  const enableStepTracking = async () => {
    await connectDevice("phone");
    setShowStepPermissionBanner(false);
    await setStorageItem("stepBannerDismissed", "1");
  };

  const dismissStepPermissionBanner = () => {
    setShowStepPermissionBanner(false);
    void setStorageItem("stepBannerDismissed", "1");
  };

  const bmi =
    latestWeight && latestWeight > 0
      ? parseFloat((latestWeight / (1.75 * 1.75)).toFixed(1))
      : todayLog.weight && todayLog.weight > 0
        ? parseFloat((todayLog.weight / (1.75 * 1.75)).toFixed(1))
        : 0;

  return (
    <FitnessContext.Provider
      value={{
        todayLog,
        recentWorkouts,
        inBodyReports,
        connectedDevices,
        activitySummary,
        stepTrackingStatus,
        stepTrackingError,
        syncError,
        lastSyncedAt,
        showStepPermissionBanner,
        nutritionError,
        isLoadingNutrition,
        calorieGoal,
        waterGoal,
        stepGoal,
        streak,
        addWater,
        logWeight,
        addMeal,
        removeMeal,
        addWorkout,
        addInBodyReport,
        connectDevice,
        enableStepTracking,
        dismissStepPermissionBanner,
        refreshActivity,
        refreshDailyData,
        setStepGoal,
        logManualSteps,
        syncActivityNow,
        bmi,
        weeklyCalories,
      }}
    >
      {children}
    </FitnessContext.Provider>
  );
}

export function useFitness() {
  const ctx = useContext(FitnessContext);
  if (!ctx) throw new Error("useFitness must be used within FitnessProvider");
  return ctx;
}
