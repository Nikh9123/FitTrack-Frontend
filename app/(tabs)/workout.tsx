import { getStorageItem, setStorageItem } from "@/lib/storage-migrate";
import { useFitness } from "@/context/FitnessContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/api";
import { completeWorkoutSessionApi } from "@/lib/workout-session-api";
import { fetchWorkoutHistory } from "@/lib/workout-history-api";
import {
  fetchPersonalRecords,
  fetchProgressionSuggestions,
  fetchExercisesByCategory,
  fetchWorkoutPlanContext,
  getPlanActiveDays,
  getTodayWorkoutDay,
  mergePlanDaysWithTemplate,
  type CatalogExerciseHit,
  type ProgressionSuggestion,
  type WorkoutCategoryKey,
  type WorkoutDayPlan,
  type WorkoutPlanContext,
} from "@/lib/workout-plan-api";
import { useWorkoutPlan } from "@/hooks/useWorkoutPlan";
import { Ionicons } from "@expo/vector-icons";
import { ProgressionInsightsCard } from "@/components/workout/ProgressionInsightsCard";
import { ActiveWorkoutSession } from "@/components/workout/ActiveWorkoutSession";
import { useActiveWorkoutSession } from "@/hooks/useActiveWorkoutSession";
import { ExerciseSearchBar } from "@/components/workout/ExerciseSearchBar";
import { WorkoutTodayHero } from "@/components/workout/WorkoutTodayHero";
import { WorkoutPeriodFilter, type WorkoutPlanPeriod } from "@/components/workout/WorkoutPeriodFilter";
import { WorkoutPlanSourceBanner } from "@/components/workout/WorkoutPlanSourceBanner";
import { WorkoutScreenSkeleton } from "@/components/skeletons/WorkoutScreenSkeleton";
import { ScreenEntrance } from "@/components/ui/ScreenEntrance";
import {
  hapticError,
  hapticLight,
  hapticMedium,
  hapticSelection,
  hapticSuccess,
} from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import AIWorkoutOnboarding from "../workout/ai-onboarding";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GlassCard } from "@/components/ui/GlassCard";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const ORANGE = "#FF6B35";
const ORANGE_SOFT = "#FF6B3512";
const FEATURED_WORKOUT_IMAGE =
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80";
const WORKOUT_IMAGES = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80",
];
const DEFAULT_EXERCISE_YOUTUBE: Record<string, string> = {
  "dumbbell bicep curl": "https://www.youtube.com/watch?v=cBSD6mQIPQk",
  "dumbbell standing reverse curl": "https://www.youtube.com/watch?v=cBSD6mQIPQk",
  "barbell bench press": "https://www.youtube.com/watch?v=rT7DgCr-3ps",
  "squats": "https://www.youtube.com/watch?v=MVMnk0HuH0k",
  "deadlift": "https://www.youtube.com/watch?v=ytGaGIn3SjY",
};

// ─── Category data ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "hiit",     label: "HIIT",     icon: "flame",          bg: "#22C55E18", color: "#22C55E" },
  { key: "strength", label: "Strength", icon: "barbell",        bg: "#FF6B3515", color: ORANGE },
  { key: "focus",    label: "Focus",    icon: "flash",          bg: "#8B5CF618", color: "#8B5CF6" },
  { key: "agility",  label: "Agility",  icon: "bicycle",        bg: "#3B82F618", color: "#3B82F6" },
  { key: "mobility", label: "Mobility", icon: "body",           bg: "#F59E0B18", color: "#F59E0B" },
];

const FALLBACK_DAYS = [
  {
    dayName: "Monday", focus: "Push", isRest: false, isCardio: false,
    estimatedCalories: 340, estimatedDuration: "50 min",
    exercises: [
      { id: "1", name: "Barbell Bench Press", bodyPart: "Chest", target: "Pectorals", equipment: "Barbell", gifUrl: "", sets: 4, repsRange: "8–10", restSeconds: 90, estimatedCaloriesPerSet: 14, difficulty: "Intermediate", instructions: ["Lie flat on bench, grip bar wider than shoulder-width.", "Lower to mid-chest with control.", "Press up explosively."] },
      { id: "2", name: "Overhead Press",      bodyPart: "Shoulders", target: "Delts", equipment: "Barbell", gifUrl: "", sets: 3, repsRange: "10–12", restSeconds: 75, estimatedCaloriesPerSet: 10, difficulty: "Intermediate", instructions: ["Grip just outside shoulders.", "Press overhead to lockout.", "Lower with control."] },
      { id: "3", name: "Incline DB Press",    bodyPart: "Chest", target: "Pectorals", equipment: "Dumbbell", gifUrl: "", sets: 3, repsRange: "10–12", restSeconds: 60, estimatedCaloriesPerSet: 12, difficulty: "Beginner", instructions: ["Set bench to 30–45°.", "Press dumbbells up and together.", "Control descent."] },
      { id: "4", name: "Tricep Pushdown",     bodyPart: "Upper Arms", target: "Triceps", equipment: "Cable", gifUrl: "", sets: 3, repsRange: "12–15", restSeconds: 45, estimatedCaloriesPerSet: 8, difficulty: "Beginner", instructions: ["Keep elbows pinned to sides.", "Extend arms fully.", "Squeeze triceps."] },
    ],
  },
  {
    dayName: "Tuesday", focus: "Pull", isRest: false, isCardio: false,
    estimatedCalories: 380, estimatedDuration: "55 min",
    exercises: [
      { id: "5", name: "Pull-ups",       bodyPart: "Back", target: "Lats", equipment: "Body Weight", gifUrl: "", sets: 4, repsRange: "6–10", restSeconds: 90, estimatedCaloriesPerSet: 16, difficulty: "Intermediate", instructions: ["Full dead-hang start.", "Pull until chin clears bar.", "Lower with control."] },
      { id: "6", name: "Barbell Row",    bodyPart: "Back", target: "Upper Back", equipment: "Barbell", gifUrl: "", sets: 4, repsRange: "8–10", restSeconds: 75, estimatedCaloriesPerSet: 15, difficulty: "Intermediate", instructions: ["Keep back neutral.", "Pull to lower chest.", "Pause at top."] },
      { id: "7", name: "Face Pulls",     bodyPart: "Shoulders", target: "Rear Delts", equipment: "Cable", gifUrl: "", sets: 3, repsRange: "15–20", restSeconds: 45, estimatedCaloriesPerSet: 8, difficulty: "Beginner", instructions: ["Set cable at face height.", "Pull to forehead.", "Externally rotate at end."] },
      { id: "8", name: "Hammer Curls",   bodyPart: "Upper Arms", target: "Biceps", equipment: "Dumbbell", gifUrl: "", sets: 3, repsRange: "10–12", restSeconds: 45, estimatedCaloriesPerSet: 9, difficulty: "Beginner", instructions: ["Neutral grip (thumbs up).", "Curl to shoulder height.", "Control the descent."] },
    ],
  },
  { dayName: "Wednesday", focus: "Rest", isRest: true, isCardio: false, estimatedCalories: 0, estimatedDuration: "—", exercises: [] },
  {
    dayName: "Thursday", focus: "Legs", isRest: false, isCardio: false,
    estimatedCalories: 450, estimatedDuration: "60 min",
    exercises: [
      { id: "9",  name: "Barbell Squat",       bodyPart: "Upper Legs", target: "Quads", equipment: "Barbell", gifUrl: "", sets: 4, repsRange: "8–10", restSeconds: 120, estimatedCaloriesPerSet: 22, difficulty: "Advanced", instructions: ["Bar on upper traps.", "Break parallel.", "Drive through heels."] },
      { id: "10", name: "Romanian Deadlift",   bodyPart: "Upper Legs", target: "Hamstrings", equipment: "Barbell", gifUrl: "", sets: 3, repsRange: "10–12", restSeconds: 75, estimatedCaloriesPerSet: 18, difficulty: "Intermediate", instructions: ["Hinge at hips.", "Keep bar close to legs.", "Feel hamstring stretch."] },
      { id: "11", name: "Leg Press",           bodyPart: "Upper Legs", target: "Quads", equipment: "Machine", gifUrl: "", sets: 3, repsRange: "12–15", restSeconds: 60, estimatedCaloriesPerSet: 15, difficulty: "Beginner", instructions: ["Feet shoulder-width.", "Lower to 90°.", "Press through heels."] },
      { id: "12", name: "Standing Calf Raise", bodyPart: "Lower Legs", target: "Calves", equipment: "Machine", gifUrl: "", sets: 4, repsRange: "15–20", restSeconds: 30, estimatedCaloriesPerSet: 6, difficulty: "Beginner", instructions: ["Rise as high as possible.", "Pause at top.", "Full range down."] },
    ],
  },
  {
    dayName: "Friday", focus: "Cardio", isRest: false, isCardio: true,
    estimatedCalories: 280, estimatedDuration: "30 min",
    exercises: [
      { id: "13", name: "Treadmill Intervals", bodyPart: "Cardio", target: "Cardiovascular System", equipment: "Treadmill", gifUrl: "", sets: 1, repsRange: "30 min", restSeconds: 0, estimatedCaloriesPerSet: 280, difficulty: "Beginner", instructions: ["2–5° incline.", "65–75% max heart rate.", "Alternate 1 min fast / 1 min walk."] },
    ],
  },
  { dayName: "Saturday", focus: "Rest", isRest: true, isCardio: false, estimatedCalories: 0, estimatedDuration: "—", exercises: [] },
  { dayName: "Sunday",   focus: "Rest", isRest: true, isCardio: false, estimatedCalories: 0, estimatedDuration: "—", exercises: [] },
];

