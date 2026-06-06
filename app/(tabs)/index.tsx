import {
  ActivityTimeline,
  buildTodayTimeline,
  DailyRingsRow,
  DailyScoreRing,
  FloatingAmbient,
  HomeAtAGlance,
  QuickActionsRow,
  TodaysWorkoutCard,
  WeightSparkline,
} from "@/components/home";
import { DailyRingsSkeleton, WeightSparklineSkeleton } from "@/components/skeletons/HomeSkeletons";
import { ScreenEntrance } from "@/components/ui/ScreenEntrance";
import { GlassCard } from "@/components/ui/GlassCard";
import { InsightCard } from "@/components/ui/InsightCard";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { entranceFade } from "@/constants/animations";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useBottomTabPadding } from "@/hooks/useBottomTabPadding";
import { useHomeData } from "@/hooks/useHomeData";
import { useColors } from "@/hooks/useColors";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function computeDailyScore(params: {
  steps: number;
  stepGoal: number;
  calories: number;
  calorieGoal: number;
  water: number;
  waterGoal: number;
  caloriesBurned: number;
  sleepHours: number;
  sleepGoal?: number;
}) {
  const stepPct = Math.min(params.steps / params.stepGoal, 1);
  const calPct = Math.min(params.calories / params.calorieGoal, 1);
  const waterPct = Math.min(params.water / params.waterGoal, 1);
  const burnPct = Math.min(params.caloriesBurned / 400, 1);
  const sleepGoal = params.sleepGoal ?? 8;
  const sleepPct = params.sleepHours > 0 ? Math.min(params.sleepHours / sleepGoal, 1) : 0;
  return Math.round(stepPct * 25 + calPct * 20 + waterPct * 20 + burnPct * 15 + sleepPct * 20);
}

