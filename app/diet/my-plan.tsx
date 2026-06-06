import { GlassCard } from "@/components/ui/GlassCard";
import { useBottomTabPadding } from "@/hooks/useBottomTabPadding";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import {
  activateDietPlanApi,
  assignDietPlanApi,
  fetchActiveDietPlan,
  fetchDietPlanById,
  fetchDietPlans,
  generateAiDietPlanApi,
  type DietPlanDto,
  type DietPlanDuration,
  type DietPlanGoal,
  type DietPlanListItemDto,
  type DietPlanPersonalizationDto,
  type DietPlanRegion,
} from "@/lib/nutrition-api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

type TabKey = "active" | "ai" | "professional" | "history";

const GOALS: { key: DietPlanGoal; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "fat_loss", label: "Fat Loss", icon: "flame" },
  { key: "weight_loss", label: "Weight Loss", icon: "trending-down" },
  { key: "muscle_gain", label: "Muscle Gain", icon: "barbell" },
  { key: "maintenance", label: "Maintenance", icon: "scale" },
];

const DURATIONS: { key: DietPlanDuration; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "daily", label: "1 Day", desc: "Single day meal plan", icon: "today" },
  { key: "weekly", label: "7 Day Week", desc: "Full weekly rotation", icon: "calendar" },
];

const REGIONS: {
  key: DietPlanRegion;
  label: string;
  desc: string;
  emoji: string;
}[] = [
  { key: "south_indian", label: "South Indian", desc: "Idli, dosa, sambar, rasam", emoji: "🥞" },
  { key: "north_indian", label: "North Indian", desc: "Paratha, chole, rajma, roti", emoji: "🫓" },
  { key: "west_indian", label: "West Indian", desc: "Poha, dhokla, misal, thepla", emoji: "🥘" },
  { key: "east_indian", label: "East Indian", desc: "Fish curry, luchi, khichdi", emoji: "🐟" },
  { key: "pan_indian", label: "Pan-Indian", desc: "Balanced mix of all regions", emoji: "🇮🇳" },
];

