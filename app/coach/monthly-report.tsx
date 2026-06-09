import { ShareableCoachCard } from "@/components/coach/ShareableCoachCard";
import { CoachReportShell, type CoachReportTab } from "@/components/coach/CoachReportShell";
import {
  BulletList,
  CoachSection,
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
  fetchMonthlyReport,
  regenerateMonthlyReport,
  type MonthlyReport,
} from "@/lib/coach-api";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { monthlyToShareData, useShareCoachReport } from "@/lib/share-coach-report";
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
  { id: "analysis", label: "Analysis", icon: "analytics" },
  { id: "plan", label: "Plan", icon: "flag" },
  { id: "forecast", label: "Forecast", icon: "trending-up" },
];

export default function MonthlyReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const { cardRef, shareData, sharing, share } = useShareCoachReport();

  const load = useCallback(
    async (regenerate = false) => {
      if (!token) return;
      setError(null);
      try {
        const data = regenerate ? await regenerateMonthlyReport(token) : await fetchMonthlyReport(token);
        setReport(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load(false);
    }, [load]),
  );

  if (loading && !report) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Building your monthly report…</Text>
      </View>
    );
  }

  if (error && !report) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.purple} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.purple }]} onPress={() => void load(false)}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!report) return null;

  const forecasts = report.forecasts ?? emptyForecasts();
  const weightChangeLabel =
    report.summary.weightChange === 0
      ? "No change"
      : `${report.summary.weightChange > 0 ? "+" : ""}${report.summary.weightChange} kg`;

  return (
    <View style={{ flex: 1 }}>
    <CoachReportShell
      title="Monthly Report"
      subtitle={report.monthLabel}
      accentColor={colors.purple}
      secondaryAccent={colors.primary}
      saved={report.saved}
      savedAt={report.savedAt}
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
        void share(monthlyToShareData(report));
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
              void hapticLight();
              router.push("/coach/weekly-review");
            }}
            style={[styles.secondaryBtn, { borderColor: colors.purple }]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.purple }]}>View Weekly Review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              void hapticMedium();
              router.push("/(tabs)/trainer");
            }}
            style={[styles.ctaBtn, { backgroundColor: colors.purple }]}
          >
            <Ionicons name="chatbubbles" size={18} color="#fff" />
            <Text style={styles.ctaText}>Discuss With Coach</Text>
          </TouchableOpacity>
        </>
      }
    >
      {tab === "overview" ? (
        <>
          <AnimatedFitnessScoreCard
            score={report.overallScore}
            label="Monthly performance"
            breakdown={{
              streak: 12,
              bodyComp: 12,
              recovery: 14,
              consistency: Math.min(20, Math.round(report.summary.totalWorkouts * 2)),
              achievements: Math.min(20, report.achievementsUnlocked.length * 4),
            }}
            streakDays={0}
            colors={colors}
          />
          <MetricPills
            accent={colors.purple}
            colors={colors}
            items={[
              { label: "Workouts", value: String(report.summary.totalWorkouts), icon: "barbell" },
              { label: "Steps", value: report.summary.totalSteps.toLocaleString(), icon: "footsteps" },
              {
                label: "Volume",
                value:
                  report.summary.totalVolumeKg != null
                    ? `${Math.round(report.summary.totalVolumeKg / 1000)}k kg`
                    : "—",
                icon: "fitness",
              },
              { label: "Weight", value: weightChangeLabel, icon: "scale" },
            ]}
          />
          <CoachSection title="AI Summary" colors={colors}>
            <Text style={[styles.bodyText, { color: colors.foreground }]}>{report.aiSummary}</Text>
            <Text style={[styles.focusText, { color: colors.purple }]}>{report.nextMonthFocus}</Text>
          </CoachSection>
          <CoachSection title="Goal Progress" colors={colors}>
            <GoalProgressBar
              pct={report.goalEvaluation.completionPct}
              message={report.goalEvaluation.message}
              colors={colors}
            />
          </CoachSection>
          {report.achievementsUnlocked.length > 0 ? (
            <CoachSection title="Achievements This Month" colors={colors}>
              {report.achievementsUnlocked.map((a) => (
                <View key={a.id} style={styles.achievementRow}>
                  <Ionicons name="trophy" size={16} color={RARITY_COLORS[a.rarity] ?? colors.purple} />
                  <Text style={[styles.achievementName, { color: colors.foreground }]}>{a.name}</Text>
                </View>
              ))}
            </CoachSection>
          ) : null}
        </>
      ) : null}

      {tab === "analysis" ? (
        <>
          <CoachSection title="Month at a Glance" colors={colors}>
            <StatRow
              label="Current weight"
              value={report.summary.currentWeightKg != null ? `${report.summary.currentWeightKg} kg` : "—"}
              colors={colors}
            />
            <StatRow label="Weight change" value={weightChangeLabel} colors={colors} />
            <StatRow label="Best week score" value={report.summary.bestWeekScore != null ? `${report.summary.bestWeekScore}/100` : "—"} colors={colors} />
          </CoachSection>
          <CoachSection title="Progress Analysis" colors={colors}>
            <StatRow label="Weight" value={report.progressAnalysis?.weight ?? "—"} colors={colors} />
            <StatRow label="Activity" value={report.progressAnalysis?.activity ?? "—"} colors={colors} />
            <StatRow label="Nutrition" value={report.progressAnalysis?.nutrition ?? "—"} colors={colors} />
            <StatRow label="Recovery" value={report.progressAnalysis?.recovery ?? "—"} colors={colors} />
          </CoachSection>
          {report.personalRecords?.length ? (
            <CoachSection title="Strength Outlook" colors={colors}>
              {report.personalRecords.map((pr) => (
                <View key={pr.exercise} style={styles.prRow}>
                  <Text style={[styles.prName, { color: colors.foreground }]}>{pr.exercise}</Text>
                  <Text style={[styles.prValues, { color: colors.mutedForeground }]}>
                    {pr.current} → {pr.predicted} in {pr.weeks}w
                  </Text>
                </View>
              ))}
            </CoachSection>
          ) : null}
          {report.coachInsights.length > 0 ? (
            <CoachSection title="Coach Insights" colors={colors}>
              <BulletList items={report.coachInsights} color={colors.foreground} />
            </CoachSection>
          ) : null}
        </>
      ) : null}

      {tab === "plan" ? (
        <CoachSection title="Next Month Targets" colors={colors}>
          <StatRow label="Steps / day" value={report.nextMonthGoals.steps.toLocaleString()} colors={colors} />
          <StatRow label="Calories" value={`${report.nextMonthGoals.calories} kcal`} colors={colors} />
          <StatRow label="Protein" value={`${report.nextMonthGoals.proteinG}g`} colors={colors} />
          <StatRow label="Workouts / week" value={String(report.nextMonthGoals.workouts)} colors={colors} />
          <StatRow label="Sleep" value={`${report.nextMonthGoals.sleepHours}h`} colors={colors} />
          <StatRow label="Water" value={`${report.nextMonthGoals.waterGlasses} glasses`} colors={colors} />
        </CoachSection>
      ) : null}

      {tab === "forecast" ? (
        <>
          <CoachSection title="Forecasts" colors={colors}>
            <ForecastSection forecasts={forecasts} />
          </CoachSection>
          <CoachSection title="" colors={colors}>
            <TransformationTimeline
              nodes={report.transformationTimeline ?? forecasts.transformationTimeline}
              insight={forecasts.timelineInsight}
              accent={colors.purple}
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
  loadingText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  errorText: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center" },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  focusText: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 8 },
  prRow: { gap: 2, paddingVertical: 4 },
  prName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  prValues: { fontSize: 12, fontFamily: "Inter_400Regular" },
  achievementRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  achievementName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  ctaText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  offscreen: { position: "absolute", left: -2000, top: 0, opacity: 0 },
});
