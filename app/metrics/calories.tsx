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
import { estimateCalorieBreakdown } from "@/lib/metrics/calories";
import { buildCaloriesExplanation } from "@/lib/metrics/explanations";
import { buildCalorieInsights, buildCoachTips } from "@/lib/metrics/insights";
import type { MetricPeriod } from "@/lib/metrics/types";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CaloriesMetricScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { todayLog, calorieGoal, activitySummary } = useFitness();
  const [period, setPeriod] = useState<MetricPeriod>("week");
  const { history, loading, refresh, bucketsForChart } = useMetricHistory(period);

  const consumed = todayLog.calories;
  const burned = activitySummary.caloriesBurned;
  const net = consumed - burned;
  const bd = estimateCalorieBreakdown(user, calorieGoal);

  const chartData = useMemo(
    () =>
      bucketsForChart.map((b) => ({
        label: bucketLabel(b.date, period),
        value: b.caloriesConsumed,
      })),
    [bucketsForChart, period],
  );

  const explanation = buildCaloriesExplanation(user, calorieGoal, consumed);
  const insights = buildCalorieInsights(history, consumed, calorieGoal, burned);
  const coachTips = buildCoachTips({
    steps: 0,
    stepGoal: 10000,
    water: todayLog.water,
    waterGoal: 8,
    sleepHours: activitySummary.sleepHours,
    caloriesRemaining: Math.max(0, calorieGoal - consumed),
    calorieGoal,
    consumed,
  });

  return (
    <MetricDetailLayout
      title="Calories"
      subtitle="Intake, burn & balance"
      icon="flame"
      iconColor={colors.green}
      period={period}
      onPeriodChange={setPeriod}
      loading={loading}
      onRefresh={() => void refresh()}
      hero={
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heroVal, { color: colors.foreground }]}>{consumed}</Text>
          <Text style={[styles.heroLbl, { color: colors.mutedForeground }]}>kcal consumed today</Text>
          <Text style={[styles.net, { color: net <= calorieGoal ? colors.green : colors.yellow }]}>
            Net {net} kcal · {Math.max(0, calorieGoal - consumed)} left
          </Text>
        </View>
      }
    >
      <DataSourceBadge source="Meal entries + activity calculations" icon="restaurant-outline" />

      <StatGrid
        items={[
          { label: "Consumed", value: `${consumed}`, sub: "kcal today" },
          { label: "Burned", value: `${burned}`, sub: "activity kcal" },
          { label: "BMR (est.)", value: `${bd.bmr}`, sub: "kcal/day" },
          { label: "Maintenance", value: `${bd.maintenance}`, sub: "TDEE est." },
        ]}
      />

      <SectionTitle>Daily intake trend</SectionTitle>
      <SimpleBarChart data={chartData} color={colors.green} emptyMessage="Log meals to see calorie trends." />

      <SectionTitle>Insights</SectionTitle>
      {insights.map((msg) => (
        <Text key={msg} style={[styles.insight, { color: colors.foreground }]}>
          • {msg}
        </Text>
      ))}

      <WhySection explanation={explanation} />
      <CoachInsightsSection tips={coachTips} insights={insights.slice(0, 2)} />
    </MetricDetailLayout>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 4 },
  heroVal: { fontSize: 42, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  heroLbl: { fontSize: 13, fontFamily: "Inter_400Regular" },
  net: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  insight: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