const REGION_LABELS: Record<DietPlanRegion, string> = {
  south_indian: "South Indian",
  north_indian: "North Indian",
  west_indian: "West Indian",
  east_indian: "East Indian",
  pan_indian: "Pan-Indian",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const SOURCE_LABELS: Record<string, string> = {
  ai: "AI Suggested",
  trainer: "Trainer",
  doctor: "Doctor / Dietitian",
};

function isProfessionalRole(role?: string) {
  return role === "trainer" || role === "owner" || role === "staff" || role === "admin";
}

function buildTrainerTemplate(goal: DietPlanGoal) {
  const isMuscle = goal === "muscle_gain";
  const isLoss = goal === "fat_loss" || goal === "weight_loss";
  const calories = isMuscle ? 2600 : isLoss ? 1800 : 2200;
  const proteinG = isMuscle ? 180 : isLoss ? 130 : 150;
  const carbsG = isMuscle ? 280 : isLoss ? 160 : 220;
  const fatG = isMuscle ? 75 : isLoss ? 55 : 65;

  return {
    title: isMuscle ? "Trainer Muscle Gain Plan" : isLoss ? "Trainer Fat Loss Plan" : "Trainer Balanced Plan",
    goal,
    summary: "Professional meal plan assigned by your trainer.",
    dailyTargets: { calories, proteinG, carbsG, fatG },
    tips: ["Follow portion sizes", "Stay hydrated", "Log meals daily in FitTrack"],
    meals: [
      {
        mealTime: "breakfast" as const,
        name: "Morning meal",
        items: [
          { foodName: "Idli (2 pcs)", quantity: "2 pieces", caloriesKcal: 140, proteinG: 4, carbsG: 28, fatG: 0.5 },
          { foodName: "Sambar (1 bowl)", quantity: "1 bowl", caloriesKcal: 100, proteinG: 5, carbsG: 15, fatG: 2 },
        ],
      },
      {
        mealTime: "lunch" as const,
        name: "Main meal",
        items: [
          { foodName: "Chapati / Roti (1 pc)", quantity: "2 pieces", caloriesKcal: 140, proteinG: 6, carbsG: 30, fatG: 1 },
          { foodName: "Dal Tadka (1 bowl)", quantity: "1 bowl", caloriesKcal: 170, proteinG: 9, carbsG: 24, fatG: 5 },
          ...(isMuscle
            ? [{ foodName: "Grilled Chicken Breast (100g)", quantity: "100g", caloriesKcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 }]
            : [{ foodName: "Sprouts Salad (1 bowl)", quantity: "1 bowl", caloriesKcal: 120, proteinG: 8, carbsG: 18, fatG: 2 }]),
        ],
      },
      {
        mealTime: "snack" as const,
        name: "Snack",
        items: [
          { foodName: "Buttermilk Chaas (1 glass)", quantity: "1 glass", caloriesKcal: 50, proteinG: 3, carbsG: 6, fatG: 1 },
        ],
      },
      {
        mealTime: "dinner" as const,
        name: "Dinner",
        items: [
          { foodName: "Curd Rice (1 bowl)", quantity: "1 bowl", caloriesKcal: 260, proteinG: 8, carbsG: 42, fatG: 6 },
          { foodName: "Boiled Eggs (2 pcs)", quantity: "2 eggs", caloriesKcal: 140, proteinG: 12, carbsG: 1, fatG: 10 },
        ],
      },
    ],
  };
}

export default function MyDietPlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomTabPadding();
  const { token, user } = useAuth();
  const { refreshDailyData } = useFitness();

  const [tab, setTab] = useState<TabKey>("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activePlan, setActivePlan] = useState<DietPlanDto | null>(null);
  const [allPlans, setAllPlans] = useState<DietPlanListItemDto[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DietPlanDto | null>(null);

  const [aiGoal, setAiGoal] = useState<DietPlanGoal>("fat_loss");
  const [aiDuration, setAiDuration] = useState<DietPlanDuration>("weekly");
  const [aiRegion, setAiRegion] = useState<DietPlanRegion>("south_indian");
  const [aiNotes, setAiNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  const [trainerNotes, setTrainerNotes] = useState("");
  const [assigning, setAssigning] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isPro = isProfessionalRole(user?.role);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [active, plans] = await Promise.all([fetchActiveDietPlan(token), fetchDietPlans(token)]);
      setActivePlan(active);
      setAllPlans(plans);
      setSelectedPlan((prev) => prev ?? active);
    } catch (err: any) {
      setError(err.message || "Failed to load diet plans");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handleGenerateAi = async () => {
    if (!token) return;
    setGenerating(true);
    setError(null);
    try {
      const plan = await generateAiDietPlanApi(token, {
        goal: aiGoal,
        duration: aiDuration,
        region: aiRegion,
        notes: aiNotes.trim() || undefined,
        activate: true,
      });
      setActivePlan(plan);
      setSelectedPlan(plan);
      setTab("active");
      await refreshDailyData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const durationMsg = aiDuration === "weekly" ? "7-day weekly" : "daily";
      Alert.alert(
        "Plan ready",
        `Your ${REGION_LABELS[aiRegion]} ${durationMsg} diet plan is now active. Daily calorie goals were updated.`,
      );
    } catch (err: any) {
      Alert.alert("Generation failed", err.message || "Could not generate plan");
    } finally {
      setGenerating(false);
      void loadData();
    }
  };

  const handleActivate = async (planId: string) => {
    if (!token) return;
    try {
      const plan = await activateDietPlanApi(token, planId);
      setActivePlan(plan);
      setSelectedPlan(plan);
      await refreshDailyData();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not activate plan");
    }
  };

  const handleViewPlan = async (planId: string) => {
    if (!token) return;
    try {
      const plan = await fetchDietPlanById(token, planId);
      setSelectedPlan(plan);
      setTab("active");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not load plan");
    }
  };

  const handleTrainerAssign = async (asDoctor: boolean) => {
    if (!token) return;
    setAssigning(true);
    try {
      const template = buildTrainerTemplate(aiGoal);
      const plan = await assignDietPlanApi(token, {
        title: template.title,
        goal: template.goal,
        summary: template.summary,
        professionalNotes: trainerNotes.trim() || undefined,
        source: asDoctor ? "doctor" : "trainer",
        dailyTargets: template.dailyTargets,
        meals: template.meals,
        tips: template.tips,
        activate: true,
      });
      setActivePlan(plan);
      setSelectedPlan(plan);
      setTab("active");
      await refreshDailyData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Plan assigned", asDoctor ? "Doctor/dietitian plan is active." : "Trainer plan is active.");
      void loadData();
    } catch (err: any) {
      Alert.alert("Assign failed", err.message || "Could not assign plan");
    } finally {
      setAssigning(false);
    }
  };

  const professionalPlans = allPlans.filter((p) => p.source === "trainer" || p.source === "doctor");
  const aiPlans = allPlans.filter((p) => p.source === "ai");
  const displayPlan = selectedPlan ?? activePlan;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary + "20", colors.background]} style={styles.headerGrad} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: bottomPad }]}
      >
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[colors.typography.h1, { color: colors.foreground, flex: 1 }]}>My Diet Plan</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={styles.tabRow}>
            {(
              [
                { key: "active" as TabKey, label: "Active Plan" },
                { key: "ai" as TabKey, label: "AI Plan" },
                { key: "professional" as TabKey, label: "Trainer / Doctor" },
                { key: "history" as TabKey, label: "All Plans" },
              ] as const
            ).map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: tab === t.key ? colors.primaryLight : colors.muted,
                    borderColor: tab === t.key ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    colors.typography.caption,
                    { color: tab === t.key ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {error ? (
          <GlassCard style={[styles.alertCard, { borderColor: colors.destructive + "40" }]}>
            <Text style={[colors.typography.caption, { color: colors.destructive }]}>{error}</Text>
          </GlassCard>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : tab === "active" ? (
          displayPlan ? (
            <PlanDetailView plan={displayPlan} colors={colors} onActivate={handleActivate} />
          ) : (
            <EmptyState
              colors={colors}
              title="No active diet plan"
              message="Generate an AI plan or ask your trainer to assign one."
              actionLabel="Generate AI Plan"
              onAction={() => setTab("ai")}
            />
          )
        ) : null}

        {tab === "ai" && !loading ? (
          <GlassCard style={{ gap: 14 }}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={22} color={colors.primary} />
              <Text style={[colors.typography.h2, { color: colors.foreground }]}>AI Diet Plan</Text>
            </View>
            <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>
              Plans are built from your InBody scan, weight trend, food logs, activity, and profile — with meals matched to your chosen region.
            </Text>

            <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Plan length</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setAiDuration(d.key)}
                  style={[
                    styles.durationCard,
                    {
                      borderColor: aiDuration === d.key ? colors.primary : colors.border,
                      backgroundColor: aiDuration === d.key ? colors.primaryLight : colors.muted,
                    },
                  ]}
                >
                  <Ionicons
                    name={d.icon}
                    size={22}
                    color={aiDuration === d.key ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      colors.typography.bodyMedium,
                      { color: aiDuration === d.key ? colors.primary : colors.foreground },
                    ]}
                  >
                    {d.label}
                  </Text>
                  <Text style={[colors.typography.tiny, { color: colors.mutedForeground, textAlign: "center" }]}>
                    {d.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Cuisine region</Text>
            <View style={styles.regionGrid}>
              {REGIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setAiRegion(r.key)}
                  style={[
                    styles.regionCard,
                    {
                      borderColor: aiRegion === r.key ? colors.primary : colors.border,
                      backgroundColor: aiRegion === r.key ? colors.primaryLight : colors.muted,
                    },
                  ]}
                >
                  <Text style={styles.regionEmoji}>{r.emoji}</Text>
                  <Text
                    style={[
                      colors.typography.caption,
                      {
                        color: aiRegion === r.key ? colors.primary : colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ]}
                  >
                    {r.label}
                  </Text>
                  <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {r.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Your goal</Text>
            <View style={styles.goalGrid}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => setAiGoal(g.key)}
                  style={[
                    styles.goalChip,
                    {
                      borderColor: aiGoal === g.key ? colors.primary : colors.border,
                      backgroundColor: aiGoal === g.key ? colors.primaryLight : colors.muted,
                    },
                  ]}
                >
                  <Ionicons name={g.icon} size={16} color={aiGoal === g.key ? colors.primary : colors.mutedForeground} />
                  <Text style={[colors.typography.caption, { color: aiGoal === g.key ? colors.primary : colors.foreground }]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={aiNotes}
              onChangeText={setAiNotes}
              placeholder="Extra notes (e.g. vegetarian, no dairy)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            />

            <TouchableOpacity
              onPress={() => void handleGenerateAi()}
              disabled={generating}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: generating ? 0.7 : 1 }]}
            >
              {generating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>
                    Generate {aiDuration === "weekly" ? "Weekly" : "Daily"} {REGION_LABELS[aiRegion]} Plan
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {aiPlans.length > 0 ? (
              <>
                <Text style={[colors.typography.h3, { color: colors.foreground, marginTop: 8 }]}>Previous AI plans</Text>
                {aiPlans.map((p) => (
                  <PlanListRow key={p.id} plan={p} colors={colors} onPress={() => void handleViewPlan(p.id)} onActivate={() => void handleActivate(p.id)} />
                ))}
              </>
            ) : null}
          </GlassCard>
        ) : null}

        {tab === "professional" && !loading ? (
          <View style={{ gap: 14 }}>
            {professionalPlans.length > 0 ? (
              <GlassCard style={{ gap: 10 }}>
                <Text style={[colors.typography.h3, { color: colors.foreground }]}>Plans from your trainer / doctor</Text>
                {professionalPlans.map((p) => (
                  <PlanListRow key={p.id} plan={p} colors={colors} onPress={() => void handleViewPlan(p.id)} onActivate={() => void handleActivate(p.id)} />
                ))}
              </GlassCard>
            ) : (
              <EmptyState
                colors={colors}
                title="No professional plan yet"
                message="When your trainer or dietitian assigns a plan, it will appear here."
              />
            )}

            {isPro ? (
              <GlassCard style={{ gap: 12 }}>
                <Text style={[colors.typography.h3, { color: colors.foreground }]}>Assign plan (professional)</Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  Create and assign a structured Indian diet plan to this member.
                </Text>
                <TextInput
                  value={trainerNotes}
                  onChangeText={setTrainerNotes}
                  placeholder="Notes for the member (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
                />
                <TouchableOpacity
                  onPress={() => void handleTrainerAssign(false)}
                  disabled={assigning}
                  style={[styles.primaryBtn, { backgroundColor: colors.secondary }]}
                >
                  <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>Assign as Trainer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleTrainerAssign(true)}
                  disabled={assigning}
                  style={[styles.outlineBtn, { borderColor: colors.border }]}
                >
                  <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>Assign as Doctor / Dietitian</Text>
                </TouchableOpacity>
              </GlassCard>
            ) : null}
          </View>
        ) : null}

        {tab === "history" && !loading ? (
          <GlassCard style={{ gap: 10 }}>
            {allPlans.length === 0 ? (
              <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>No diet plans yet.</Text>
            ) : (
              allPlans.map((p) => (
                <PlanListRow key={p.id} plan={p} colors={colors} onPress={() => void handleViewPlan(p.id)} onActivate={() => void handleActivate(p.id)} />
              ))
            )}
          </GlassCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PlanDetailView({
  plan,
  colors,
  onActivate,
}: {
  plan: DietPlanDto;
  colors: ReturnType<typeof useColors>;
  onActivate: (id: string) => void;
}) {
  const isActive = plan.status === "active";
  const isWeekly = plan.duration === "weekly" && plan.daySections?.length > 1;
  const regionLabel = plan.region ? REGION_LABELS[plan.region] : null;

  return (
    <View style={{ gap: 14 }}>
      <GlassCard style={{ gap: 8 }}>
        <View style={styles.planHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[colors.typography.h2, { color: colors.foreground }]}>{plan.title}</Text>
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
              {SOURCE_LABELS[plan.source] ?? plan.source}
              {plan.assignerName ? ` · ${plan.assignerName}` : ""}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.green + "25" : colors.muted }]}>
            <Text style={[colors.typography.tiny, { color: isActive ? colors.green : colors.mutedForeground }]}>
              {plan.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          <View style={[styles.tagChip, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={isWeekly ? "calendar" : "today"} size={12} color={colors.primary} />
            <Text style={[colors.typography.tiny, { color: colors.primary }]}>
              {isWeekly ? "7-Day Weekly" : "Daily Plan"}
            </Text>
          </View>
          {regionLabel ? (
            <View style={[styles.tagChip, { backgroundColor: colors.secondary + "20" }]}>
              <Text style={[colors.typography.tiny, { color: colors.secondary }]}>{regionLabel}</Text>
            </View>
          ) : null}
        </View>
        {plan.summary ? (
          <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>{plan.summary}</Text>
        ) : null}

        {plan.personalization ? (
          <PersonalizationCard personalization={plan.personalization} colors={colors} />
        ) : null}

        {plan.notes ? (
          <Text style={[colors.typography.caption, { color: colors.primary }]}>Note: {plan.notes}</Text>
        ) : null}

        <View style={styles.macroRow}>
          {[
            { label: "Calories", value: plan.dailyTargets.calories, unit: "kcal" },
            { label: "Protein", value: Math.round(plan.dailyTargets.proteinG), unit: "g" },
            { label: "Carbs", value: Math.round(plan.dailyTargets.carbsG), unit: "g" },
            { label: "Fat", value: Math.round(plan.dailyTargets.fatG), unit: "g" },
          ].map((m) => (
            <View key={m.label} style={[styles.macroChip, { backgroundColor: colors.muted }]}>
              <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{m.label}</Text>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                {m.value}
                {m.unit}
              </Text>
            </View>
          ))}
        </View>

        {!isActive ? (
          <TouchableOpacity onPress={() => onActivate(plan.id)} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
            <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>Set as active plan</Text>
          </TouchableOpacity>
        ) : null}
      </GlassCard>

      {plan.tips.length > 0 ? (
        <GlassCard style={{ gap: 8 }}>
          <Text style={[colors.typography.h3, { color: colors.foreground }]}>Tips</Text>
          {plan.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.green} />
              <Text style={[colors.typography.caption, { color: colors.mutedForeground, flex: 1 }]}>{tip}</Text>
            </View>
          ))}
        </GlassCard>
      ) : null}

      {isWeekly
        ? plan.daySections.map((day) => (
            <View key={`${day.dayIndex}-${day.dayName}`} style={{ gap: 10 }}>
              <View style={[styles.dayHeader, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "40" }]}>
                <Text style={[colors.typography.h3, { color: colors.primary, flex: 1 }]}>{day.dayName}</Text>
                <Text style={[colors.typography.caption, { color: colors.primary }]}>{day.totals.calories} kcal</Text>
              </View>
              {day.meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} colors={colors} />
              ))}
            </View>
          ))
        : plan.meals.map((meal) => <MealCard key={meal.id} meal={meal} colors={colors} />)}
    </View>
  );
}

