import {
  CoachInsightsSection,
  DataSourceBadge,
  MetricDetailLayout,
  SectionTitle,
  StatGrid,
  WhySection,
} from "@/components/analytics";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { buildScoreExplanation } from "@/lib/metrics/explanations";
import { computeDetailedDailyScore, scoreImprovementHints } from "@/lib/metrics/score";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ScoreMetricScreen() {
  const colors = useColors();
  const { activitySummary, todayLog, calorieGoal, waterGoal, stepGoal } = useFitness();

  const detailed = useMemo(
    () =>
      computeDetailedDailyScore({
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

  const explanation = buildScoreExplanation(detailed);
  const hints = scoreImprovementHints({
    steps: activitySummary.steps,
    stepGoal,
    calories: todayLog.calories,
    calorieGoal,
    water: todayLog.water,
    waterGoal,
    caloriesBurned: activitySummary.caloriesBurned,
    sleepHours: activitySummary.sleepHours,
  });

  return (
    <MetricDetailLayout
      title="Daily Score"
      subtitle="Transparent fitness score"
      icon="ribbon"
      iconColor={colors.primary}
      period="today"
      onPeriodChange={() => {}}
      hero={
        <View style={[styles.hero, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Text style={[styles.score, { color: colors.primary }]}>{detailed.total}</Text>
          <Text style={[styles.of, { color: colors.mutedForeground }]}>/ 100 points today</Text>
        </View>
      }
    >
      <DataSourceBadge source="Steps, meals, water, activity burn, sleep check-in" icon="analytics-outline" />

      <SectionTitle>Score breakdown</SectionTitle>
      {detailed.components.map((c) => (
        <View key={c.key} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              {c.label} ({c.weightLabel})
            </Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {c.current} / {c.goal} goal
            </Text>
          </View>
          <Text style={[styles.rowPts, { color: colors.primary }]}>
            {c.earnedPoints}/{c.maxPoints}
          </Text>
        </View>
      ))}

      <StatGrid
        items={detailed.components.map((c) => ({
          label: c.label,
          value: `${Math.round(c.pct * 100)}%`,
          sub: `${c.earnedPoints} pts`,
        }))}
      />

      <SectionTitle>How to improve today</SectionTitle>
      {hints.map((h) => (
        <Text key={h} style={[styles.hint, { color: colors.foreground }]}>
          • {h}
        </Text>
      ))}

      <WhySection explanation={explanation} />
      <CoachInsightsSection tips={hints.map((message) => ({ message }))} />
    </MetricDetailLayout>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center" },
  score: { fontSize: 56, fontFamily: "Inter_700Bold", letterSpacing: -2 },
  of: { fontSize: 14, fontFamily: "Inter_500Medium" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  rowPts: { fontSize: 18, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
