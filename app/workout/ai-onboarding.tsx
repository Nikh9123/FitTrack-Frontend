/**
 * AI Workout Onboarding Screen
 * ----------------------------
 * First-time onboarding: goal selection + AI recommendation + plan generation.
 * Shown when user hasn't completed workout onboarding yet.
 */

import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type FitnessGoal =
  | "Fat Loss"
  | "Muscle Gain"
  | "Body Recomposition"
  | "Strength"
  | "Athletic Performance"
  | "General Fitness";

type Step = "goal" | "generating" | "plan-ready" | "saving";

type WorkoutLocation = "gym" | "home";

type PlanSource = "ai" | "trainer";

interface UserMetricsSnapshot {
  bodyFat: string | null;
  bmi: string | null;
  skeletalMuscleMass: string | null;
  visceralFat: string | null;
  weight: string | null;
  targetWeight: string | null;
  hasInBodyReport: boolean;
}

interface AIRecommendation {
  recommendedGoal: FitnessGoal;
  reasoning: string;
  transformationPriority: string;
  estimatedTimeline: string;
  beginnerSuitability: string;
  confidence: number;
}

interface ExerciseCard {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  gifUrl: string;
  instructions: string[];
  sets: number;
  repsRange: string;
  restSeconds: number;
  estimatedCaloriesPerSet: number;
  difficulty: string;
}

interface PlanDay {
  dayName: string;
  focus: string;
  isRest: boolean;
  isCardio: boolean;
  estimatedCalories: number;
  estimatedDuration: string;
  exercises: ExerciseCard[];
  sections?: Array<{
    id: string;
    title: string;
    durationMinutes: number;
    exercises: ExerciseCard[];
  }>;
}

interface WorkoutStrategy {
  split: string;
  splitName: string;
  daysPerWeek: number;
  sessionDuration: string;
  intensity: string;
  cardioFrequency: string;
  progressionStyle: string;
  beginnerFriendly: boolean;
}

// ─── Goal definitions ─────────────────────────────────────────────────────────

const GOALS: Array<{
  key: FitnessGoal;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}> = [
  { key: "Fat Loss", icon: "flame-outline", color: "#FF6B35", description: "Burn fat, improve metabolic health and body composition" },
  { key: "Muscle Gain", icon: "barbell-outline", color: "#8B5CF6", description: "Build lean muscle mass and increase overall strength" },
  { key: "Body Recomposition", icon: "swap-horizontal-outline", color: "#3B82F6", description: "Lose fat and gain muscle simultaneously" },
  { key: "Strength", icon: "fitness-outline", color: "#F59E0B", description: "Increase maximal strength in key compound movements" },
  { key: "Athletic Performance", icon: "bicycle-outline", color: "#22C55E", description: "Improve speed, power, and sports performance" },
  { key: "General Fitness", icon: "heart-outline", color: "#EC4899", description: "Build healthy habits and overall fitness baseline" },
];

function metricsFromExtracted(raw: Record<string, string> | null | undefined): UserMetricsSnapshot {
  return {
    bodyFat: raw?.bodyFat ?? null,
    bmi: raw?.bmi ?? null,
    skeletalMuscleMass: raw?.skeletalMuscleMass ?? null,
    visceralFat: raw?.visceralFat ?? null,
    weight: raw?.weight ?? null,
    targetWeight: raw?.targetWeight ?? null,
    hasInBodyReport: Boolean(raw && Object.keys(raw).length > 0),
  };
}

function planDisplayTitle(goal: FitnessGoal, strategy: WorkoutStrategy): string {
  const byGoal: Record<FitnessGoal, string> = {
    "Fat Loss": "Fat Loss Workout Plan",
    "Muscle Gain": "Muscle Gain Plan",
    "Body Recomposition": "Body Recomposition Plan",
    Strength: "Strength Training Plan",
    "Athletic Performance": "Athletic Performance Plan",
    "General Fitness": "General Fitness Plan",
  };
  const splitName = strategy.splitName?.trim() ?? "";
  const splitLower = splitName.toLowerCase();
  if (goal === "Fat Loss" && (splitLower.includes("push pull") || splitLower === "push pull legs")) {
    return byGoal[goal];
  }
  return splitName || byGoal[goal];
}

const DIFF_COLOR: Record<string, string> = {
  Beginner: "#22C55E",
  Intermediate: "#F59E0B",
  Advanced: "#EF4444",
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onComplete: (plan: PlanDay[], goal: FitnessGoal, strategy: WorkoutStrategy, workoutLocation?: WorkoutLocation) => void | Promise<void>;
  onSkip: () => void;
}

