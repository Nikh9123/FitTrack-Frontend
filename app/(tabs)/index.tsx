import { DailyRingsRow } from "@/components/home/DailyRingsRow";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useBottomTabPadding } from "@/hooks/useBottomTabPadding";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
    syncError,
    nutritionError,
    isLoadingNutrition,
    showStepPermissionBanner,
    enableStepTracking,
    dismissStepPermissionBanner,
  } = useFitness();

  const [refreshing, setRefreshing] = useState(false);
  const [weightInput, setWeightInput] = useState("");

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
        stepGoal: 10000,
        calories: todayLog.calories,
        calorieGoal,
        water: todayLog.water,
        waterGoal,
        caloriesBurned: activitySummary.caloriesBurned,
        sleepHours: activitySummary.sleepHours,
      }),
    [activitySummary, todayLog, calorieGoal, waterGoal],
  );

  const caloriesRemaining = Math.max(calorieGoal - todayLog.calories, 0);

  const insight = useMemo(() => {
    if (activitySummary.steps >= 10000) return "Step goal crushed. Keep the momentum going!";
    if (activitySummary.steps >= 5000)
      return `You're ${(10000 - activitySummary.steps).toLocaleString()} steps from your daily goal.`;
    if (todayLog.water < waterGoal) return `Hydrate — ${waterGoal - todayLog.water} glasses to go.`;
    if (activitySummary.sleepHours > 0 && activitySummary.sleepHours < 7)
      return `You slept ${activitySummary.sleepHours}h last night — aim for 7–8h tonight.`;
    if (caloriesRemaining > 0) return `${caloriesRemaining} kcal left in your nutrition budget.`;
    return "Log a meal or start a workout to build your day.";
  }, [activitySummary.steps, activitySummary.sleepHours, todayLog.water, waterGoal, caloriesRemaining]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshActivity(), refreshDailyData()]);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // error surfaced via nutritionError
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{greeting()},</Text>
            <Text style={[colors.typography.h1, { color: colors.foreground, marginTop: 2 }]}>
              {user?.name?.split(" ")[0] ?? "Athlete"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            style={[styles.avatarCircle, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {showStepPermissionBanner && (
          <GlassCard style={{ ...styles.alertCard, borderColor: colors.primary + "30" }}>
            <Ionicons name="footsteps-outline" size={18} color={colors.primary} />
            <Text style={[colors.typography.caption, { color: colors.foreground, flex: 1 }]}>
              Enable step tracking for automatic daily counts.
            </Text>
            <TouchableOpacity onPress={() => void enableStepTracking()} style={[styles.stepBannerBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepBannerBtnText}>Enable</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissStepPermissionBanner} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </GlassCard>
        )}

        {(syncError || nutritionError) && (
          <GlassCard style={{ ...styles.alertCard, borderColor: colors.error + "40" }}>
            <Ionicons name="warning-outline" size={18} color={colors.error} />
            <Text style={[colors.typography.caption, { color: colors.error, flex: 1 }]}>
              {syncError ?? nutritionError}
            </Text>
          </GlassCard>
        )}

        <LinearGradient
          colors={[colors.primary + "35", colors.surfaceElevated]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.scoreCard, { borderColor: colors.border }]}
        >
          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Daily Score</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: colors.foreground }]}>{dailyScore}</Text>
            <Text style={[colors.typography.h3, { color: colors.mutedForeground }]}>/ 100</Text>
          </View>
          <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
            {insight}
          </Text>
        </LinearGradient>

        <GlassCard>
          {isLoadingNutrition ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 24 }} />
          ) : (
            <DailyRingsRow
              steps={activitySummary.steps}
              calories={todayLog.calories}
              calorieGoal={calorieGoal}
              waterGlasses={todayLog.water}
              waterGoal={waterGoal}
            />
          )}
        </GlassCard>

        <GlassCard>
          <View style={styles.cardHeader}>
            <Text style={[colors.typography.h3, { color: colors.foreground }]}>Calories</Text>
            <Text style={[colors.typography.caption, { color: colors.green }]}>
              {caloriesRemaining} left
            </Text>
          </View>
          <Text style={[styles.bigNum, { color: colors.foreground }]}>
            {todayLog.calories}
            <Text style={[colors.typography.h3, { color: colors.mutedForeground }]}> / {calorieGoal} kcal</Text>
          </Text>
          <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
            Burned {activitySummary.caloriesBurned} kcal from activity
          </Text>
        </GlassCard>

        <GlassCard>
          <View style={styles.cardHeader}>
            <Text style={[colors.typography.h3, { color: colors.foreground }]}>Last Night's Sleep</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/progress")}>
              <Text style={[colors.typography.caption, { color: colors.primary }]}>Log check-in</Text>
            </TouchableOpacity>
          </View>
          {activitySummary.sleepHours > 0 ? (
            <>
              <Text style={[styles.bigNum, { color: colors.foreground }]}>
                {activitySummary.sleepHours}
                <Text style={[colors.typography.h3, { color: colors.mutedForeground }]}> hours</Text>
              </Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
                {activitySummary.sleepHours >= 7 ? "Good rest for recovery" : "Try for 7–8 hours tonight"}
              </Text>
            </>
          ) : (
            <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
              Log your daily check-in on Progress to track sleep and recovery.
            </Text>
          )}
        </GlassCard>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(tabs)/workout");
          }}
        >
          <LinearGradient
            colors={["#1A1035", "#121826", "#0D1219"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.workoutCard, { borderColor: colors.border }]}
          >
            <View style={styles.workoutTop}>
              <View style={[styles.workoutPill, { backgroundColor: colors.primary }]}>
                <Text style={styles.workoutPillText}>TODAY</Text>
              </View>
              {streak > 0 && (
                <View style={styles.streakChip}>
                  <Ionicons name="flame" size={14} color={colors.primary} />
                  <Text style={[colors.typography.caption, { color: colors.foreground }]}>{streak} day streak</Text>
                </View>
              )}
            </View>
            <Text style={[colors.typography.h2, { color: "#fff", marginTop: 12 }]}>Today's Workout</Text>
            <Text style={[colors.typography.caption, { color: "#ffffff99", marginTop: 4 }]}>
              Tap to open your plan and start training
            </Text>
            <View style={[styles.startRow, { backgroundColor: colors.primary, marginTop: 16 }]}>
              <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>Start Workout</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[colors.typography.h3, { color: colors.foreground, marginTop: 4 }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: "restaurant" as const, label: "Log Meal", onPress: () => router.push("/(tabs)/diet") },
            {
              icon: "water" as const,
              label: "+ Water",
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void addWater(1);
              },
            },
            {
              icon: "scale" as const,
              label: "Log Weight",
              onPress: () => {},
            },
            { icon: "barbell" as const, label: "Workout", onPress: () => router.push("/(tabs)/workout") },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                item.onPress();
              }}
              style={[styles.quickItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[colors.typography.caption, { color: colors.foreground, textAlign: "center" }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <GlassCard>
          <Text style={[colors.typography.h3, { color: colors.foreground, marginBottom: 10 }]}>Log Weight</Text>
          <View style={styles.weightRow}>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="Weight in kg"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.weightInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            />
            <TouchableOpacity
              onPress={handleLogWeight}
              style={[styles.weightBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>Save</Text>
            </TouchableOpacity>
          </View>
          {todayLog.weight ? (
            <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 8 }]}>
              Latest: {todayLog.weight} kg
            </Text>
          ) : null}
        </GlassCard>

        <GlassCard>
          <Text style={[colors.typography.h3, { color: colors.foreground, marginBottom: 12 }]}>Today's Macros</Text>
          <MacroBar label="Protein" value={todayLog.meals.reduce((s, m) => s + m.protein, 0)} max={160} color={colors.primary} muted={colors.mutedForeground} border={colors.border} />
          <MacroBar label="Carbs" value={todayLog.meals.reduce((s, m) => s + m.carbs, 0)} max={220} color={colors.cyan} muted={colors.mutedForeground} border={colors.border} />
          <MacroBar label="Fat" value={todayLog.meals.reduce((s, m) => s + m.fat, 0)} max={70} color={colors.purple} muted={colors.mutedForeground} border={colors.border} />
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function MacroBar({
  label,
  value,
  max,
  color,
  muted,
  border,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  muted: string;
  border: string;
}) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={{ gap: 6, marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 13, color: muted }}>{label}</Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color }}>{value.toFixed(1)}g</Text>
      </View>
      <View style={{ height: 6, backgroundColor: border, borderRadius: 3, overflow: "hidden" }}>
        <View style={{ width: `${pct * 100}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1 },
  stepBannerBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  stepBannerBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scoreCard: { borderRadius: 20, padding: 18, borderWidth: 1 },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 4 },
  scoreNum: { fontSize: 48, fontFamily: "Inter_700Bold", letterSpacing: -1, lineHeight: 52 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  bigNum: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  workoutCard: { borderRadius: 20, padding: 18, borderWidth: 1 },
  workoutTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  workoutPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  workoutPillText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  streakChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  startRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  quickItem: { width: "48%", borderRadius: 16, padding: 14, alignItems: "center", gap: 8, borderWidth: 1 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  weightRow: { flexDirection: "row", gap: 10 },
  weightInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_500Medium" },
  weightBtn: { paddingHorizontal: 20, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
