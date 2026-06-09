import { ShareableCoachCard } from "@/components/coach/ShareableCoachCard";
import { CoachReportShell, type CoachReportTab } from "@/components/coach/CoachReportShell";
import {
  BulletList,
  CoachSection,
  CollapsibleSection,
  DayActivityCarousel,
  GoalProgressBar,
  MetricPills,
  StatRow,
} from "@/components/coach/CoachReportUIKit";
import { ForecastSection } from "@/components/coach/ForecastSection";
import { TransformationTimeline } from "@/components/coach/TransformationTimeline";
import { AnimatedFitnessScoreCard } from "@/components/progress/AnimatedFitnessScoreCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { RARITY_COLORS } from "@/lib/achievements-api";
import {
  emptyForecasts,
  fetchWeeklyReview,
  regenerateWeeklyReview,
  type WeeklyReview,
} from "@/lib/coach-api";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { useShareCoachReport, weeklyToShareData } from "@/lib/share-coach-report";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS: CoachReportTab[] = [
  { id: "overview", label: "Overview", icon: "sparkles" },
  { id: "activity", label: "Activity", icon: "footsteps" },
  { id: "plan", label: "Plan", icon: "flag" },
  { id: "forecast", label: "Forecast", icon: "trending-up" },
];

export default function WeeklyReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const { cardRef, shareData, sharing, share } = useShareCoachReport();

  const load = useCallback(async (regenerate = false) => {
    if (!token) return;
    setError(null);
    try {
      const data = regenerate ? await regenerateWeeklyReview(token) : await fetchWeeklyReview(token);
      setReview(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load review");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load(false);
    }, [load]),
  );

  if (loading && !review) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Building your weekly review…</Text>
      </View>
    );
  }

  if (error && !review) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.primary} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => void load(false)}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!review) return null;

  const weightChangeLabel =
    review.summary.weight.change === 0
      ? "No change"
      : `${review.summary.weight.change > 0 ? "+" : ""}${review.summary.weight.change} kg`;

  const scoreLabel =
    review.overallScore >= 80 ? "Excellent week" : review.overallScore >= 60 ? "Solid progress" : "Room to grow";

  const forecasts = review.forecasts ?? emptyForecasts();

  return (
    <View style={{ flex: 1 }}>
    <CoachReportShell
      title="Weekly Review"
      subtitle={review.weekLabel}
      accentColor={colors.primary}
      secondaryAccent={colors.purple}
      saved={review.saved}
      savedAt={review.savedAt}
      loading={refreshing}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load(false);
      }}
      onRegenerate={() => {
        void hapticLight();
        setRefreshing(true);
        void load(true);
      }}
      onShare={() => {
        void hapticLight();
        void share(weeklyToShareData(review));
      }}
      sharing={sharing}
      onBack={() => router.back()}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      footer={
        <>
          <TouchableOpacity
            onPress={() => {
              void hapticMedium();
              router.push("/(tabs)/trainer");
            }}
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="chatbubbles" size={18} color="#fff" />
            <Text style={styles.ctaText}>Ask Coach About This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              void hapticLight();
              router.push("/coach/monthly-report");
            }}
            style={[styles.secondaryLink, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryLinkText, { color: colors.primary }]}>Open Monthly Report →</Text>
          </TouchableOpacity>
        </>
      }
    >
      {tab === "overview" ? (
        <>
          <AnimatedFitnessScoreCard
            score={review.overallScore}
            label={scoreLabel}
            breakdown={{
              streak: Math.min(20, Math.round(review.summary.consistency / 5)),
              bodyComp: 12,
              recovery: 14,
              consistency: Math.min(20, Math.round(review.summary.consistency / 5)),
              achievements: Math.min(20, review.achievementsUnlocked.length * 4),
            }}
            streakDays={0}
            colors={colors}
          />
          <MetricPills
            accent={colors.primary}
            colors={colors}
            items={[
              { label: "Steps", value: review.summary.steps.toLocaleString(), icon: "footsteps" },
              { label: "Workouts", value: review.summary.workouts, icon: "barbell" },
              { label: "Active days", value: `${review.activeDaysCount ?? 0}/7`, icon: "calendar" },
              { label: "Weight", value: weightChangeLabel, icon: "scale" },
            ]}
          />
          <CoachSection title="AI Summary" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.foreground }]}>{review.aiSummary}</Text>
            {review.narrativeSource === "fallback" ? (
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Rule-based summary (AI unavailable)</Text>
            ) : null}
          </CoachSection>
          <CoachSection title="Goal Progress" colors={colors}>
            <GoalProgressBar
              pct={review.goalEvaluation.completionPct}
              confidence={review.goalEvaluation.confidence}
              estimatedWeeks={review.goalEvaluation.estimatedWeeks}
              message={review.goalEvaluation.message}
              colors={colors}
            />
          </CoachSection>
          <View style={styles.twoCol}>
            <View style={[styles.halfSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.halfTitle, { color: colors.green }]}>What Helped</Text>
              <BulletList items={review.drivers.helped} color={colors.green} />
            </View>
            <View style={[styles.halfSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.halfTitle, { color: colors.destructive ?? "#EF4444" }]}>Holding Back</Text>
              <BulletList items={review.drivers.holdingBack} color={colors.destructive ?? "#EF4444"} />
            </View>
          </View>
          {review.achievementsUnlocked.length > 0 ? (
            <CoachSection title="Achievements Unlocked" colors={colors}>
              {review.achievementsUnlocked.map((a) => (
                <View key={a.id} style={styles.achievementRow}>
                  <Ionicons name="trophy" size={16} color={RARITY_COLORS[a.rarity] ?? colors.primary} />
                  <Text style={[styles.achievementName, { color: colors.foreground }]}>{a.name}</Text>
                  <Text style={[styles.achievementPts, { color: colors.mutedForeground }]}>+{a.points}</Text>
                </View>
              ))}
            </CoachSection>
          ) : null}
        </>
      ) : null}

      {tab === "activity" ? (
        <>
          <DayActivityCarousel days={review.dailyBreakdown ?? []} colors={colors} accent={colors.primary} />
          <CoachSection title="Week Stats" colors={colors}>
            <StatRow label="Weight" value={`${review.summary.weight.current ?? "—"} kg (${weightChangeLabel})`} colors={colors} />
            <StatRow label="Calories burned" value={`${review.summary.caloriesBurned.toLocaleString()} kcal`} colors={colors} />
            <StatRow label="Calories consumed" value={`${review.summary.caloriesConsumed.toLocaleString()} kcal`} colors={colors} />
            <StatRow label="Water goal days" value={review.summary.waterGoalDays} colors={colors} />
            <StatRow label="Sleep goal days" value={review.summary.sleepGoalDays} colors={colors} />
            <StatRow label="Consistency" value={`${review.summary.consistency}%`} colors={colors} />
            <StatRow label="Protein avg" value={`${review.summary.proteinAvgG}g`} colors={colors} />
          </CoachSection>
          <CoachSection title="Progress Analysis" colors={colors}>
            <StatRow label="Weight" value={review.progressAnalysis.weight} colors={colors} />
            <StatRow label="Activity" value={review.progressAnalysis.activity} colors={colors} />
            <StatRow label="Nutrition" value={review.progressAnalysis.nutrition} colors={colors} />
            <StatRow label="Recovery" value={review.progressAnalysis.recovery} colors={colors} />
          </CoachSection>
          <CollapsibleSection title="Data the System Considered" colors={colors}>
            {(review.dataSourcesConsidered ?? []).map((src) => (
              <View key={src.id} style={[styles.sourceRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sourceLabel, { color: colors.foreground }]}>{src.label}</Text>
                <Text style={[styles.sourceMetrics, { color: colors.primary }]}>{src.metrics.join(" · ")}</Text>
                <Text style={[styles.sourceDesc, { color: colors.mutedForeground }]}>{src.description}</Text>
              </View>
            ))}
          </CollapsibleSection>
        </>
      ) : null}

      {tab === "plan" ? (
        <>
          <CoachSection title="Next Week Goals" subtitle={review.nextWeekFocus} colors={colors}>
            <StatRow label="Steps / day" value={review.nextWeekGoals.steps.toLocaleString()} colors={colors} />
            <StatRow label="Calories" value={`${review.nextWeekGoals.calories} kcal`} colors={colors} />
            <StatRow label="Protein" value={`${review.nextWeekGoals.proteinG}g`} colors={colors} />
            <StatRow label="Workouts" value={String(review.nextWeekGoals.workouts)} colors={colors} />
            <StatRow label="Sleep" value={`${review.nextWeekGoals.sleepHours}h`} colors={colors} />
            <StatRow label="Water" value={`${review.nextWeekGoals.waterGlasses} glasses`} colors={colors} />
          </CoachSection>
          <CoachSection title="Coach Insights" colors={colors}>
            <BulletList items={review.coachInsights} color={colors.foreground} />
          </CoachSection>
        </>
      ) : null}

      {tab === "forecast" ? (
        <>
          {forecasts.weightDetails.length > 0 || forecasts.strength.length > 0 ? (
            <CoachSection title="Forecasts" colors={colors}>
              <ForecastSection forecasts={forecasts} />
            </CoachSection>
          ) : null}
          <CoachSection title="" colors={colors}>
            <TransformationTimeline
              nodes={review.transformationTimeline ?? forecasts.transformationTimeline ?? []}
              insight={forecasts.timelineInsight}
              accent={colors.primary}
            />
          </CoachSection>
        </>
      ) : null}
    </CoachReportShell>
    {shareData ? (
      <View style={styles.offscreen} pointerEvents="none">
        <ShareableCoachCard ref={cardRef} data={shareData} />
      </View>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 8 },
  errorText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: 12 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  twoCol: { flexDirection: "row", gap: 10 },
  halfSection: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 },
  halfTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  achievementRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  achievementName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  achievementPts: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sourceRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  sourceLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sourceMetrics: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sourceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondaryLink: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  secondaryLinkText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  offscreen: { position: "absolute", left: -2000, top: 0, opacity: 0 },
});