function MealCard({
  meal,
  colors,
}: {
  meal: DietPlanDto["meals"][number];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <GlassCard style={{ gap: 10 }}>
      <View style={styles.mealHeader}>
        <Text style={[colors.typography.h3, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
          {MEAL_LABELS[meal.mealTime] ?? meal.mealTime}
        </Text>
        <Text style={[colors.typography.caption, { color: colors.secondary, flexShrink: 0 }]}>
          {meal.totals.calories} kcal
        </Text>
      </View>
      {meal.name ? (
        <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{meal.name}</Text>
      ) : null}
      {meal.items.map((item) => (
        <View key={item.id} style={[styles.foodRow, { borderBottomColor: colors.border }]}>
          <View style={styles.foodRowText}>
            <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]} numberOfLines={2}>
              {item.foodName}
            </Text>
            <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.quantity} · P:{item.protein}g C:{item.carbs}g F:{item.fat}g
            </Text>
          </View>
          <Text style={[colors.typography.bodyMedium, { color: colors.foreground, flexShrink: 0, marginLeft: 8 }]}>
            {item.calories}
          </Text>
        </View>
      ))}
    </GlassCard>
  );
}

function PersonalizationCard({
  personalization: p,
  colors,
}: {
  personalization: DietPlanPersonalizationDto;
  colors: ReturnType<typeof useColors>;
}) {
  const sources = [
    p.usedInbody && "InBody scan",
    p.usedWeightLogs && "Weight logs",
    p.usedNutritionLogs && "Food logs",
    p.usedActivity && "Activity",
  ].filter(Boolean) as string[];

  if (sources.length === 0) return null;

  return (
    <View style={[styles.personalizationCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <View style={styles.personalizationHeader}>
        <Ionicons name="analytics" size={16} color={colors.primary} />
        <Text style={[colors.typography.caption, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
          Personalized using {sources.join(" · ")}
        </Text>
      </View>
      <View style={styles.personalizationGrid}>
        {p.currentWeightKg != null ? (
          <MetricPill colors={colors} label="Weight" value={`${p.currentWeightKg} kg`} />
        ) : null}
        {p.bodyFatPercent ? (
          <MetricPill colors={colors} label="Body fat" value={`${p.bodyFatPercent}%`} />
        ) : null}
        {p.bmr ? <MetricPill colors={colors} label="BMR" value={`${p.bmr} kcal`} /> : null}
        {p.weightTrendKg30d != null ? (
          <MetricPill
            colors={colors}
            label="30d trend"
            value={`${p.weightTrendKg30d > 0 ? "+" : ""}${p.weightTrendKg30d} kg`}
          />
        ) : null}
        {p.avgDailyCalories7d != null ? (
          <MetricPill colors={colors} label="Avg intake" value={`${p.avgDailyCalories7d} kcal`} />
        ) : null}
        {p.avgSteps7d != null ? (
          <MetricPill colors={colors} label="Avg steps" value={`${p.avgSteps7d}/day`} />
        ) : null}
      </View>
    </View>
  );
}

function MetricPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.metricPill, { backgroundColor: colors.background }]}>
      <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[colors.typography.caption, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        {value}
      </Text>
    </View>
  );
}

function PlanListRow({
  plan,
  colors,
  onPress,
  onActivate,
}: {
  plan: DietPlanListItemDto;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onActivate: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.listRow, { borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{plan.title}</Text>
        <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>
          {SOURCE_LABELS[plan.source]} · {plan.status}
          {plan.assignerName ? ` · ${plan.assignerName}` : ""}
        </Text>
      </View>
      {plan.status !== "active" ? (
        <TouchableOpacity onPress={onActivate} style={[styles.smallBtn, { backgroundColor: colors.primaryLight }]}>
          <Text style={[colors.typography.tiny, { color: colors.primary }]}>Activate</Text>
        </TouchableOpacity>
      ) : (
        <Ionicons name="checkmark-circle" size={20} color={colors.green} />
      )}
    </TouchableOpacity>
  );
}

function EmptyState({
  colors,
  title,
  message,
  actionLabel,
  onAction,
}: {
  colors: ReturnType<typeof useColors>;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <GlassCard style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
      <Ionicons name="restaurant-outline" size={40} color={colors.mutedForeground} />
      <Text style={[colors.typography.h3, { color: colors.foreground }]}>{title}</Text>
      <Text style={[colors.typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}>
          <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  tabRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  alertCard: { borderWidth: 1 },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  durationRow: { flexDirection: "row", gap: 10 },
  durationCard: { flex: 1, alignItems: "center", gap: 4, padding: 14, borderRadius: 14, borderWidth: 1 },
  regionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  regionCard: { width: "48%", flexGrow: 1, minWidth: "46%", padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 },
  regionEmoji: { fontSize: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  personalizationCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  personalizationHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  personalizationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: "30%", flexGrow: 1 },
  notesInput: { minHeight: 72, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: "top", fontFamily: "Inter_400Regular" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  outlineBtn: { alignItems: "center", paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  macroRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  macroChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: "46%", flexGrow: 1 },
  tipRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  foodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5 },
  foodRowText: { flex: 1, minWidth: 0, paddingRight: 8 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 0.5 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