function getWorkoutImage(index = 0) {
  return WORKOUT_IMAGES[index % WORKOUT_IMAGES.length];
}

function getExerciseVideoUrl(exercise: any) {
  const url = exercise?.videoUrl ?? exercise?.tutorialVideoUrl ?? exercise?.tutorialUrl ?? exercise?.video_url ?? exercise?.tutorial_video_url;
  return typeof url === "string" && /\.mp4($|\?)/i.test(url) ? url : null;
}

function getYoutubeEmbedUrl(exercise: any) {
  const raw = exercise?.youtubeUrl ?? exercise?.tutorialYoutubeUrl ?? exercise?.youtube_url ?? exercise?.tutorial_youtube_url ?? exercise?.youtubeId ?? exercise?.youtube_id ?? DEFAULT_EXERCISE_YOUTUBE[String(exercise?.name ?? "").trim().toLowerCase()];
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim();
  const idMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ?? value.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ?? value.match(/embed\/([A-Za-z0-9_-]{6,})/) ?? value.match(/^([A-Za-z0-9_-]{6,})$/);
  const videoId = idMatch?.[1];
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&playsinline=1&loop=1&playlist=${videoId}&start=0`;
}

const DIFF_COLOR: Record<string, string> = {
  Beginner: "#22C55E",
  Intermediate: "#F59E0B",
  Advanced: "#EF4444",
};

// ─── TYPES FOR PERSISTENCE ─────────────────────────────────────────────────────
export type { ActiveSession, CompletedWorkout, SetLog } from "@/lib/workout-types";
import type { ActiveSession, CompletedWorkout } from "@/lib/workout-types";

// ─── Progression Chart Helper ───
function ProgressionLineChart({ data, width: chartW, height: chartH, color }: { data: number[]; width: number; height: number; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 12;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((v - min) / range) * (chartH - pad * 2 - 12);
    return { x, y };
  });
  const linePath = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `C${points[i-1].x+(p.x-points[i-1].x)/2},${points[i-1].y} ${points[i-1].x+(p.x-points[i-1].x)/2},${p.y} ${p.x},${p.y}`)).join(" ");
  const areaPath = `${linePath} L${points[points.length-1].x},${chartH-pad} L${points[0].x},${chartH-pad} Z`;
  return (
    <Svg width={chartW} height={chartH}>
      <Defs>
        <SvgGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </SvgGradient>
      </Defs>
      <Path d={areaPath} fill="url(#progGrad)" />
      <Path d={linePath} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={5} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
      ))}
    </Svg>
  );
}

// ─── Main Workout Tab Component ───────────────────────────────────────────────
export default function WorkoutScreen() {
  const { addWorkout, refreshDailyData } = useFitness();
  const { token, user } = useAuth();
  const colors = useColors();
  const styles = useWorkoutStyles();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { action: workoutAction } = useLocalSearchParams<{ action?: string }>();
  const { planId, planGoal, planTitle, days: apiDays, refresh: refreshWorkoutPlan, planBundle } = useWorkoutPlan();

  // Tabs: today | history | insights
  const [activeTab, setActiveTab] = useState<"today" | "history" | "insights">("today");
  const [planPeriod, setPlanPeriod] = useState<WorkoutPlanPeriod>("today");

  // onboarding
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [dynamicPlan, setDynamicPlan] = useState<any[] | null>(null);

  // UI / Search
  const [activeCategory, setActiveCategory] = useState("strength");
  const [categoryExercises, setCategoryExercises] = useState<CatalogExerciseHit[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [playlistDay, setPlaylistDay] = useState<any | null>(null);

  // Persistence States
  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [personalRecords, setPersonalRecords] = useState<Record<string, number>>({});

  // Session player visibility + close prompt
  const [showSessionPlayer, setShowSessionPlayer] = useState(false);
  const [showSessionClosePrompt, setShowSessionClosePrompt] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [latestSummary, setLatestSummary] = useState<CompletedWorkout | null>(null);

  // Insights Stats
  const [selectedChartExercise, setSelectedChartExercise] = useState("Barbell Bench Press");
  const [planContext, setPlanContext] = useState<WorkoutPlanContext | null>(null);
  const [progressionSuggestions, setProgressionSuggestions] = useState<ProgressionSuggestion[]>([]);
  const [progressionLoading, setProgressionLoading] = useState(false);

  // Active workout session hook
  const ws = useActiveWorkoutSession({
    token,
    planId,
    personalRecords,
    onComplete: async (result, updatedPRs) => {
      void hapticSuccess();
      const newHistory = [result, ...history];
      setHistory(newHistory);
      setPersonalRecords(updatedPRs);
      setLatestSummary(result);
      setShowSummaryModal(true);
      setShowSessionPlayer(false);
      await setStorageItem("workoutHistory", JSON.stringify(newHistory));
      await setStorageItem("personalRecords", JSON.stringify(updatedPRs));
      addWorkout({
        name: result.focus + " Session",
        date: result.date,
        duration: result.duration,
        calories: result.calories,
        exercises: [],
      });
      if (token && ws.session?.workoutSessionId) {
        try {
          await completeWorkoutSessionApi(token, {
            workoutSessionId: ws.session.workoutSessionId,
            totalDuration: ws.elapsedSeconds,
            caloriesBurned: result.calories,
          });
          await refreshDailyData();
          await loadWorkoutHistory();
          await loadPersonalRecordsFromApi();
        } catch (err: any) {
          Alert.alert("Sync warning", err.message || "Workout saved locally but server sync failed.");
        }
      } else if (token) {
        await loadWorkoutHistory();
        await loadPersonalRecordsFromApi();
      }
    },
  });

  useEffect(() => {
    loadLocalData();
    if (!token) { setOnboardingChecked(true); return; }
    checkOnboarding();
  }, [token]);

  // Open session player when session starts
  useEffect(() => {
    if (ws.running && ws.session) setShowSessionPlayer(true);
  }, [ws.running, ws.session]);

  // Fetch AI onboarding plan
  const checkOnboarding = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/workout/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.workoutPlan) {
        setDynamicPlan(data.workoutPlan);
        setActiveGoal(data.fitnessGoal ?? null);
      }
      if (!data.completed && !data.hasTrainerAssigned && data.canGenerateWithAi !== false) {
        setShowOnboarding(true);
      }
      if (data.planSource || data.hasTrainerAssigned != null) {
        setPlanContext({
          planSource: data.planSource ?? "none",
          hasTrainerAssigned: Boolean(data.hasTrainerAssigned),
          canGenerateWithAi: data.canGenerateWithAi !== false,
          hasInBodyReport: Boolean(data.hasInBodyReport),
          latestInBodyReportId: data.latestReportId ?? null,
          fitnessGoal: data.fitnessGoal ?? null,
          workoutOnboardingCompleted: Boolean(data.completed),
          trainerName: data.trainerName ?? null,
        });
      }
    } catch {}
    finally { setOnboardingChecked(true); }
  };

  const persistWorkoutPlan = async (plan: any[], goal: string, strategy?: unknown): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${getApiBaseUrl()}/workout/persist`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ workoutPlan: plan, fitnessGoal: goal, strategy }),
      });
      const data = await res.json().catch(() => ({}));
      return res.ok && data.success !== false;
    } catch {
      return false;
    }
  };

  const loadLocalData = async () => {
    try {
      // Active session is restored by useActiveWorkoutSession hook on mount
      if (!token) {
        const savedHistory = await getStorageItem("workoutHistory");
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory) as CompletedWorkout[]);
        }
      }
      const savedPRs = await getStorageItem("personalRecords");
      if (savedPRs) {
        setPersonalRecords(JSON.parse(savedPRs) as Record<string, number>);
      }
    } catch {}
  };

  const loadWorkoutHistory = useCallback(async () => {
    if (!token) return;
    try {
      const apiHistory = await fetchWorkoutHistory(token, 50);
      setHistory(apiHistory);
      await setStorageItem("workoutHistory", JSON.stringify(apiHistory));
    } catch {
      const savedHistory = await getStorageItem("workoutHistory");
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory) as CompletedWorkout[]);
      }
    }
  }, [token]);

  const loadPersonalRecordsFromApi = useCallback(async () => {
    if (!token) return;
    try {
      const { byExerciseName } = await fetchPersonalRecords(token);
      setPersonalRecords(byExerciseName);
      await setStorageItem("personalRecords", JSON.stringify(byExerciseName));
    } catch {
      const savedPRs = await getStorageItem("personalRecords");
      if (savedPRs) {
        setPersonalRecords(JSON.parse(savedPRs) as Record<string, number>);
      }
    }
  }, [token]);

  const loadPlanContext = useCallback(async () => {
    if (!token) return;
    try {
      const ctx = await fetchWorkoutPlanContext(token);
      setPlanContext(ctx);
    } catch {
      /* keep cached context from onboarding status */
    }
  }, [token]);

  const loadProgressionSuggestions = useCallback(async () => {
    if (!token) return;
    setProgressionLoading(true);
    try {
      const suggestions = await fetchProgressionSuggestions(token);
      setProgressionSuggestions(suggestions);
    } catch {
      setProgressionSuggestions([]);
    } finally {
      setProgressionLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadWorkoutHistory();
      void loadPersonalRecordsFromApi();
      void loadPlanContext();
      void loadProgressionSuggestions();

      if (workoutAction === "today") {
        setActiveTab("today");
        setPlanPeriod("today");
        router.setParams({ action: undefined });
      }
    }, [loadWorkoutHistory, loadPersonalRecordsFromApi, loadPlanContext, loadProgressionSuggestions, workoutAction]),
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setCategoryLoading(true);
    void fetchExercisesByCategory(token, activeCategory as WorkoutCategoryKey, 8)
      .then((rows) => {
        if (!cancelled) setCategoryExercises(rows);
      })
      .catch(() => {
        if (!cancelled) setCategoryExercises([]);
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, activeCategory]);

  const handleOnboardingComplete = async (plan: any[], goal: string, _strategy: any, _workoutLocation?: "gym" | "home") => {
    setPlanSaving(true);
    setDynamicPlan(plan);
    setActiveGoal(goal);
    try {
      // Plan is already persisted by POST /workout/onboarding/save � only refresh UI state
      await refreshWorkoutPlan();
      await loadPlanContext();
      void loadProgressionSuggestions();
      setShowOnboarding(false);
      void hapticSuccess();
    } catch {
      Alert.alert(
        "Plan saved",
        "Your plan was saved. If the workout tab looks empty, pull to refresh.",
      );
      setShowOnboarding(false);
    } finally {
      setPlanSaving(false);
    }
  };

  const handleChangeWorkout = () => {
    void hapticMedium();
    if (planContext?.hasTrainerAssigned) {
      Alert.alert(
        "Trainer plan active",
        "Your workout program is managed by your trainer. Ask them to update your plan.",
      );
      return;
    }
    Alert.alert("Change Workout Plan", "Re-run AI onboarding to get a new personalised plan from your InBody data and preferences?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: async () => {
          try { await fetch(`${getApiBaseUrl()}/workout/onboarding/reset`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch {}
          setDynamicPlan(null); setActiveGoal(null);
          setPlaylistDay(null); setShowOnboarding(true);
        },
      },
    ]);
  };

  // Start active workout session
  const handleStartWorkout = async (day: any) => {
    void hapticSuccess();
    setPlaylistDay(null);
    await ws.startSession(day);
    setShowSessionPlayer(true);
  };

  const handleSessionClose = useCallback(() => {
    setShowSessionClosePrompt(true);
  }, []);

  const handleMinimizeSession = () => {
    setShowSessionClosePrompt(false);
    setShowSessionPlayer(false);
  };

  const handleDiscardWorkout = async () => {
    setShowSessionClosePrompt(false);
    setShowSessionPlayer(false);
    await ws.discardSession();
  };

  const hasApiPlan = apiDays.some((d) => !d.isRest && d.exercises.length > 0);
  const rawDays = useMemo(() => {
    if (hasApiPlan && dynamicPlan?.length) {
      return mergePlanDaysWithTemplate(apiDays, dynamicPlan as WorkoutDayPlan[]);
    }
    return (hasApiPlan ? apiDays : (dynamicPlan ?? FALLBACK_DAYS)) as WorkoutDayPlan[];
  }, [apiDays, dynamicPlan, hasApiPlan]);
  const displayGoal = planGoal ?? activeGoal;
  const displayPlanTitle = planTitle ?? (displayGoal ? `${displayGoal} Workout Plan` : null);

  const allActiveDays = useMemo(
    () => getPlanActiveDays(rawDays as WorkoutDayPlan[]),
    [rawDays],
  );
  const todayDay = useMemo(
    () => getTodayWorkoutDay(rawDays as WorkoutDayPlan[]),
    [rawDays],
  );
  const featuredDay = useMemo(() => {
    if (todayDay && !todayDay.isRest && (todayDay.exercises?.length ?? 0) > 0) {
      return todayDay;
    }
    return allActiveDays[0] ?? null;
  }, [todayDay, allActiveDays]);

  const daysForPeriod = useMemo(() => {
    if (planPeriod === "today") {
      return todayDay && !todayDay.isRest ? [todayDay] : [];
    }
    if (planPeriod === "week") {
      return allActiveDays;
    }
    return allActiveDays;
  }, [planPeriod, todayDay, allActiveDays]);

  const monthSessions = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return history.filter((w) => {
      const d = new Date(w.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [history]);

  const formattedTime = ws.formattedTime;

  if (!onboardingChecked) {
    return (
      <ScreenEntrance style={{ flex: 1 }}>
        <WorkoutScreenSkeleton />
      </ScreenEntrance>
    );
  }
  if (showOnboarding) {
    return (
      <AIWorkoutOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  if (planSaving) {
    return (
      <ScreenEntrance style={{ flex: 1 }}>
        <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad + 16, paddingHorizontal: 16 }]}>
          <WorkoutTodayHero
            planTitle={displayPlanTitle}
            goal={displayGoal}
            todayDay={todayDay}
            saving
            onStart={() => {}}
            onSetup={() => setShowOnboarding(true)}
          />
        </View>
      </ScreenEntrance>
    );
  }

  // ─── RENDER SUB-TAB TODAY ───
  const renderTodayTab = () => {
    return (
      <>
        {planContext && token ? (
          <WorkoutPlanSourceBanner
            context={planContext}
            onGenerateAi={
              planContext.canGenerateWithAi
                ? () => {
                    void hapticMedium();
                    setShowOnboarding(true);
                  }
                : undefined
            }
          />
        ) : null}

        <WorkoutPeriodFilter
          value={planPeriod}
          onChange={(p) => {
            void hapticSelection();
            setPlanPeriod(p);
          }}
        />

        {planPeriod === "today" ? (
          <WorkoutTodayHero
            planTitle={displayPlanTitle}
            goal={displayGoal}
            todayDay={todayDay}
            loading={planBundle === null && !dynamicPlan && token != null}
            onStart={(day) => {
              void handleStartWorkout(day);
            }}
            onSetup={() => setShowOnboarding(true)}
          />
        ) : null}

        {planPeriod !== "month" ? (
          <>
        {/* Featured Workout */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {planPeriod === "week" ? "This Week" : "Featured Workout"}
          </Text>
          {featuredDay ? (
            <Text style={[styles.seeAll, { color: colors.mutedForeground }]}>{featuredDay.dayName}</Text>
          ) : null}
        </View>
        {featuredDay && planPeriod === "today" ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              void hapticLight();
              void handleStartWorkout(featuredDay);
            }}
          >
            <ImageBackground
              source={{ uri: FEATURED_WORKOUT_IMAGE }}
              imageStyle={styles.featuredImage}
              style={styles.featuredCard}
              resizeMode="cover"
            >
              <LinearGradient
                colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.86)"]}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.featuredTop}>
                <View style={styles.beginnerBadge}>
                  <Text style={styles.beginnerText}>{displayPlanTitle ? "Your Plan" : "Featured"}</Text>
                </View>
              </View>
              <View style={styles.featuredBody}>
                <Text style={styles.featuredTitle} numberOfLines={1}>
                  {displayPlanTitle ?? `${featuredDay.focus} Workout`}
                </Text>
                <View style={styles.coachRow}>
                  <View style={styles.coachAvatarSmall}>
                    <Ionicons name="barbell" size={12} color="#fff" />
                  </View>
                  <Text style={styles.coachName} numberOfLines={1}>
                    {featuredDay.focus}
                    {displayGoal ? ` � Goal: ${displayGoal}` : ""}
                  </Text>
                </View>
                <View style={styles.featuredStats}>
                  <FeaturedStat icon="flame" value={`${featuredDay.estimatedCalories ?? 0}`} label="kcal" color="#FF6B35" />
                  <FeaturedStat icon="time-outline" value={featuredDay.estimatedDuration ?? "45 min"} label="" color="rgba(255,255,255,0.7)" />
                  <FeaturedStat icon="layers-outline" value={`${featuredDay.exercises?.length ?? 0}`} label="exercises" color="#8B5CF6" />
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ) : planPeriod === "week" && allActiveDays.length > 0 ? (
          <View style={[styles.emptyCard, { marginBottom: 8, paddingVertical: 12 }]}>
            <Text style={[styles.emptyText, { marginTop: 0 }]}>
              {allActiveDays.length} training days � {allActiveDays.reduce((s, d) => s + (d.exercises?.length ?? 0), 0)} total exercises
            </Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="fitness-outline" size={28} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>Generate a plan to see your featured workout here.</Text>
          </View>
        )}

        {/* Active Workout Days */}
        <View style={[styles.sectionRow, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>
            {planPeriod === "week" ? "Weekly Plan" : "My Active Workout"}
          </Text>
          {token && planContext?.canGenerateWithAi && (
            <TouchableOpacity onPress={handleChangeWorkout}>
              <Text style={[styles.seeAll, { color: ORANGE }]}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {daysForPeriod.map((day: WorkoutDayPlan, idx: number) => (
          <ActiveWorkoutItem
            key={day.dayName}
            day={day}
            index={idx}
            isToday={day.dayName === todayDay?.dayName}
            onPress={() => { void hapticLight(); setPlaylistDay(day); }}
          />
        ))}

        {daysForPeriod.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>
              {planPeriod === "today"
                ? "Rest day today � pick another day in Week view."
                : "No workout days yet. Complete onboarding to get your plan."}
            </Text>
          </View>
        )}
          </>
        ) : (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>This Month</Text>
              <Text style={[styles.seeAll, { color: colors.mutedForeground }]}>
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Text>
            </View>
            <View style={[styles.emptyCard, { marginBottom: 12 }]}>
              <Text style={[styles.sectionTitle, { fontSize: 28, marginBottom: 4 }]}>
                {monthSessions.length}
              </Text>
              <Text style={styles.emptyText}>sessions completed this month</Text>
              <Text style={[styles.emptyText, { marginTop: 8 }]}>
                {monthSessions.reduce((s, w) => s + w.calories, 0)} kcal �{" "}
                {monthSessions.reduce((s, w) => s + w.duration, 0)} min total
              </Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Your Weekly Plan</Text>
            </View>
            {allActiveDays.map((day: WorkoutDayPlan, idx: number) => (
              <ActiveWorkoutItem
                key={day.dayName + "-month"}
                day={day}
                index={idx}
                isToday={day.dayName === todayDay?.dayName}
                onPress={() => { void hapticLight(); void handleStartWorkout(day); }}
              />
            ))}
          </>
        )}

        <View style={[styles.sectionRow, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Discover</Text>
        </View>

        {/* Search */}
        {token ? <ExerciseSearchBar token={token} placeholder="Search exercises (e.g. biceps)�" /> : (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search for a workout..."
            placeholderTextColor={colors.mutedForeground}
            style={styles.searchInput}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        )}

        {/* Workout Category */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Workout Category</Text>
          <TouchableOpacity onPress={() => router.push("/workout/weekly-plan")}>
            <Text style={styles.seeAll}>View Week</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => { void hapticSelection(); setActiveCategory(cat.key); }}
                style={[styles.categoryPill, { backgroundColor: active ? cat.color : colors.card }, active && { shadowColor: cat.color, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]}
              >
                <View style={[styles.catIconWrap, { backgroundColor: active ? "rgba(255,255,255,0.25)" : cat.bg }]}>
                  <Ionicons name={cat.icon as any} size={18} color={active ? "#fff" : cat.color} />
                </View>
                <Text style={[styles.catLabel, { color: active ? "#fff" : colors.foreground }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { fontSize: 15 }]}>
            {CATEGORIES.find((c) => c.key === activeCategory)?.label ?? "Category"} picks
          </Text>
        </View>
        {categoryLoading ? (
          <Text style={[styles.seeAll, { paddingHorizontal: 4, marginBottom: 8 }]}>Loading catalog�</Text>
        ) : categoryExercises.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryExerciseList}>
            {categoryExercises.map((ex) => (
              <View key={ex.id} style={[styles.categoryExerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {ex.gifUrl ? (
                  <Image source={{ uri: ex.gifUrl }} style={styles.categoryExerciseImg} />
                ) : (
                  <View style={[styles.categoryExerciseImg, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="barbell-outline" size={18} color={colors.mutedForeground} />
                  </View>
                )}
                <Text style={[styles.categoryExerciseName, { color: colors.foreground }]} numberOfLines={2}>{ex.name}</Text>
                <Text style={[styles.categoryExerciseMeta, { color: colors.mutedForeground }]} numberOfLines={1}>{ex.target || ex.bodyPart}</Text>
                {ex.inCurrentPlan ? (
                  <View style={[styles.inPlanPill, { backgroundColor: ORANGE + "18" }]}>
                    <Text style={[styles.inPlanPillText, { color: ORANGE }]}>In plan</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </>
    );
  };

  // ─── RENDER SUB-TAB HISTORY ───
  const renderHistoryTab = () => {
    const calendarDays = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000);
      const dateString = d.toISOString().split("T")[0];
      const workoutsThisDay = history.filter((w) => w.date === dateString);
      return {
        dayNum: d.getDate(),
        dateString,
        trained: workoutsThisDay.length > 0,
      };
    });

    const totalKcal = history.reduce((s, w) => s + w.calories, 0);
    const totalMins = history.reduce((s, w) => s + w.duration, 0);
    const totalSessions = history.length;

    return (
      <View style={styles.historyContainer}>
        {/* Active days calendar */}
        <GlassCard style={styles.calendarCard} elevated shadowLevel="soft">
          <View style={styles.calendarHeader}>
            <Ionicons name="calendar-outline" size={18} color={ORANGE} />
            <Text style={[colors.typography.h3, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Trained Days (Last 30 Days)</Text>
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, idx) => (
              <View
                key={day.dateString + idx}
                style={[
                  styles.calendarDay,
                  {
                    backgroundColor: day.trained ? ORANGE : colors.border + "40",
                    borderColor: day.trained ? ORANGE : "transparent",
                  },
                ]}
              >
                <Text style={[styles.calendarDayText, { color: day.trained ? "#fff" : colors.mutedForeground }]}>
                  {day.dayNum}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.calendarLegend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: ORANGE }]} />
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Trained ({history.filter(w => new Date(w.date) > new Date(Date.now() - 30 * 86400000)).length} days)</Text>
            </View>
          </View>
        </GlassCard>

        {/* History Stats Bar */}
        <View style={styles.historyStatsStrip}>
          <View style={styles.historyStatBox}>
            <Text style={[styles.historyStatVal, { color: ORANGE }]}>{totalSessions}</Text>
            <Text style={[styles.historyStatLbl, { color: colors.mutedForeground }]}>WORKOUTS</Text>
          </View>
          <View style={styles.historyStatDivider} />
          <View style={styles.historyStatBox}>
            <Text style={[styles.historyStatVal, { color: "#22C55E" }]}>{totalKcal}</Text>
            <Text style={[styles.historyStatLbl, { color: colors.mutedForeground }]}>KCAL</Text>
          </View>
          <View style={styles.historyStatDivider} />
          <View style={styles.historyStatBox}>
            <Text style={[styles.historyStatVal, { color: colors.primary }]}>{totalMins}</Text>
            <Text style={[styles.historyStatLbl, { color: colors.mutedForeground }]}>MINUTES</Text>
          </View>
        </View>

        {/* Completed Workouts List */}
        <Text style={[styles.sectionTitle, { marginVertical: 6 }]}>Workout History</Text>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No completed sessions yet. Start a workout to log progress!</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((w) => (
              <CompletedWorkoutCard key={w.id} workout={w} colors={colors} />
            ))}
          </View>
        )}
      </View>
    );
  };

  // ─── RENDER SUB-TAB INSIGHTS ───
  const renderInsightsTab = () => {
    // Generate progression chart values for the selected exercise
    const exerciseHistory = history
      .filter((w) => w.exercises.some((e) => e.name === selectedChartExercise))
      .reverse(); // oldest first

    const chartPoints = exerciseHistory.map((w) => {
      const ex = w.exercises.find((e) => e.name === selectedChartExercise);
      let maxWeight = 0;
      ex?.setsLogged.forEach((s) => {
        if (s.weight > maxWeight) maxWeight = s.weight;
      });
      return maxWeight;
    });

    const isChartAvailable = chartPoints.length >= 2;
    const currentMaxWeight = personalRecords[selectedChartExercise] ?? 0;

    return (
      <View style={styles.insightsContainer}>
        <ProgressionInsightsCard suggestions={progressionSuggestions} loading={progressionLoading} />

        {/* Progression Chart Card */}
        <GlassCard style={styles.progressionChartCard} elevated shadowLevel="soft">
          <View style={styles.chartDropdownHeader}>
            <Text style={[colors.typography.h3, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Exercise Progression</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseSelectRow}>
              {["Barbell Bench Press", "Barbell Squat", "Romanian Deadlift", "Pull-ups"].map((exName) => (
                <TouchableOpacity
                  key={exName}
                  onPress={() => { void hapticSelection(); setSelectedChartExercise(exName); }}
                  style={[
                    styles.exerciseSelectChip,
                    {
                      backgroundColor: selectedChartExercise === exName ? ORANGE + "1A" : colors.border + "40",
                      borderColor: selectedChartExercise === exName ? ORANGE : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.exerciseSelectChipText, { color: selectedChartExercise === exName ? ORANGE : colors.mutedForeground, fontWeight: selectedChartExercise === exName ? "700" : "500" }]}>
                    {exName.split(" ").slice(-2).join(" ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.chartDetailsRow}>
            <View>
              <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>PERSONAL BEST</Text>
              <Text style={[colors.typography.h2, { color: ORANGE, fontSize: 26, fontWeight: "800" }]}>
                {currentMaxWeight > 0 ? `${currentMaxWeight} kg` : "—"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>ENTRIES</Text>
              <Text style={[colors.typography.h3, { color: colors.foreground, fontWeight: "600" }]}>
                {chartPoints.length} logged
              </Text>
            </View>
          </View>

          {isChartAvailable ? (
            <View style={styles.svgChartWrapper}>
              <ProgressionLineChart data={chartPoints} width={width - 64} height={140} color={ORANGE} />
              <View style={styles.chartXLabels}>
                {exerciseHistory.map((w, idx) => (
                  <Text key={idx} style={[styles.chartXLabelText, { color: colors.mutedForeground }]}>
                    {new Date(w.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.chartEmptyState}>
              <Ionicons name="trending-up-outline" size={32} color={colors.mutedForeground} />
              <Text style={[styles.chartEmptyText, { color: colors.mutedForeground }]}>
                Log at least 2 sessions of {selectedChartExercise} to unlock the AI progression line chart.
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Personal Records Grid */}
        <Text style={[styles.sectionTitle, { marginVertical: 8 }]}>Personal Records (PRs)</Text>
        {Object.keys(personalRecords).length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No personal bests saved yet. Push your limits in sessions to earn badges!</Text>
          </View>
        ) : (
          <View style={styles.prGrid}>
            {Object.entries(personalRecords).map(([exName, maxWeight]) => (
              <GlassCard key={exName} style={styles.prCard} elevated shadowLevel="soft">
                <View style={[styles.prBadgeIcon, { backgroundColor: ORANGE + "15" }]}>
                  <Ionicons name="trophy" size={20} color={ORANGE} />
                </View>
                <Text style={[styles.prWeight, { color: colors.foreground }]}>{maxWeight} kg</Text>
                <Text style={[styles.prExerciseName, { color: colors.mutedForeground }]} numberOfLines={2}>{exName}</Text>
              </GlassCard>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenEntrance style={{ flex: 1 }}>
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      
      {/* Resumable Session floating bar */}
      {ws.running && ws.session && !showSessionPlayer && (
        <TouchableOpacity
          onPress={() => { void hapticMedium(); setShowSessionPlayer(true); }}
          activeOpacity={0.88}
          style={[styles.resumeBar, { backgroundColor: colors.purple, top: topPad + 4 }]}
        >
          <View style={styles.resumeDotWrap}>
            <View style={styles.resumeLiveDot} />
          </View>
          <Text style={styles.resumeText} numberOfLines={1}>
            Workout Active — {ws.session?.focus} ({ws.formattedTime(ws.elapsedSeconds)})
          </Text>
          <View style={styles.resumeBtn}>
            <Text style={styles.resumeBtnText}>Open</Text>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + (ws.running ? 48 : 8), paddingBottom: insets.bottom + 110 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{(user?.name ?? "U").charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerTitle}>Workout Progress</Text>
          <View style={styles.headerRight}>
          {token && planContext?.canGenerateWithAi && (
            <TouchableOpacity onPress={handleChangeWorkout} style={styles.iconBtn}>
                <Ionicons name="options-outline" size={20} color={colors.foreground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab switchers */}
        <View style={[styles.subTabsContainer, { backgroundColor: colors.border + "30" }]}>
          {(["today", "history", "insights"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => { void hapticSelection(); setActiveTab(tab); }}
              style={[
                styles.subTabButton,
                activeTab === tab && { backgroundColor: colors.card, ...colors.shadow.soft },
              ]}
            >
              <Text
                style={[
                  styles.subTabButtonText,
                  {
                    color: activeTab === tab ? ORANGE : colors.mutedForeground,
                    fontWeight: activeTab === tab ? "700" : "500",
                  },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "today" && renderTodayTab()}
        {activeTab === "history" && renderHistoryTab()}
        {activeTab === "insights" && renderInsightsTab()}

      </ScrollView>

      {/* Playlist view Modal — kept for day preview; one tap starts session */}
      <Modal visible={playlistDay !== null} animationType="slide">
        {playlistDay && (
          <PlaylistView
            day={playlistDay}
            topPad={topPad}
            insets={insets}
            onBack={() => setPlaylistDay(null)}
            onStartSession={handleStartWorkout}
          />
        )}
      </Modal>

      {/* Active Session — Phase B inline session player */}
      {ws.session && showSessionPlayer && (
        <Modal
          visible={showSessionPlayer}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleSessionClose}
        >
          <ActiveWorkoutSession
            session={ws.session}
            elapsedSeconds={ws.elapsedSeconds}
            formattedTime={ws.formattedTime}
            completedExercises={ws.completedExercises}
            totalExercises={ws.totalExercises}
            progressPct={ws.progressPct}
            totalVolume={ws.totalVolume}
            activeCalories={ws.activeCalories}
            personalRecords={personalRecords}
            topPad={topPad}
            onLogSet={(exIdx, setIdx, w, r) => void ws.logSet(exIdx, setIdx, w, r)}
            onAddSet={(exIdx) => ws.addSet(exIdx)}
            onMarkDone={(exIdx) => ws.markExerciseDone(exIdx)}
            onClose={handleSessionClose}
            onComplete={() => void ws.completeSession()}
          />
        </Modal>
      )}

      {/* Session close options � Alert.alert fails on web */}
      <Modal
        visible={showSessionClosePrompt}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowSessionClosePrompt(false)}
      >
        <Pressable
          style={[styles.sessionCloseOverlay, { backgroundColor: colors.foreground + "66" }]}
          onPress={() => setShowSessionClosePrompt(false)}
        >
          <Pressable
            style={[styles.sessionCloseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sessionCloseTitle, { color: colors.foreground }]}>Workout in progress</Text>
            <Text style={[styles.sessionCloseBody, { color: colors.mutedForeground }]}>
              Minimize to browse the app, or discard to clear this session.
            </Text>
            <TouchableOpacity
              onPress={() => setShowSessionClosePrompt(false)}
              style={[styles.sessionCloseBtn, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.sessionCloseBtnText, { color: colors.foreground }]}>Keep Going</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleMinimizeSession}
              style={[styles.sessionCloseBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary, borderWidth: 1 }]}
            >
              <Text style={[styles.sessionCloseBtnText, { color: colors.primary }]}>Minimize Session</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowSessionClosePrompt(false);
                void handleDiscardWorkout();
              }}
              style={[styles.sessionCloseBtn, { backgroundColor: colors.destructive + "15" }]}
            >
              <Text style={[styles.sessionCloseBtnText, { color: colors.destructive }]}>Discard Workout</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Completion Summary Modal */}
      <Modal visible={showSummaryModal} transparent animationType="slide">
        <View style={[styles.summaryOverlay, { backgroundColor: "rgba(3, 3, 6, 0.85)" }]}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: 30, borderTopRightRadius: 30 }]}>
            <View style={[styles.summaryHeaderLine, { backgroundColor: colors.border }]} />
            
            <View style={[styles.summaryTrophy, { backgroundColor: "rgba(255, 94, 58, 0.15)" }]}>
              <Ionicons name="trophy" size={44} color="#FF5E3A" />
            </View>
            <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center", fontWeight: "800", fontSize: 24 }]}>WORKOUT COMPLETE!</Text>
            <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>Incredible performance! You crushed your split today.</Text>

            {latestSummary && (
              <>
                <View style={styles.summaryStatsGrid}>
                  <View style={[styles.summaryStatBox, { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{latestSummary.calories}</Text>
                    <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>KCAL BURNED</Text>
                  </View>
                  <View style={[styles.summaryStatBox, { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.summaryStatValue, { color: colors.cyan }]}>{latestSummary.duration}m</Text>
                    <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>ACTIVE TIME</Text>
                  </View>
                  <View style={[styles.summaryStatBox, { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.summaryStatValue, { color: colors.green }]}>{latestSummary.totalVolume}kg</Text>
                    <Text style={[styles.summaryStatLabel, { color: colors.mutedForeground }]}>VOLUME LIFTED</Text>
                  </View>
                </View>

                {/* PR notification banner */}
                <View style={[styles.summaryPRBanner, { backgroundColor: "rgba(34, 197, 94, 0.08)", borderColor: "rgba(34, 197, 94, 0.3)" }]}>
                  <Ionicons name="sparkles" size={16} color="#22C55E" />
                  <Text style={[colors.typography.caption, { color: "#22C55E", fontWeight: "600" }]}>Personal records saved to Insights tab!</Text>
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={() => setShowSummaryModal(false)}
              style={[styles.summaryDoneBtn, { backgroundColor: "#FF5E3A" }]}
            >
              <Text style={styles.summaryDoneText}>Awesome</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
    </ScreenEntrance>
  );
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────────

function FeaturedStat({ icon, value, label, color }: any) {
  const styles = useWorkoutStyles();
  return (
    <View style={styles.featStatItem}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={styles.featStatVal}>{value}</Text>
      <Text style={styles.featStatLabel}>{label}</Text>
    </View>
  );
}

function ActiveWorkoutItem({ day, index, isToday, onPress }: { day: any; index: number; isToday?: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useWorkoutStyles();
  const dayColor = day.isCardio ? "#22C55E" : ORANGE;
  const totalEx = day.exercises?.length ?? 0;
  const totalCal = day.estimatedCalories ?? 0;
  const focusLabel = day.focus ?? "Training";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.activeItem, isToday && { borderWidth: 1, borderColor: ORANGE + "44" }]}>
      <View style={[styles.activeStripe, { backgroundColor: dayColor }]} />
      <Image source={{ uri: getWorkoutImage(index) }} style={styles.activeImage} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={styles.activeName}>{focusLabel}</Text>
          {isToday ? (
            <View style={[styles.activePill, { backgroundColor: ORANGE_SOFT }]}>
              <Text style={[styles.activePillText, { color: ORANGE, fontWeight: "700" }]}>Today</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.activeMetaRow}>
          {totalCal > 0 && (
            <View style={styles.activePill}>
              <Ionicons name="flame-outline" size={10} color={colors.mutedForeground} />
              <Text style={styles.activePillText}>{totalCal} kcal</Text>
            </View>
          )}
          {totalEx > 0 && (
            <View style={styles.activePill}>
              <Ionicons name="layers-outline" size={10} color={colors.mutedForeground} />
              <Text style={styles.activePillText}>{totalEx} exercises</Text>
            </View>
          )}
          <View style={[styles.activePill, { backgroundColor: day.isCardio ? "#22C55E12" : ORANGE_SOFT }]}>
            <Text style={[styles.activePillText, { color: dayColor, fontWeight: "600" }]}>
              {day.dayName}
            </Text>
          </View>
        </View>
        {day.estimatedDuration ? (
          <Text style={[styles.activePillText, { color: colors.mutedForeground, marginTop: 4 }]}>
            {day.estimatedDuration}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

// ─── PLAYLIST VIEW ───
function PlaylistView({ day, topPad, insets, onBack, onStartSession }: any) {
  const colors = useColors();
  const styles = useWorkoutStyles();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tutorialExercise, setTutorialExercise] = useState<any | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      
      {/* Visual background glows */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={[styles.bgGlowPurple, { backgroundColor: "#8B5CF6", opacity: 0.15 }]} />
        <View style={[styles.bgGlowPink, { backgroundColor: "#FF5E3A", opacity: 0.12 }]} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: insets.bottom + 120 }}
      >
        {/* Playlist Header */}
        <View style={styles.playlistHeader}>
          <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.muted, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.playlistTitle}>{day.focus} Day</Text>
            <Text style={styles.playlistSub} numberOfLines={2}>
              Workout playlist split for {day.dayName} · {day.estimatedDuration ?? "45 min"}
            </Text>
          </View>
        </View>

        {/* Start Workout Primary Action */}
        <TouchableOpacity
          onPress={() => onStartSession(day)}
          activeOpacity={0.88}
          style={styles.startSessionBtnWrap}
        >
          <LinearGradient
            colors={["#FF5E3A", "#FF2D55"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startSessionBtnInner}
          >
            <Ionicons name="play" size={22} color="#fff" />
            <Text style={styles.startSessionBtnText}>Start Workout Session</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Stats HUD strip */}
        <View style={[styles.statsStrip, { backgroundColor: colors.card, borderColor: colors.border, borderBottomWidth: 1, paddingVertical: 12 }]}>
          <StripStat icon="time-outline" label={day.estimatedDuration ?? "45 min"} />
          <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />
          <StripStat icon="flame-outline" label={`${day.estimatedCalories ?? 0} kcal`} color={colors.primary} />
          <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />
          <StripStat icon="layers-outline" label={`${day.exercises?.length ?? 0} exercises`} />
        </View>

        {/* Exercise list by section */}
        <View style={styles.playlistList}>
          {(day.sections?.length ? day.sections : [{ id: "main", title: "Workout", durationMinutes: 0, exercises: day.exercises ?? [] }]).map((section: any) => (
            <View key={section.id}>
              <Text style={[styles.playlistSectionTitle, { color: colors.foreground }]}>
                {section.title}{section.durationMinutes ? ` � ${section.durationMinutes} min` : ""}
              </Text>
              {(section.exercises ?? []).map((ex: any, idx: number) => (
                <PlaylistItem
                  key={ex.id + section.id + idx}
                  exercise={ex}
                  partNumber={idx + 1}
                  expanded={expandedId === ex.id}
                  onToggle={() => {
                    void hapticSelection();
                    setTutorialExercise({ ...ex, partNumber: idx + 1 });
                  }}
                />
              ))}
            </View>
          ))}

          {day.isCardio && day.exercises?.length === 0 && !day.sections?.length && (
            <View style={[styles.cardioCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="bicycle" size={40} color="#FF5E3A" />
              <Text style={styles.cardioTitle}>Cardio Session</Text>
              <Text style={styles.cardioSub}>Choose your preferred activity — treadmill, bike, or jump rope. Aim for 65–75% max heart rate for {day.estimatedDuration ?? "30 min"}.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ExerciseTutorialModal
        exercise={tutorialExercise}
        visible={!!tutorialExercise}
        onClose={() => setTutorialExercise(null)}
        onLog={() => {
          setTutorialExercise(null);
          onStartSession(day);
        }}
      />
    </View>
  );
}

function StripStat({ icon, label, color }: { icon: any; label: string; color?: string }) {
  const colors = useColors();
  const styles = useWorkoutStyles();
  const tint = color ?? colors.mutedForeground;
  return (
    <View style={styles.stripStat}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.stripStatText, { color: tint }]}>{label}</Text>
    </View>
  );
}

function PlaylistItem({ exercise: ex, partNumber, expanded, onToggle }: any) {
  const colors = useColors();
  const styles = useWorkoutStyles();
  const diffColor = DIFF_COLOR[ex.difficulty] ?? colors.mutedForeground;
  const fallbackImage = getWorkoutImage(partNumber - 1);
  const totalCal = (ex.estimatedCaloriesPerSet ?? 12) * (ex.sets ?? 3);

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85} style={[styles.playlistItem, { borderColor: colors.border, borderWidth: 1 }]}>
      <View style={styles.playlistImgWrap}>
        {ex.gifUrl ? (
          <Image source={{ uri: ex.gifUrl }} style={styles.playlistImg} resizeMode="cover" />
        ) : (
          <Image source={{ uri: fallbackImage }} style={styles.playlistImg} resizeMode="cover" />
        )}
      </View>
      <View style={styles.playlistContent}>
        <Text style={styles.playlistName} numberOfLines={2}>{ex.name}</Text>
        <View style={styles.playlistMeta}>
          <Text style={styles.playlistMetaText}>
            {ex.sets ?? 3} sets � {ex.repsRange ?? "10-12"}{String(ex.repsRange ?? "").includes("min") || String(ex.repsRange ?? "").includes("sec") ? "" : " reps"}
          </Text>
          <Text style={styles.playlistMetaDot}> · </Text>
          <Text style={styles.playlistMetaText}>{ex.target || ex.bodyPart}</Text>
        </View>
        <View style={styles.playlistTags}>
          <View style={[styles.playlistTag, { backgroundColor: diffColor + "15" }]}>
            <Text style={[styles.playlistTagText, { color: diffColor }]}>{ex.difficulty}</Text>
          </View>
          <View style={[styles.playlistTag, { backgroundColor: colors.primary + "12" }]}>
            <Ionicons name="flame-outline" size={9} color={colors.primary} />
            <Text style={[styles.playlistTagText, { color: colors.primary }]}>~{totalCal} kcal</Text>
          </View>
          <View style={[styles.playlistTag, { backgroundColor: colors.muted }]}>
            <Text style={styles.playlistTagText}>{ex.equipment || "Body weight"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.playlistChevron}>
        <Ionicons name={expanded ? "chevron-up" : "chevron-forward"} size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

// --- COMPLETED WORKOUT CARD FOR HISTORY LIST ---
function CompletedWorkoutCard({ workout, colors }: { workout: CompletedWorkout; colors: any }) {
  const styles = useWorkoutStyles();
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard style={[styles.historyCard, expanded ? { borderColor: ORANGE + "40" } : undefined] as any} elevated shadowLevel="soft" onPress={() => setExpanded(!expanded)}>
      <View style={styles.historyCardTop}>
        <View style={styles.historyCardLeft}>
          <View style={[styles.historyDayBadge, { backgroundColor: ORANGE + "18" }]}>
            <Ionicons name="barbell-outline" size={18} color={ORANGE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.historyWorkoutName, { color: colors.foreground }]}>{workout.focus} Day Session</Text>
            <Text style={[styles.historyWorkoutDate, { color: colors.mutedForeground }]}>
              {new Date(workout.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <Text style={[styles.historyWorkoutKcal, { color: ORANGE }]}>{workout.calories} kcal</Text>
          <Text style={[styles.historyWorkoutDuration, { color: colors.mutedForeground }]}>{workout.duration} mins</Text>
        </View>
      </View>

      <View style={styles.historyCardSummaryLine}>
        <Text style={[styles.historySummaryText, { color: colors.mutedForeground }]}>
          {workout.exercises.length} exercises · {workout.setsCount} sets logged · {workout.totalVolume} kg volume
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-forward"} size={14} color={colors.mutedForeground} />
      </View>

      {expanded && (
        <View style={styles.historyCardExpandedList}>
          {workout.exercises.map((ex, idx) => (
            <View key={idx} style={[styles.historyExRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.historyExNameText, { color: colors.foreground }]} numberOfLines={1}>
                {ex.name}
              </Text>
              <View style={styles.historyExSetsRow}>
                {ex.setsLogged.map((set, sIdx) => (
                  <View key={sIdx} style={[styles.historyExSetBox, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.historyExSetText, { color: colors.foreground }]}>
                      {set.weight}kg × {set.reps}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

function ExerciseTutorialModal({ exercise, visible, onClose, onLog }: any) {
  const colors = useColors();
  const styles = useWorkoutStyles();
  if (!exercise) return null;

  const partNumber = exercise.partNumber ?? 1;
  const youtubeEmbedUrl = getYoutubeEmbedUrl(exercise);
  const videoUri = getExerciseVideoUrl(exercise);
  const mediaUri = exercise.gifUrl || getWorkoutImage(partNumber - 1);
  const totalCal = (exercise.estimatedCaloriesPerSet ?? 12) * (exercise.sets ?? 3);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.tutorialRoot, { backgroundColor: colors.background }]}>
        <View style={styles.tutorialMedia}>
          {youtubeEmbedUrl ? (
            <TutorialYoutube embedUrl={youtubeEmbedUrl} />
          ) : videoUri ? (
            <TutorialVideo sourceUri={videoUri} />
          ) : (
            <Image source={{ uri: mediaUri }} style={styles.tutorialFallbackMedia} resizeMode="cover" />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.42)", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.84)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.tutorialTopBar}>
            <TouchableOpacity onPress={onClose} style={styles.tutorialCircleBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.tutorialLivePill}>
              <View style={styles.tutorialLiveDot} />
              <Text style={styles.tutorialLiveText}>{youtubeEmbedUrl || videoUri ? "Video Tutorial" : "Tutorial"}</Text>
            </View>
          </View>

          <View style={styles.tutorialSideActions}>
            <TouchableOpacity style={styles.tutorialSideBtn} onPress={onLog}>
              <Ionicons name="checkmark-circle" size={25} color="#fff" />
              <Text style={styles.tutorialSideText}>Log</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tutorialSideBtn}>
              <Ionicons name="heart-outline" size={25} color="#fff" />
              <Text style={styles.tutorialSideText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tutorialBottomPanel}>
            <Text style={styles.tutorialPart}>Part {partNumber}</Text>
            <Text style={styles.tutorialTitle}>{exercise.name}</Text>
            <View style={styles.tutorialMetaRow}>
              <View style={styles.tutorialMetaPill}>
                <Ionicons name="repeat-outline" size={12} color="#fff" />
                <Text style={styles.tutorialMetaText}>{exercise.sets ?? 3} sets</Text>
              </View>
              <View style={styles.tutorialMetaPill}>
                <Ionicons name="timer-outline" size={12} color="#fff" />
                <Text style={styles.tutorialMetaText}>{exercise.repsRange ?? "10-12"}</Text>
              </View>
              <View style={styles.tutorialMetaPill}>
                <Ionicons name="flame" size={12} color={ORANGE} />
                <Text style={styles.tutorialMetaText}>~{totalCal} kcal</Text>
              </View>
            </View>
            <Text style={styles.tutorialHint} numberOfLines={3}>
              {(exercise.instructions ?? [])[0] ??
                `Focus on controlled reps for ${exercise.target || exercise.bodyPart || "the target muscle"}.`}
            </Text>

            <View style={styles.tutorialActions}>
              <TouchableOpacity onPress={onLog} style={styles.tutorialPrimaryBtn}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.tutorialPrimaryText}>Start Active Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.tutorialSecondaryBtn}>
                <Ionicons name="stop-circle-outline" size={18} color="#fff" />
                <Text style={styles.tutorialSecondaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TutorialVideo({ sourceUri }: { sourceUri: string }) {
  const styles = useWorkoutStyles();
  const player = useVideoPlayer(sourceUri, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.tutorialVideo}
      nativeControls={false}
      contentFit="cover"
    />
  );
}

function TutorialYoutube({ embedUrl }: { embedUrl: string }) {
  const styles = useWorkoutStyles();
  return (
    <WebView
      source={{ uri: embedUrl }}
      style={styles.tutorialVideo}
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
    />
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

type WorkoutStyleTokens = {
  text: string;
  muted: string;
  card: string;
  surface: string;
  border: string;
  darkCardTo: string;
};

function createWorkoutStyles(t: WorkoutStyleTokens) {
  return StyleSheet.create({
  root: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, gap: 14 },
  bgGlowPurple: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  bgGlowPink: {
    position: "absolute",
    bottom: -100,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
  },

  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  avatarWrap: {},
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontFamily: "Inter_700Bold", color: t.text },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: t.card, alignItems: "center", justifyContent: "center", shadowColor: "#111827", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },

  // Sub-tabs styling
  subTabsContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    width: "100%",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  subTabButtonText: {
    fontSize: 13,
  },

  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.card, borderRadius: 15, paddingHorizontal: 14, height: 48, shadowColor: "#111827", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: t.text },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -4 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: t.text },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium", color: t.muted },

  categoryList: { gap: 10, paddingBottom: 4, paddingRight: 20 },
  categoryExerciseList: { gap: 10, paddingBottom: 12, paddingRight: 20 },
  categoryExerciseCard: { width: 130, borderRadius: 14, padding: 10, gap: 6, borderWidth: 1 },
  categoryExerciseImg: { width: "100%", height: 72, borderRadius: 10 },
  categoryExerciseName: { fontSize: 12, fontFamily: "Inter_600SemiBold", minHeight: 32 },
  categoryExerciseMeta: { fontSize: 10, fontFamily: "Inter_400Regular" },
  inPlanPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  inPlanPillText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  categoryPill: { alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 15, minWidth: 80, shadowColor: "#111827", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  catIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  featuredCard: { height: 220, borderRadius: 24, overflow: "hidden", justifyContent: "space-between", padding: 18, backgroundColor: t.darkCardTo },
  featuredImage: { borderRadius: 24 },
  featuredTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  beginnerBadge: { backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  beginnerText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  bookmarkBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.28)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  featuredBody: { gap: 8 },
  featuredTitle: { color: "#fff", fontSize: 25, fontFamily: "Inter_700Bold", lineHeight: 31 },
  coachRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  coachAvatarSmall: { width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  coachName: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontFamily: "Inter_400Regular" },
  featuredStats: { flexDirection: "row", gap: 18 },
  featStatItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  featStatVal: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  featStatLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter_400Regular" },

  activeItem: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: t.card, borderRadius: 17, padding: 12, shadowColor: "#111827", shadowOpacity: 0.045, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 1, overflow: "hidden" },
  activeStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  activeImage: { width: 52, height: 52, borderRadius: 16, backgroundColor: t.surface },
  activeName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: t.text },
  activeMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 4 },
  activePill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: t.surface, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  activePillText: { fontSize: 10, fontFamily: "Inter_400Regular", color: t.muted },
  activeProgressBar: { height: 3, borderRadius: 2, backgroundColor: t.border, marginTop: 8, overflow: "hidden" },
  activeProgressFill: { height: 3, borderRadius: 2 },

  emptyCard: { backgroundColor: t.card, borderRadius: 16, padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: t.muted, textAlign: "center" },

  playlistHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 20, paddingBottom: 18 },
  backBtn: { paddingTop: 2 },
  playlistTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: t.text, lineHeight: 30 },
  playlistSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: t.muted, marginTop: 3, lineHeight: 20 },

  statsStrip: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginHorizontal: 20, marginBottom: 12 },
  stripStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  stripStatText: { fontSize: 13, fontFamily: "Inter_500Medium", color: t.muted },
  stripDivider: { width: 1, height: 16, backgroundColor: "#E8E8EE" },

  playlistList: { paddingHorizontal: 20, gap: 12 },
  playlistSectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 8, marginTop: 4 },

  playlistItem: { padding: 12, borderRadius: 18, backgroundColor: t.card, flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center", shadowColor: "#111827", shadowOpacity: 0.045, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 1 },
  playlistImgWrap: {},
  playlistImg: { width: 72, height: 72, borderRadius: 16, backgroundColor: t.surface },
  playlistContent: { flex: 1, gap: 4 },
  partLabel: { fontSize: 11, fontFamily: "Inter_700Bold", color: ORANGE, letterSpacing: 0.3, textTransform: "uppercase" },
  playlistName: { fontSize: 15, fontFamily: "Inter_700Bold", color: t.text, lineHeight: 21 },
  playlistMeta: { flexDirection: "row", alignItems: "center" },
  playlistMetaText: { fontSize: 12, fontFamily: "Inter_400Regular", color: t.muted },
  playlistMetaDot: { fontSize: 12, color: t.muted },
  playlistTags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  playlistTag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  playlistTagText: { fontSize: 10, fontFamily: "Inter_500Medium", color: t.muted },
  playlistChevron: { alignSelf: "center" },

  cardioCard: { alignItems: "center", gap: 10, padding: 32 },
  cardioTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: t.text },
  cardioSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: t.muted, textAlign: "center", lineHeight: 22 },

  // Tutorial overlay
  tutorialRoot: { flex: 1, backgroundColor: "#05070A" },
  tutorialMedia: { flex: 1, justifyContent: "space-between", overflow: "hidden" },
  tutorialVideo: { ...StyleSheet.absoluteFillObject },
  tutorialFallbackMedia: { ...StyleSheet.absoluteFillObject, opacity: 0.96 },
  tutorialTopBar: { paddingTop: 54, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tutorialCircleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.34)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  tutorialLivePill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(0,0,0,0.38)", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  tutorialLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  tutorialLiveText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  tutorialSideActions: { position: "absolute", right: 18, top: "38%", gap: 22, alignItems: "center" },
  tutorialSideBtn: { alignItems: "center", gap: 5 },
  tutorialSideText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tutorialBottomPanel: { paddingHorizontal: 20, paddingBottom: 34, gap: 10 },
  tutorialPart: { color: ORANGE, fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  tutorialTitle: { color: "#fff", fontSize: 28, lineHeight: 34, fontFamily: "Inter_700Bold" },
  tutorialMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tutorialMetaPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tutorialMetaText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tutorialHint: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", maxWidth: width - 86 },
  tutorialActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  tutorialPrimaryBtn: { flex: 1.2, height: 50, borderRadius: 15, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  tutorialPrimaryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  tutorialSecondaryBtn: { flex: 1, height: 50, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  tutorialSecondaryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },

  // Floating Resumable Session Bar
  resumeBar: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 999,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  resumeDotWrap: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ffffff30",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  resumeLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  resumeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  resumeBtn: {
    backgroundColor: "#ffffff22",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#ffffff40",
  },
  resumeBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // Active Session Player Overlay Styles
  sessionPlayerRoot: {
    flex: 1,
  },
  playerHeaderFixed: {
    zIndex: 10,
    elevation: 10,
  },
  playerScroll: {
    flex: 1,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  playerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  playerHeaderCenter: {
    alignItems: "center",
  },
  playerHeaderTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  playerLiveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  playerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ORANGE,
  },
  playerTimeText: {
    fontSize: 16,
    fontWeight: "800",
    color: ORANGE,
  },
  playerFinishBtn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  playerFinishBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  playerProgressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
  },
  playerProgressLeft: {
    flex: 1,
    gap: 2,
  },
  progressRingWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingTextWrap: {
    position: "absolute",
  },
  progressPctText: {
    fontSize: 13,
    fontWeight: "800",
  },
  playerExercisesList: {
    gap: 12,
  },
  playerExRow: {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  playerExLeft: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  playerExNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  playerExNumberTxt: {
    fontSize: 12,
    fontWeight: "700",
  },
  playerExName: {
    fontSize: 15,
    fontWeight: "700",
  },
  playerExMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  loggedSetsSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  summarySetPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  summarySetText: {
    fontSize: 10,
    fontWeight: "600",
  },
  playerExLogBtn: {
    width: "100%",
    height: 38,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  playerExLogBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Set logging Modal Sheet
  loggingOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  loggingSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    gap: 14,
  },
  loggingHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  loggingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  loggingExName: {
    fontSize: 18,
    fontWeight: "800",
    maxWidth: width - 80,
  },
  loggingCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loggingList: {
    maxHeight: 320,
  },
  loggingProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  loggingProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  loggingProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  loggingProgressLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    minWidth: 72,
    textAlign: "right",
  },
  loggingTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  loggingColHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  loggingColSet: {
    width: 44,
  },
  loggingColWeight: {
    flex: 1.2,
    marginRight: 8,
  },
  loggingColReps: {
    flex: 1,
    marginRight: 8,
  },
  loggingColAction: {
    width: 40,
  },
  logSetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  logSetIndexWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logSetIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logSetIndexText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  logSetSummary: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  logStepperCol: {
    justifyContent: "center",
  },
  logStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    height: 42,
  },
  logStepperBtn: {
    width: 36,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
  },
  logStepperBtnRight: {
    borderRightWidth: 0,
    borderLeftWidth: 1,
  },
  logStepperInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    paddingVertical: 0,
    minWidth: 44,
  },
  logActionWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loggingHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },

  // Rest Timer modal overlay
  restModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  restModalCard: {
    width: "100%",
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  restModalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ORANGE_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  restCircleWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  restCircleTextWrap: {
    position: "absolute",
    alignItems: "center",
  },
  restSecondsText: {
    fontSize: 34,
    fontWeight: "900",
  },
  restSecondsLbl: {
    fontSize: 10,
    marginTop: -2,
  },
  restModalCtas: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  restSecBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  restPriBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  restPriBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Completed Workouts Summary Overlay
  summaryOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  summaryCard: {
    padding: 24,
    borderWidth: 1,
    gap: 14,
    alignItems: "center",
  },
  summaryHeaderLine: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  summaryTrophy: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
  },
  summaryStatsGrid: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  summaryStatBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  summaryStatLabel: {
    fontSize: 8,
    fontWeight: "500",
  },
  summaryPRBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
    marginTop: 4,
  },
  summaryDoneBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  sessionCloseOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sessionCloseCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  sessionCloseTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  sessionCloseBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  sessionCloseBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCloseBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  summaryDoneText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // History Tab Specific Styles
  historyContainer: {
    width: "100%",
    gap: 12,
  },
  calendarCard: {
    width: "100%",
    padding: 18,
    gap: 12,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "space-between",
  },
  calendarDay: {
    width: (width - 64 - 36) / 7,
    height: (width - 64 - 36) / 7,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  calendarDayText: {
    fontSize: 11,
    fontWeight: "700",
  },
  calendarLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyStatsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: t.card,
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  historyStatBox: {
    alignItems: "center",
    gap: 3,
  },
  historyStatVal: {
    fontSize: 20,
    fontWeight: "800",
  },
  historyStatLbl: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.4,
  },
  historyStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#ECEEF3",
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    width: "100%",
    padding: 16,
    gap: 12,
  },
  historyCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  historyCardLeft: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flex: 1,
  },
  historyDayBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyWorkoutName: {
    fontSize: 15,
    fontWeight: "700",
  },
  historyWorkoutDate: {
    fontSize: 11,
    marginTop: 2,
  },
  historyWorkoutKcal: {
    fontSize: 15,
    fontWeight: "800",
  },
  historyWorkoutDuration: {
    fontSize: 11,
  },
  historyCardSummaryLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 10,
  },
  historySummaryText: {
    fontSize: 11,
  },
  historyCardExpandedList: {
    marginTop: 4,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 10,
  },
  historyExRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },
  historyExNameText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1.2,
  },
  historyExSetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    flex: 1.8,
    justifyContent: "flex-end",
  },
  historyExSetBox: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyExSetText: {
    fontSize: 9,
    fontWeight: "500",
  },

  // Insights Tab Specific Styles
  insightsContainer: {
    width: "100%",
    gap: 14,
  },
  progressionChartCard: {
    width: "100%",
    padding: 18,
    gap: 14,
  },
  chartDropdownHeader: {
    gap: 8,
  },
  exerciseSelectRow: {
    gap: 8,
    paddingVertical: 4,
  },
  exerciseSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "transparent",
  },
  exerciseSelectChipText: {
    fontSize: 11,
  },
  chartDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  svgChartWrapper: {
    width: "100%",
    alignItems: "center",
    marginTop: 6,
  },
  chartXLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
    marginTop: 6,
  },
  chartXLabelText: {
    fontSize: 9,
  },
  chartEmptyState: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  chartEmptyText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  prGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  prCard: {
    width: (width - 42) / 2,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
    flexGrow: 1,
  },
  prBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  prWeight: {
    fontSize: 18,
    fontWeight: "800",
  },
  prExerciseName: {
    fontSize: 11,
    textAlign: "center",
  },

  // Active Session Player Buttons & SVGs
  startSessionBtnWrap: {
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
  },
  startSessionBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  startSessionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  // Premium Immersive active workout elements
  playerQuoteBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  playerQuoteText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  playerExHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  playerExBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  playerExBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  playerHudStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  playerHudStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  playerHudStatVal: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  playerHudStatDivider: {
    width: 1,
    height: 12,
  },
  loggingToast: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100,
  },
  loggingToastText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  loggingGoalStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  loggingGoalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  loggingGoalText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  });
}

function useWorkoutStyles() {
  const colors = useColors();
  return useMemo(
    () =>
      createWorkoutStyles({
        text: colors.foreground,
        muted: colors.mutedForeground,
        card: colors.card,
        surface: colors.surface,
        border: colors.border,
        darkCardTo: colors.workoutCardGradient[colors.workoutCardGradient.length - 1] ?? colors.card,
      }),
    [colors],
  );
}