function AnimatedSection({ index, children }: { index: number; children: React.ReactNode }) {
  return <Animated.View entering={entranceFade(index)}>{children}</Animated.View>;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomTabPadding();
  const { user } = useAuth();
  const {
    todayLog,
    calorieGoal,
    waterGoal,
    streak,
    activitySummary,
    refreshActivity,
    refreshDailyData,
    addWater,
    logWeight,
    stepGoal,
    setStepGoal,
    syncError,
    nutritionError,
    isLoadingNutrition,
    showStepPermissionBanner,
    enableStepTracking,
    dismissStepPermissionBanner,
  } = useFitness();
  const { workoutPlan, weightSummary, loading: homeLoading, refresh: refreshHome } = useHomeData();

  const [refreshing, setRefreshing] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showStepGoalModal, setShowStepGoalModal] = useState(false);
  const [stepGoalInput, setStepGoalInput] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const dailyScore = useMemo(
    () =>
      computeDailyScore({
        steps: activitySummary.steps,
        stepGoal,
        calories: todayLog.calories,
        calorieGoal,
        water: todayLog.water,
        waterGoal,
        caloriesBurned: activitySummary.caloriesBurned,
        sleepHours: activitySummary.sleepHours,
      }),
    [activitySummary, todayLog, calorieGoal, waterGoal, stepGoal],
  );

  const scoreBreakdown = useMemo(
    () => [
      { label: "Steps", value: activitySummary.steps, max: stepGoal, color: colors.primary },
      { label: "Cal", value: todayLog.calories, max: calorieGoal, color: colors.green },
      { label: "Water", value: todayLog.water, max: waterGoal, color: colors.cyan },
      { label: "Sleep", value: activitySummary.sleepHours, max: 8, color: colors.purple },
    ],
    [activitySummary, todayLog, calorieGoal, waterGoal, stepGoal, colors],
  );

  const caloriesRemaining = Math.max(calorieGoal - todayLog.calories, 0);
  const protein = todayLog.meals.reduce((s, m) => s + m.protein, 0);
  const carbs = todayLog.meals.reduce((s, m) => s + m.carbs, 0);
  const fat = todayLog.meals.reduce((s, m) => s + m.fat, 0);

  const fitnessTip = useMemo(() => {
    if (activitySummary.steps >= stepGoal) return "Step goal crushed — keep the momentum!";
    if (activitySummary.steps >= 5000)
      return `${(stepGoal - activitySummary.steps).toLocaleString()} steps to hit your goal today.`;
    if (todayLog.water < waterGoal) return `${waterGoal - todayLog.water} glasses of water to go.`;
    if (caloriesRemaining > 0) return `${caloriesRemaining} kcal left in your budget.`;
    return "Log a meal or start a workout to build your day.";
  }, [activitySummary.steps, todayLog.water, waterGoal, caloriesRemaining, stepGoal]);

  const timelineEvents = useMemo(
    () =>
      buildTodayTimeline({
        steps: activitySummary.steps,
        stepGoal,
        meals: todayLog.meals,
        waterGlasses: todayLog.water,
        waterGoal,
        caloriesBurned: activitySummary.caloriesBurned,
        sleepHours: activitySummary.sleepHours,
        workoutCount: todayLog.workouts.length,
      }),
    [activitySummary, todayLog, waterGoal, stepGoal],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshActivity(), refreshDailyData(), refreshHome()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) {
      Alert.alert("Invalid weight", "Enter a valid weight in kg.");
      return;
    }
    try {
      await logWeight(w);
      setWeightInput("");
      setShowWeightModal(false);
      await refreshHome();
      await hapticSuccess();
    } catch {
      // surfaced via nutritionError
    }
  };

  const handleSaveStepGoal = async () => {
    const goal = parseInt(stepGoalInput.replace(/,/g, ""), 10);
    if (!goal || goal < 1000) {
      Alert.alert("Invalid goal", "Enter a step goal of at least 1,000.");
      return;
    }
    await setStepGoal(goal);
    setShowStepGoalModal(false);
    await hapticSuccess();
  };

  const openWorkout = () => {
    hapticMedium();
    router.push("/(tabs)/workout");
  };

  return (
    <ScreenEntrance style={[styles.container, { backgroundColor: colors.background }]}>
      <FloatingAmbient />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <AnimatedSection index={0}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{greeting()},</Text>
              <Text style={[colors.typography.h1, { color: colors.foreground, marginTop: 2 }]}>
                {user?.name?.split(" ")[0] ?? "Athlete"}
              </Text>
            </View>
            <StreakBadge count={streak} size="md" />
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/trainer")}
              style={[styles.coachBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" }]}
            >
              <Ionicons name="sparkles" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              style={[styles.avatarCircle, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </AnimatedSection>

        {showStepPermissionBanner && (
          <GlassCard style={[styles.alertCard, { borderColor: colors.primary + "30" }]}>
            <Ionicons name="footsteps-outline" size={18} color={colors.primary} />
            <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
              Enable step tracking for automatic daily counts.
            </Text>
            <TouchableOpacity
              onPress={() => void enableStepTracking()}
              style={[styles.stepBannerBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.stepBannerBtnText}>Enable</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissStepPermissionBanner} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </GlassCard>
        )}

        {(syncError || nutritionError) && (
          <AnimatedSection index={1}>
            <GlassCard style={[styles.alertCard, { borderColor: colors.error + "40" }]}>
              <Ionicons name="warning-outline" size={18} color={colors.error} />
              <Text style={[colors.typography.caption, { color: colors.error, flex: 1 }]}>
                {syncError ?? nutritionError}
              </Text>
            </GlassCard>
          </AnimatedSection>
        )}

        <AnimatedSection index={2}>
          <DailyScoreRing score={dailyScore} breakdown={scoreBreakdown} animKey={dailyScore} />
        </AnimatedSection>

        <AnimatedSection index={3}>
          <GlassCard padded={false} style={{ padding: 12 }}>
            {isLoadingNutrition ? (
              <DailyRingsSkeleton />
            ) : (
              <DailyRingsRow
                steps={activitySummary.steps}
                stepGoal={stepGoal}
                calories={todayLog.calories}
                calorieGoal={calorieGoal}
                waterGlasses={todayLog.water}
                waterGoal={waterGoal}
                onStepGoalPress={() => {
                  setStepGoalInput(String(stepGoal));
                  setShowStepGoalModal(true);
                }}
              />
            )}
          </GlassCard>
        </AnimatedSection>

        <AnimatedSection index={4}>
          <InsightCard message={fitnessTip} variant="motivation" compact />
        </AnimatedSection>

        <AnimatedSection index={5}>
          <TodaysWorkoutCard plan={workoutPlan} loading={homeLoading} onPress={openWorkout} />
        </AnimatedSection>

        <AnimatedSection index={6}>
          <HomeAtAGlance
            calories={todayLog.calories}
            calorieGoal={calorieGoal}
            caloriesRemaining={caloriesRemaining}
            caloriesBurned={activitySummary.caloriesBurned}
            sleepHours={activitySummary.sleepHours}
            protein={protein}
            carbs={carbs}
            fat={fat}
          />
        </AnimatedSection>

        <AnimatedSection index={7}>
          {homeLoading ? (
            <WeightSparklineSkeleton />
          ) : (
            <WeightSparkline
              points={weightSummary.points}
              source={weightSummary.source}
              latestKg={weightSummary.latestKg}
              onPress={() => router.push("/(tabs)/progress")}
            />
          )}
        </AnimatedSection>

        <AnimatedSection index={8}>
          <ActivityTimeline events={timelineEvents} maxVisible={2} />
        </AnimatedSection>

        <AnimatedSection index={9}>
          <QuickActionsRow
            actions={[
              { icon: "restaurant", label: "Meal", onPress: () => router.push("/(tabs)/diet") },
              {
                icon: "water",
                label: "+ Water",
                onPress: () => void addWater(1),
                accent: colors.cyan,
              },
              {
                icon: "scale",
                label: "Weight",
                onPress: () => setShowWeightModal(true),
                accent: colors.purple,
              },
              {
                icon: "barbell",
                label: "Train",
                onPress: () => router.push("/(tabs)/workout"),
              },
            ]}
          />
        </AnimatedSection>
      </ScrollView>

      <Modal visible={showWeightModal} transparent animationType="fade" onRequestClose={() => setShowWeightModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowWeightModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalCenter}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[colors.typography.h3, { color: colors.foreground }]}>Log Weight</Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
                  Track your progress over time
                </Text>
                <TextInput
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder="Weight in kg"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  autoFocus
                  style={[
                    styles.weightInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input },
                  ]}
                />
                {todayLog.weight ? (
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                    Latest: {todayLog.weight} kg
                  </Text>
                ) : null}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setShowWeightModal(false)}
                    style={[styles.modalBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[colors.typography.bodyMedium, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleLogWeight}
                    style={[styles.modalBtn, styles.modalSave, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal visible={showStepGoalModal} transparent animationType="fade" onRequestClose={() => setShowStepGoalModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowStepGoalModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalCenter}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[colors.typography.h3, { color: colors.foreground }]}>Daily Step Goal</Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
                  Tap the Steps ring anytime to change this
                </Text>
                <TextInput
                  value={stepGoalInput}
                  onChangeText={setStepGoalInput}
                  placeholder="Steps per day"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  autoFocus
                  style={[
                    styles.weightInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input },
                  ]}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setShowStepGoalModal(false)}
                    style={[styles.modalBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[colors.typography.bodyMedium, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleSaveStepGoal()}
                    style={[styles.modalBtn, styles.modalSave, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </ScreenEntrance>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  coachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1 },
  stepBannerBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  stepBannerBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  modalCenter: { width: "100%" },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  weightInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  modalSave: { borderWidth: 0 },
});
