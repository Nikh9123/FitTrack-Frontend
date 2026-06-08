import {
  CoachInsightsSection,
  DataSourceBadge,
  MetricDetailLayout,
  SectionTitle,
  SimpleBarChart,
  StatGrid,
  WhySection,
} from "@/components/analytics";
import { useFitness } from "@/context/FitnessContext";
import { bucketLabel, useMetricHistory } from "@/hooks/useMetricHistory";
import { useColors } from "@/hooks/useColors";
import { buildSleepExplanation } from "@/lib/metrics/explanations";
import { buildCoachTips, buildSleepInsights } from "@/lib/metrics/insights";
import type { MetricPeriod } from "@/lib/metrics/types";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const SLEEP_GOAL = 8;

export default function SleepMetricScreen() {
  const colors = useColors();
  const { activitySummary } = useFitness();
  const [period, setPeriod] = useState<MetricPeriod>("week");
  const { history, loading, refresh, bucketsForChart } = useMetricHistory(period);

  const sleepHours = activitySummary.sleepHours;

  const chartData = useMemo(
    () =>
      bucketsForChart.map((b) => ({
        label: bucketLabel(b.date, period),
        value: b.sleepHours,
      })),
    [bucketsForChart, period],
  );

  const explanation = buildSleepExplanation(sleepHours, SLEEP_GOAL);
  const insights = buildSleepInsights(history, sleepHours);
  const coachTips = buildCoachTips({
    steps: 0,
    stepGoal: 10000,
    water: 0,
    waterGoal: 8,
    sleepHours,
    caloriesRemaining: 0,
    calorieGoal: 2200,
    consumed: 0,
  });

  return (
    <MetricDetailLayout
      title="Sleep"
      subtitle="Duration & recovery"
      icon="moon"
      iconColor={colors.purple}
      period={period}
      onPeriodChange={setPeriod}
      loading={loading}
      onRefresh={() => void refresh()}
      hero={
        <View style={[styles.hero, { backgroundColor: colors.purple + "12", borderColor: colors.purple + "35" }]}>
          <Text style={[styles.heroVal, { color: colors.purple }]}>
            {sleepHours > 0 ? `${sleepHours}h` : "—"}
          </Text>
          <Text style={[styles.heroLbl, { color: colors.mutedForeground }]}>
            Target {SLEEP_GOAL}h · Score weight 20% of daily fitness score
          </Text>
          {sleepHours === 0 ? (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/progress")}
              style={[styles.btn, { backgroundColor: colors.purple }]}
            >
              <Text style={styles.btnText}>Log check-in on Progress</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
    >
      <DataSourceBadge source="Manual check-in / device integration (coming soon)" icon="moon-outline" />

      <StatGrid
        items={[
          { label: "Last night", value: sleepHours > 0 ? `${sleepHours}h` : "Not logged" },
          { label: "Goal", value: `${SLEEP_GOAL}h` },
          { label: "Period avg", value: history ? `${history.averages.sleepHours.toFixed(1)}h` : "—" },
          {
            label: "Quality score",
            value: sleepHours > 0 ? `${Math.round(Math.min(sleepHours / SLEEP_GOAL, 1) * 100)}%` : "—",
          },
        ]}
      />

      <SectionTitle>Sleep trend</SectionTitle>
      <SimpleBarChart data={chartData} color={colors.purple} unit="h" emptyMessage="Log sleep via daily check-in." />

      <SectionTitle>Insights</SectionTitle>
      {insights.map((msg) => (
        <Text key={msg} style={[styles.insight, { color: colors.foreground }]}>
          • {msg}
        </Text>
      ))}

      <WhySection explanation={explanation} />
      <CoachInsightsSection tips={coachTips} />
    </MetricDetailLayout>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  heroVal: { fontSize: 48, fontFamily: "Inter_700Bold" },
  heroLbl: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  btnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  insight: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