export default function AIWorkoutOnboarding({ onComplete, onSkip }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [step, setStep] = useState<Step>("goal");
  const [planSource, setPlanSource] = useState<PlanSource>("ai");
  const [workoutLocation, setWorkoutLocation] = useState<WorkoutLocation>("gym");
  const [hasTrainerAssigned, setHasTrainerAssigned] = useState(false);
  const [trainerName, setTrainerName] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);
  const [aiRecommendation, setAIRecommendation] = useState<AIRecommendation | null>(null);
  const [metricsConsidered, setMetricsConsidered] = useState<UserMetricsSnapshot | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<PlanDay[]>([]);
  const [strategy, setStrategy] = useState<WorkoutStrategy | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  function resolveApiHost() {
    const hostUri =
      typeof Constants.manifest?.debuggerHost === "string"
        ? Constants.manifest.debuggerHost
        : typeof Constants.expoConfig?.hostUri === "string"
        ? Constants.expoConfig.hostUri
        : null;

    if (hostUri) {
      const host = hostUri.includes("//")
        ? hostUri.split("//")[1].split(":")[0]
        : hostUri.split(":")[0];

      if (Platform.OS === "android" && host === "localhost") {
        return "10.0.2.2";
      }

      return host;
    }

    return Platform.OS === "android" ? "10.0.2.2" : "localhost";
  }

  function getApiBase() {
    const EXPO_PUBLIC_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
    if (EXPO_PUBLIC_DOMAIN) return `https://${EXPO_PUBLIC_DOMAIN}`;
    return `http://${resolveApiHost()}:5000`;
  }

  async function apiCall(path: string, method = "GET", body?: unknown) {
    const res = await fetch(`${getApiBase()}/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
  }

  const transition = useCallback((fn: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  React.useEffect(() => {
    void (async () => {
      try {
        const data = await apiCall("/workout/onboarding/status");
        if (data.hasTrainerAssigned) {
          setHasTrainerAssigned(true);
          setTrainerName(data.trainerName ?? null);
          setPlanSource("trainer");
        }
        const snapshot =
          data.metricsConsidered ??
          (data.hasInBodyReport && data.inBodyMetrics
            ? metricsFromExtracted(data.inBodyMetrics as Record<string, string>)
            : null);
        if (snapshot?.hasInBodyReport) {
          setMetricsConsidered(snapshot);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [token]);

  // ── Unified build (AI goal + structured plan in one step) ─────────────────
  const handleBuildPlan = async () => {
    if (planSource === "trainer") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Trainer-assigned plan",
        hasTrainerAssigned
          ? `${trainerName ?? "Your trainer"} manages your workout program. Contact them for updates.`
          : `Ask your gym trainer to assign a program in Veera. You can still build an AI plan anytime.`,
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let prefetchedMetrics = metricsConsidered;
    try {
      const status = await apiCall("/workout/onboarding/status");
      prefetchedMetrics =
        status.metricsConsidered ??
        (status.hasInBodyReport && status.inBodyMetrics
          ? metricsFromExtracted(status.inBodyMetrics as Record<string, string>)
          : prefetchedMetrics);
    } catch {
      /* use cached metrics */
    }

    transition(() => {
      if (prefetchedMetrics?.hasInBodyReport) {
        setMetricsConsidered(prefetchedMetrics);
      }
      setStep("generating");
    });

    try {
      const data = await apiCall("/workout/onboarding/generate-unified", "POST", {
        goal: selectedGoal,
        useAiGoal: !selectedGoal,
        level: "beginner",
        workoutLocation,
      });

      if (data.planSource === "trainer" || data.error?.includes("trainer")) {
        throw new Error(data.error ?? "Trainer plan active");
      }

      if (data.success && data.plan) {
        const goal = (selectedGoal ?? data.aiRecommendation?.recommendedGoal ?? data.goal) as FitnessGoal;
        transition(() => {
          setSelectedGoal(goal);
          setGeneratedPlan(data.plan);
          setStrategy(data.strategy);
          setMetricsConsidered(data.metricsConsidered ?? null);
          if (data.aiRecommendation) setAIRecommendation(data.aiRecommendation);
          setStep("plan-ready");
        });
      } else {
        throw new Error(data.error ?? "Plan generation failed");
      }
    } catch (err: unknown) {
      transition(() => setStep("goal"));
      const msg = err instanceof Error ? err.message : "Could not build your workout plan. Please try again.";
      Alert.alert("Plan generation failed", msg);
    }
  };

  // ── Save & Finish ────────────────────────────────────────────────────────────
  const handleSaveAndFinish = async () => {
    if (!selectedGoal || !strategy) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    transition(() => setStep("saving"));

    try {
      const saveRes = await apiCall("/workout/onboarding/save", "POST", {
        goal: selectedGoal,
        aiRecommendedGoal: aiRecommendation?.recommendedGoal ?? null,
        workoutPlan: generatedPlan,
        strategy,
        workoutLocation,
      });
      if (saveRes.error) {
        throw new Error(saveRes.error);
      }

      await onComplete(generatedPlan, selectedGoal, strategy, workoutLocation);
    } catch (err: unknown) {
      transition(() => setStep("plan-ready"));
      const msg = err instanceof Error ? err.message : "Could not save your plan. Please try again.";
      Alert.alert("Save failed", msg);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "12", colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {step === "goal" && (
          <GoalStep
            colors={colors}
            topPad={topPad}
            insets={insets}
            selectedGoal={selectedGoal}
            workoutLocation={workoutLocation}
            onWorkoutLocationChange={setWorkoutLocation}
            planSource={planSource}
            hasTrainerAssigned={hasTrainerAssigned}
            trainerName={trainerName}
            onSelectGoal={setSelectedGoal}
            onSelectPlanSource={setPlanSource}
            onBuildPlan={handleBuildPlan}
            onSkip={onSkip}
          />
        )}

        {step === "generating" && (
          <LoadingStep
            colors={colors}
            title="Building Your Personalised Plan"
            subtitle="AI is reviewing your metrics, designing strategy, and pulling exercises from the catalog…"
            metrics={metricsConsidered}
          />
        )}

        {step === "saving" && (
          <LoadingStep
            colors={colors}
            title="Adding Plan to Your Profile"
            subtitle="Saving your workout schedule and syncing exercises to your account…"
            metrics={metricsConsidered}
            steps={["Saving preferences", "Writing exercises", "Updating your schedule"]}
          />
        )}

        {step === "plan-ready" && strategy && (
          <PlanReadyStep
            colors={colors}
            topPad={topPad}
            insets={insets}
            goal={selectedGoal!}
            workoutLocation={workoutLocation}
            strategy={strategy}
            plan={generatedPlan}
            aiRecommendation={aiRecommendation}
            metricsConsidered={metricsConsidered}
            expandedDay={expandedDay}
            expandedEx={expandedEx}
            onToggleDay={(d: string) => setExpandedDay(expandedDay === d ? null : d)}
            onToggleEx={(e: string) => setExpandedEx(expandedEx === e ? null : e)}
            onSave={handleSaveAndFinish}
            onBack={() => transition(() => setStep("goal"))}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ─── Goal Selection Step ──────────────────────────────────────────────────────

function GoalStep({
  colors,
  topPad,
  insets,
  selectedGoal,
  workoutLocation,
  onWorkoutLocationChange,
  planSource,
  hasTrainerAssigned,
  trainerName,
  onSelectGoal,
  onSelectPlanSource,
  onBuildPlan,
  onSkip,
}: any) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.onboardingHeader}>
        <View style={[styles.sparkBadge, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={[styles.sparkText, { color: colors.primary }]}>Workout Plan Setup</Text>
        </View>
        <Text style={[styles.onboardingTitle, { color: colors.foreground }]}>What's your{"\n"}fitness goal?</Text>
        <Text style={[styles.onboardingSubtitle, { color: colors.mutedForeground }]}>
          Choose AI Coach or a trainer-assigned plan. One tap builds warm-up, 13 min cardio, 40 min strength, and stretch sections.
        </Text>
      </View>

      <View style={[styles.locationRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(["gym", "home"] as WorkoutLocation[]).map((loc) => {
          const active = workoutLocation === loc;
          return (
            <TouchableOpacity
              key={loc}
              onPress={() => {
                Haptics.selectionAsync();
                onWorkoutLocationChange(loc);
              }}
              style={[
                styles.locationChip,
                active && { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name={loc === "gym" ? "barbell-outline" : "home-outline"}
                size={16}
                color={active ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text style={[styles.locationChipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {loc === "gym" ? "Gym" : "Home"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.locationHint, { color: colors.mutedForeground }]}>
        We'll pick exercises for your setup
      </Text>

      <View style={styles.sourceRow}>
        {([
          { key: "ai" as PlanSource, icon: "sparkles", label: "AI Coach", desc: "Uses your InBody + 2,000+ exercises" },
          { key: "trainer" as PlanSource, icon: "person", label: "From Trainer", desc: hasTrainerAssigned ? `${trainerName ?? "Trainer"} assigned` : "Gym trainer program" },
        ]).map((src) => {
          const active = planSource === src.key;
          return (
            <TouchableOpacity
              key={src.key}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectPlanSource(src.key);
              }}
              style={[
                styles.sourceCard,
                {
                  backgroundColor: active ? colors.primary + "12" : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: 1.5,
                },
                colors.shadow.soft,
              ]}
            >
              <Ionicons name={src.icon as any} size={20} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.goalCardTitle, { color: colors.foreground, marginTop: 8 }]}>{src.label}</Text>
              <Text style={[styles.goalCardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{src.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {planSource === "ai" ? (
        <>
          <View style={styles.goalGrid}>
            {GOALS.map((g) => {
              const active = selectedGoal === g.key;
              return (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelectGoal(g.key);
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.goalCard,
                    { backgroundColor: colors.card, ...colors.shadow.soft },
                    active && { borderWidth: 2, borderColor: g.color },
                  ]}
                >
                  {active && (
                    <LinearGradient
                      colors={[g.color + "18", g.color + "04"]}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                  <View style={[styles.goalIconWrap, { backgroundColor: g.color + (active ? "25" : "15") }]}>
                    <Ionicons name={g.icon} size={24} color={g.color} />
                  </View>
                  <Text style={[styles.goalCardTitle, { color: colors.foreground }]}>{g.key}</Text>
                  <Text style={[styles.goalCardDesc, { color: colors.mutedForeground }]}>{g.description}</Text>
                  {active && (
                    <View style={[styles.checkBadge, { backgroundColor: g.color }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.aiSuggestionBox, { backgroundColor: colors.card, borderColor: colors.primary + "30", ...colors.shadow.soft }]}>
            <View style={styles.aiSuggestionTop}>
              <Ionicons name="analytics-outline" size={18} color={colors.primary} />
              <Text style={[styles.aiSuggestionTitle, { color: colors.foreground }]}>Smart goal pick</Text>
            </View>
            <Text style={[styles.aiSuggestionDesc, { color: colors.mutedForeground }]}>
              Leave goal unselected and AI recommends from your real InBody — body fat %, muscle mass, visceral fat, BMI, and weight.
            </Text>
            <TouchableOpacity onPress={() => router.push("/inbody" as any)} style={[styles.outlineBtn, { borderColor: colors.border, marginTop: 10 }]}>
              <Ionicons name="camera-outline" size={16} color={colors.foreground} />
              <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>Upload InBody</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={[styles.aiSuggestionBox, { backgroundColor: colors.cyan + "10", borderColor: colors.cyan + "40", ...colors.shadow.soft }]}>
          <View style={styles.aiSuggestionTop}>
            <Ionicons name="person" size={18} color={colors.cyan} />
            <Text style={[styles.aiSuggestionTitle, { color: colors.foreground }]}>Trainer-managed program</Text>
          </View>
          <Text style={[styles.aiSuggestionDesc, { color: colors.mutedForeground }]}>
            {hasTrainerAssigned
              ? `${trainerName ?? "Your trainer"} manages your plan. Switch to AI Coach to regenerate yourself.`
              : "Ask your trainer to assign a plan. Until then, use AI Coach for a temporary program."}
          </Text>
        </View>
      )}

      <View style={styles.bottomBtns}>
        <TouchableOpacity
          onPress={onBuildPlan}
          style={[styles.primaryBtn, { backgroundColor: planSource === "trainer" ? colors.cyan : colors.primary }]}
        >
          <Ionicons name={planSource === "trainer" ? "person" : "flash"} size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {planSource === "trainer" ? "Use Trainer Plan" : selectedGoal ? "Build My Plan" : "Ask AI & Build Plan"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} style={styles.skipLink}>
          <Text style={[styles.skipLinkText, { color: colors.mutedForeground }]}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Loading Step ─────────────────────────────────────────────────────────────

function LoadingStep({
  colors,
  title,
  subtitle,
  metrics,
  steps = ["Reviewing metrics", "Selecting strategy", "Fetching exercises"],
}: {
  colors: any;
  title: string;
  subtitle: string;
  metrics?: UserMetricsSnapshot | null;
  steps?: string[];
}) {
  return (
    <View style={styles.loadingContainer}>
      <View style={[styles.loadingCard, { backgroundColor: colors.card, ...colors.shadow.strong }]}>
        <View style={[styles.loadingIconWrap, { backgroundColor: colors.primary + "15" }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={[styles.loadingTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.loadingSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        {metrics?.hasInBodyReport ? (
          <MetricsPanel colors={colors} metrics={metrics} compact />
        ) : metrics === null || metrics === undefined ? (
          <Text style={[styles.loadingDotText, { color: colors.mutedForeground, marginTop: 12, textAlign: "center" }]}>
            Loading your body composition data…
          </Text>
        ) : (
          <Text style={[styles.loadingDotText, { color: colors.mutedForeground, marginTop: 12, textAlign: "center" }]}>
            No InBody scan on file — using goal-based defaults
          </Text>
        )}
        <View style={[styles.loadingDots, { backgroundColor: colors.muted }]}>
          {steps.map((label) => (
            <View key={label} style={styles.loadingDotRow}>
              <View style={[styles.loadingDotDot, { backgroundColor: colors.primary + "40" }]} />
              <Text style={[styles.loadingDotText, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function MetricsPanel({ colors, metrics, compact }: { colors: any; metrics: UserMetricsSnapshot; compact?: boolean }) {
  const rows = [
    { label: "Body fat", value: metrics.bodyFat ? `${metrics.bodyFat}%` : "—" },
    { label: "Muscle mass", value: metrics.skeletalMuscleMass ? `${metrics.skeletalMuscleMass} kg` : "—" },
    { label: "Visceral fat", value: metrics.visceralFat ?? "—" },
    { label: "BMI", value: metrics.bmi ?? "—" },
    { label: "Weight", value: metrics.weight ? `${metrics.weight} kg` : "—" },
  ];

  return (
    <View style={[styles.metricsPanel, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "25" }, compact && { marginTop: 12 }]}>
      <View style={styles.aiSuggestionTop}>
        <Ionicons name="body-outline" size={16} color={colors.primary} />
        <Text style={[styles.aiSuggestionTitle, { color: colors.foreground, fontSize: 13 }]}>Your data AI considers</Text>
      </View>
      <View style={styles.metricsGrid}>
        {rows.map((r) => (
          <View key={r.label} style={styles.metricCell}>
            <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{r.label}</Text>
            <Text style={[styles.metricValue, { color: colors.foreground }]}>{r.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── AI Result Step ───────────────────────────────────────────────────────────

function AIResultStep({ colors, topPad, insets, recommendation, noReport, onUseGoal, onChooseManually, onUploadReport }: any) {
  if (noReport) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.loadingCard, { backgroundColor: colors.card, ...colors.shadow.strong }]}>
          <View style={[styles.loadingIconWrap, { backgroundColor: colors.yellow + "15" }]}>
            <Ionicons name="document-text-outline" size={36} color={colors.yellow} />
          </View>
          <Text style={[styles.loadingTitle, { color: colors.foreground }]}>InBody Report Needed</Text>
          <Text style={[styles.loadingSubtitle, { color: colors.mutedForeground }]}>
            To give accurate AI recommendations, upload your InBody report first. We'll analyse your body fat, muscle mass, and more.
          </Text>
          <TouchableOpacity
            onPress={onUploadReport}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
          >
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Upload InBody Report</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onChooseManually} style={[styles.outlineBtn, { borderColor: colors.border, marginTop: 10 }]}>
            <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>Choose Goal Manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!recommendation) return null;

  const goal = GOALS.find((g) => g.key === recommendation.recommendedGoal) ?? GOALS[0];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.onboardingHeader}>
        <View style={[styles.sparkBadge, { backgroundColor: colors.primary + "15" }]}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={[styles.sparkText, { color: colors.primary }]}>AI Recommendation</Text>
        </View>
        <Text style={[styles.onboardingTitle, { color: colors.foreground }]}>Your Personalised{"\n"}Goal</Text>
      </View>

      <View style={[styles.aiResultCard, { backgroundColor: colors.card, borderColor: goal.color + "40", ...colors.shadow.strong }]}>
        <LinearGradient
          colors={[goal.color + "15", goal.color + "04"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.aiResultTop}>
          <View style={[styles.aiResultIconWrap, { backgroundColor: goal.color + "20" }]}>
            <Ionicons name={goal.icon} size={28} color={goal.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.aiResultGoalName, { color: colors.foreground }]}>{recommendation.recommendedGoal}</Text>
            <View style={[styles.aiResultConfBadge, { backgroundColor: goal.color + "20" }]}>
              <Text style={[styles.aiResultConfText, { color: goal.color }]}>{recommendation.confidence}% confidence</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.aiResultReasoning, { color: colors.foreground }]}>{recommendation.reasoning}</Text>

        <View style={[styles.aiResultDivider, { backgroundColor: colors.border }]} />

        <View style={styles.aiResultMeta}>
          <AIMetaRow icon="flag-outline" label="Priority" value={recommendation.transformationPriority} color={goal.color} colors={colors} />
          <AIMetaRow icon="time-outline" label="Timeline" value={recommendation.estimatedTimeline} color={goal.color} colors={colors} />
          <AIMetaRow icon="person-outline" label="Suitability" value={recommendation.beginnerSuitability} color={goal.color} colors={colors} />
        </View>
      </View>

      <View style={styles.bottomBtns}>
        <TouchableOpacity
          onPress={() => onUseGoal(recommendation.recommendedGoal)}
          style={[styles.primaryBtn, { backgroundColor: goal.color }]}
        >
          <Ionicons name="flash" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Use This Goal & Generate Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onChooseManually} style={[styles.outlineBtn, { borderColor: colors.border }]}>
          <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>Choose Goal Manually</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AIMetaRow({ icon, label, value, color, colors }: any) {
  return (
    <View style={styles.aiMetaRow}>
      <View style={[styles.aiMetaIconWrap, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View>
        <Text style={[styles.aiMetaLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.aiMetaValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Plan Ready Step ──────────────────────────────────────────────────────────

function PlanReadyStep({ colors, topPad, insets, goal, workoutLocation, strategy, plan, aiRecommendation, metricsConsidered, expandedDay, expandedEx, onToggleDay, onToggleEx, onSave, onBack }: any) {
  const goalMeta = GOALS.find((g) => g.key === goal) ?? GOALS[0];
  const activeDays = plan.filter((d: PlanDay) => !d.isRest);
  const totalCals = activeDays.reduce((s: number, d: PlanDay) => s + d.estimatedCalories, 0);
  const totalExercises = activeDays.reduce((s: number, d: PlanDay) => s + (d.exercises?.length ?? 0), 0);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.planHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={[styles.sparkBadge, { backgroundColor: goalMeta.color + "15" }]}>
            <Ionicons name="checkmark-circle" size={14} color={goalMeta.color} />
            <Text style={[styles.sparkText, { color: goalMeta.color }]}>Plan Ready</Text>
          </View>
          <Text style={[styles.planTitle, { color: colors.foreground }]}>{planDisplayTitle(goal, strategy)}</Text>
          <View style={styles.planSubtitleRow}>
            <Text style={[styles.planSubtitle, { color: colors.mutedForeground }]}>
              {strategy.splitName !== planDisplayTitle(goal, strategy) ? `${strategy.splitName} · ` : ""}
              for {goal} · {totalExercises} exercises/week
            </Text>
            <View style={[styles.locationPill, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons
                name={workoutLocation === "gym" ? "barbell-outline" : "home-outline"}
                size={12}
                color={colors.primary}
              />
              <Text style={[styles.locationPillText, { color: colors.primary }]}>
                {workoutLocation === "gym" ? "Gym" : "Home"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {metricsConsidered?.hasInBodyReport ? (
        <MetricsPanel colors={colors} metrics={metricsConsidered} />
      ) : null}

      {aiRecommendation ? (
        <View style={[styles.aiSuggestionBox, { backgroundColor: colors.card, borderColor: goalMeta.color + "30", marginBottom: 12, ...colors.shadow.soft }]}>
          <Text style={[styles.aiSuggestionDesc, { color: colors.foreground }]}>{aiRecommendation.reasoning}</Text>
        </View>
      ) : null}

      {/* Strategy overview */}
      <View style={[styles.strategyCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
        <LinearGradient
          colors={[goalMeta.color + "12", goalMeta.color + "04"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.strategyGrid}>
          <StratStat icon="calendar-outline" label="Days/Week" value={String(strategy.daysPerWeek)} color={goalMeta.color} colors={colors} />
          <StratStat icon="time-outline" label="Duration" value={strategy.sessionDuration} color={goalMeta.color} colors={colors} />
          <StratStat icon="flame-outline" label="Calories/Wk" value={`~${totalCals}`} color={goalMeta.color} colors={colors} />
          <StratStat icon="pulse-outline" label="Intensity" value={strategy.intensity} color={goalMeta.color} colors={colors} />
        </View>
        <View style={[styles.strategyPillRow]}>
          <Pill label={strategy.split} color={goalMeta.color} />
          <Pill label={strategy.cardioFrequency} color="#3B82F6" />
          <Pill label={strategy.progressionStyle} color="#22C55E" />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weekly Schedule</Text>

      {plan.map((day: PlanDay) => (
        <DayCard
          key={day.dayName}
          day={day}
          colors={colors}
          goalColor={goalMeta.color}
          expanded={expandedDay === day.dayName}
          expandedEx={expandedEx}
          onToggle={() => !day.isRest && onToggleDay(day.dayName)}
          onToggleEx={onToggleEx}
        />
      ))}

      <TouchableOpacity
        onPress={onSave}
        style={[styles.saveBtn, { backgroundColor: goalMeta.color, ...colors.shadow.strong }]}
      >
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>Start This Plan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StratStat({ icon, label, value, color, colors }: any) {
  return (
    <View style={styles.stratStatItem}>
      <View style={[styles.stratStatIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.stratStatValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.stratStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + "18" }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function DayCard({ day, colors, goalColor, expanded, expandedEx, onToggle, onToggleEx }: any) {
  const isRest = day.isRest;
  const dayColor = day.isCardio ? "#22C55E" : isRest ? colors.mutedForeground : goalColor;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={isRest ? 1 : 0.85}
      style={[styles.dayCard, { backgroundColor: colors.card, ...colors.shadow.soft, borderColor: expanded ? dayColor + "60" : "transparent", borderWidth: 1.5 }]}
    >
      <View style={styles.dayCardHeader}>
        <View style={[styles.dayCardIconWrap, { backgroundColor: dayColor + "18" }]}>
          <Ionicons
            name={day.isCardio ? "flame" : isRest ? "moon" : "barbell"}
            size={20}
            color={dayColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dayCardName, { color: colors.foreground }]}>{day.dayName}</Text>
          <Text style={[styles.dayCardFocus, { color: colors.mutedForeground }]}>{day.focus}</Text>
        </View>
        {!isRest && (
          <View style={styles.dayCardRight}>
            <Text style={[styles.dayCardCals, { color: dayColor }]}>{day.estimatedCalories > 0 ? `~${day.estimatedCalories} kcal` : day.estimatedDuration}</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </View>
        )}
        {isRest && (
          <View style={[styles.restTag, { backgroundColor: colors.muted }]}>
            <Text style={[styles.restTagText, { color: colors.mutedForeground }]}>Rest</Text>
          </View>
        )}
      </View>

      {expanded && !isRest && (day.sections?.length ? day.sections : [{ id: "main", title: "Exercises", exercises: day.exercises }]).map((section: any) => (
        <View key={section.id + section.title} style={styles.sectionBlock}>
          <Text style={[styles.sectionBlockTitle, { color: dayColor }]}>
            {section.title}{section.durationMinutes ? ` · ${section.durationMinutes} min` : ""}
          </Text>
          {section.exercises.map((ex: ExerciseCard) => (
            <ExerciseItem
              key={ex.id + ex.name + section.id}
              ex={ex}
              colors={colors}
              accentColor={dayColor}
              expanded={expandedEx === `${day.dayName}-${section.id}-${ex.id}`}
              onToggle={() => onToggleEx(`${day.dayName}-${section.id}-${ex.id}`)}
            />
          ))}
        </View>
      ))}
      {expanded && !isRest && !day.sections?.length && day.exercises.length > 0 && (
        <View style={styles.exerciseList}>
          {day.exercises.map((ex: ExerciseCard) => (
            <ExerciseItem
              key={ex.id + ex.name}
              ex={ex}
              colors={colors}
              accentColor={dayColor}
              expanded={expandedEx === `${day.dayName}-${ex.id}`}
              onToggle={() => onToggleEx(`${day.dayName}-${ex.id}`)}
            />
          ))}
        </View>
      )}
      {expanded && !isRest && day.exercises.length === 0 && (
        <Text style={[styles.noExText, { color: colors.mutedForeground }]}>Cardio session — choose your preferred activity</Text>
      )}
    </TouchableOpacity>
  );
}

function ExerciseItem({ ex, colors, accentColor, expanded, onToggle }: any) {
  const diffColor = DIFF_COLOR[ex.difficulty] ?? colors.mutedForeground;
  const totalCals = (ex.estimatedCaloriesPerSet ?? 12) * (ex.sets ?? 3);
  const firstInstruction = ex.instructions?.[0] ?? "";

  return (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); onToggle(); }}
      activeOpacity={0.85}
      style={[styles.exerciseItem, { borderColor: colors.border }]}
    >
      {/* ── Top row: GIF + name/target/equipment ── */}
      <View style={styles.exerciseItemTop}>
        {ex.gifUrl ? (
          <Image
            source={{ uri: ex.gifUrl }}
            style={styles.exerciseGif}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.exerciseGifPlaceholder, { backgroundColor: accentColor + "15" }]}>
            <Ionicons name="barbell-outline" size={22} color={accentColor} />
          </View>
        )}

        <View style={{ flex: 1, gap: 4 }}>
          {/* Name */}
          <Text style={[styles.exerciseName, { color: colors.foreground }]} numberOfLines={2}>
            {ex.name}
          </Text>

          {/* Target muscle */}
          <View style={styles.exerciseMetaRow}>
            <Ionicons name="body-outline" size={11} color={accentColor} />
            <Text style={[styles.exerciseMetaText, { color: accentColor }]}>
              {ex.target || ex.bodyPart || "—"}
            </Text>
          </View>

          {/* Equipment */}
          <View style={styles.exerciseMetaRow}>
            <Ionicons name="barbell-outline" size={11} color={colors.mutedForeground} />
            <Text style={[styles.exerciseMetaText, { color: colors.mutedForeground }]}>
              {ex.equipment || "Body weight"}
            </Text>
          </View>
        </View>

        {/* Difficulty badge + chevron */}
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <View style={[styles.diffChip, { backgroundColor: diffColor + "18" }]}>
            <Text style={[styles.diffChipText, { color: diffColor }]}>{ex.difficulty}</Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.mutedForeground}
          />
        </View>
      </View>

      {/* ── Stats row: sets · reps · rest · calories ── */}
      <View style={styles.exerciseStatsRow}>
        <ExStat icon="layers-outline" label="Sets" value={String(ex.sets ?? 3)} color={accentColor} colors={colors} />
        <View style={[styles.exerciseStatDivider, { backgroundColor: colors.border }]} />
        <ExStat icon="repeat-outline" label="Reps" value={ex.repsRange ?? "10–12"} color={accentColor} colors={colors} />
        <View style={[styles.exerciseStatDivider, { backgroundColor: colors.border }]} />
        <ExStat icon="time-outline" label="Rest" value={ex.restSeconds ? `${ex.restSeconds}s` : "60s"} color={colors.mutedForeground} colors={colors} />
        <View style={[styles.exerciseStatDivider, { backgroundColor: colors.border }]} />
        <ExStat icon="flame-outline" label="Kcal" value={`~${totalCals}`} color="#FF6B35" colors={colors} />
      </View>

      {/* ── First instruction always visible ── */}
      {firstInstruction !== "" && (
        <View style={[styles.instructionPreview, { backgroundColor: accentColor + "08", borderLeftColor: accentColor }]}>
          <Ionicons name="bulb-outline" size={12} color={accentColor} />
          <Text style={[styles.instructionPreviewText, { color: colors.foreground }]} numberOfLines={expanded ? undefined : 2}>
            {firstInstruction}
          </Text>
        </View>
      )}

      {/* ── Expanded: remaining instructions + secondary muscles ── */}
      {expanded && ex.instructions?.length > 1 && (
        <View style={[styles.instructionBox, { backgroundColor: accentColor + "06", borderLeftColor: accentColor }]}>
          {ex.instructions.slice(1, 4).map((inst: string, i: number) => (
            <View key={i} style={styles.instructionRow}>
              <Text style={[styles.instructionNum, { color: accentColor }]}>{i + 2}.</Text>
              <Text style={[styles.instructionText, { color: colors.foreground }]}>{inst}</Text>
            </View>
          ))}
          {ex.secondaryMuscles?.length > 0 && (
            <View style={[styles.secondaryRow, { borderTopColor: colors.border }]}>
              <Ionicons name="git-branch-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.secondaryMuscles, { color: colors.mutedForeground }]}>
                Also works: {ex.secondaryMuscles.slice(0, 4).join(", ")}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function ExStat({ icon, label, value, color, colors }: any) {
  return (
    <View style={styles.exerciseStatItem}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.exerciseStatValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.exerciseStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ExChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.exChip, { backgroundColor: color + "12" }]}>
      <Text style={[styles.exChipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },

  onboardingHeader: { gap: 8 },
  sparkBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  sparkText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  onboardingTitle: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 36 },
  onboardingSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },

  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  locationRow: {
    flexDirection: "row",
    gap: 10,
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  locationChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  locationChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  locationHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 16, textAlign: "center" },
  sourceRow: { flexDirection: "row", gap: 10 },
  sourceCard: { flex: 1, borderRadius: 14, padding: 12, gap: 4, alignItems: "flex-start" },
  metricsPanel: { borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, marginBottom: 12 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCell: { width: (width - 64) / 3, gap: 2 },
  metricLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  metricValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionBlock: { gap: 6, marginTop: 8 },
  sectionBlockTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 4, paddingHorizontal: 4 },
  goalCard: { width: (width - 42) / 2, borderRadius: 16, padding: 14, gap: 8, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  goalIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  goalCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  goalCardDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  checkBadge: { position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  aiSuggestionBox: { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1.5 },
  aiSuggestionTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiSuggestionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  aiSuggestionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  askAIBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 44, borderRadius: 12 },
  askAIBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  bottomBtns: { gap: 10, marginTop: 4 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  outlineBtn: { height: 48, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  outlineBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  skipLink: { alignItems: "center", padding: 8 },
  skipLinkText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingCard: { width: "100%", maxWidth: 360, borderRadius: 24, padding: 28, alignItems: "center", gap: 14 },
  loadingIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  loadingTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  loadingSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  loadingDots: { width: "100%", borderRadius: 12, padding: 12, gap: 8 },
  loadingDotRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingDotDot: { width: 6, height: 6, borderRadius: 3 },
  loadingDotText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  aiResultCard: { borderRadius: 20, padding: 18, gap: 12, borderWidth: 1.5, overflow: "hidden" },
  aiResultTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiResultIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  aiResultGoalName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  aiResultConfBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  aiResultConfText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  aiResultReasoning: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  aiResultDivider: { height: 1 },
  aiResultMeta: { gap: 10 },
  aiMetaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiMetaIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aiMetaLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  aiMetaValue: { fontSize: 13, fontFamily: "Inter_500Medium" },

  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backBtn: { paddingTop: 4 },
  planTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  planSubtitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 2 },
  planSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  locationPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  strategyCard: { borderRadius: 18, padding: 16, overflow: "hidden", gap: 12 },
  strategyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stratStatItem: { flex: 1, minWidth: "45%", alignItems: "center", gap: 4 },
  stratStatIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stratStatValue: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  stratStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  strategyPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  dayCard: { borderRadius: 16, overflow: "hidden", backgroundColor: "transparent" },
  dayCardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  dayCardIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  dayCardName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dayCardFocus: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  dayCardRight: { alignItems: "flex-end", gap: 4 },
  dayCardCals: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  restTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  restTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  noExText: { fontSize: 13, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 14, fontStyle: "italic" },

  exerciseList: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", paddingTop: 2 },
  exerciseItem: { padding: 12, borderTopWidth: 0.5, gap: 10 },
  exerciseItemTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  exerciseGif: { width: 64, height: 64, borderRadius: 10 },
  exerciseGifPlaceholder: { width: 64, height: 64, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  exerciseName: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  exerciseTarget: { fontSize: 11, fontFamily: "Inter_400Regular" },
  exerciseChips: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  exChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  exChipText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  diffChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  diffChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  exerciseMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  exerciseMetaText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  exerciseStatsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, marginTop: 2 },
  exerciseStatItem: { flex: 1, alignItems: "center", gap: 2 },
  exerciseStatValue: { fontSize: 12, fontFamily: "Inter_700Bold" },
  exerciseStatLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.3 },
  exerciseStatDivider: { width: 1, height: 28, opacity: 0.4 },

  instructionPreview: { flexDirection: "row", gap: 6, alignItems: "flex-start", padding: 9, borderRadius: 8, borderLeftWidth: 2.5, marginTop: 2 },
  instructionPreviewText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },

  instructionBox: { borderLeftWidth: 2.5, borderRadius: 8, padding: 10, gap: 6, marginTop: 4 },
  instructionRow: { flexDirection: "row", gap: 6 },
  instructionNum: { fontSize: 12, fontFamily: "Inter_700Bold", minWidth: 16 },
  instructionText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  secondaryRow: { flexDirection: "row", alignItems: "center", gap: 4, borderTopWidth: 0.5, paddingTop: 6, marginTop: 2 },
  secondaryMuscles: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 56, borderRadius: 16, marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
