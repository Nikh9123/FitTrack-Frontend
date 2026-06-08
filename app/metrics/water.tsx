import {
  CoachInsightsSection,
  DataSourceBadge,
  MetricDetailLayout,
  SectionTitle,
  SimpleBarChart,
  StatGrid,
  WhySection,
} from "@/components/analytics";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { bucketLabel, useMetricHistory } from "@/hooks/useMetricHistory";
import { useColors } from "@/hooks/useColors";
import { buildWaterExplanation } from "@/lib/metrics/explanations";
import { buildCoachTips, buildWaterInsights } from "@/lib/metrics/insights";
import type { MetricPeriod } from "@/lib/metrics/types";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WaterMetricScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { todayLog, waterGoal, addWater } = useFitness();
  const [period, setPeriod] = useState<MetricPeriod>("week");
  const { history, loading, refresh, bucketsForChart } = useMetricHistory(period);

  const glasses = todayLog.water;
  const weightKg = parseFloat(user?.weightKg ?? "70") || 70;
  const pct = Math.min(glasses / waterGoal, 1);

  const chartData = useMemo(
    () =>
      bucketsForChart.map((b) => ({
        label: bucketLabel(b.date, period),
        value: b.waterGlasses,
      })),
    [bucketsForChart, period],
  );

  const explanation = buildWaterExplanation(waterGoal, glasses, weightKg);
  const insights = buildWaterInsights(history, glasses, waterGoal);
  const coachTips = buildCoachTips({
    steps: 0,
    stepGoal: 10000,
    water: glasses,
    waterGoal,
    sleepHours: 0,
    caloriesRemaining: 0,
    calorieGoal: 2200,
    consumed: 0,
  });

  return (
    <MetricDetailLayout
      title="Hydration"
      subtitle="Water intake & consistency"
      icon="water"
      iconColor={colors.cyan}
      period={period}
      onPeriodChange={setPeriod}
      loading={loading}
      onRefresh={() => void refresh()}
      hero={
        <View style={[styles.hero, { backgroundColor: colors.cyan + "12", borderColor: colors.cyan + "35" }]}>
          <Text style={[styles.heroVal, { color: colors.cyan }]}>{glasses}</Text>
          <Text style={[styles.heroLbl, { color: colors.mutedForeground }]}>
            / {waterGoal} glasses ({Math.round(pct * 100)}%)
          </Text>
          <TouchableOpacity
            onPress={() => void addWater(1)}
            style={[styles.logBtn, { backgroundColor: colors.cyan }]}
          >
            <Text style={styles.logBtnText}>+ Log 1 glass</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <DataSourceBadge source="Manual water logs" icon="water-outline" />

      <StatGrid
        items={[
          { label: "Today", value: `${glasses}`, sub: "glasses" },
          { label: "Goal", value: `${waterGoal}`, sub: "glasses" },
          { label: "Weekly avg", value: history ? history.averages.waterGlasses.toFixed(1) : "—" },
          {
            label: "Streak",
            value: history
              ? String(history.buckets.filter((b) => b.waterGlasses >= waterGoal).length)
              : "0",
            sub: "days at goal",
          },
        ]}
      />

      <SectionTitle>Intake trend</SectionTitle>
      <SimpleBarChart data={chartData} color={colors.cyan} emptyMessage="Log water to track hydration." />

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
  heroLbl: { fontSize: 14, fontFamily: "Inter_500Medium" },
  logBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  logBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  insight: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
