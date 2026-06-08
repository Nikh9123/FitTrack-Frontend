import {
  CoachInsightsSection,
  DataSourceBadge,
  MetricDetailLayout,
  SectionTitle,
  SimpleBarChart,
  StatGrid,
  WhySection,
} from "@/components/analytics";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { bucketLabel, useMetricHistory } from "@/hooks/useMetricHistory";
import { useColors } from "@/hooks/useColors";
import { buildStepsExplanation } from "@/lib/metrics/explanations";
import { buildCoachTips, buildStepsInsights } from "@/lib/metrics/insights";
import { stepsCaloriesBurned } from "@/lib/metrics/calories";
import type { MetricPeriod } from "@/lib/metrics/types";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StepsMetricScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { activitySummary, stepGoal, streak } = useFitness();
  const [period, setPeriod] = useState<MetricPeriod>("week");
  const { history, loading, refresh, bucketsForChart } = useMetricHistory(period);

  const steps = activitySummary.steps;
  const weightKg = parseFloat(user?.weightKg ?? "70") || 70;

  const chartData = useMemo(
    () =>
      bucketsForChart.map((b) => ({
        label: bucketLabel(b.date, period),
        value: b.steps,
      })),
    [bucketsForChart, period],
  );

  const bestDay = useMemo(() => {
    if (!history?.buckets.length) return null;
    const best = history.buckets.reduce((a, b) => (b.steps > a.steps ? b : a));
    return best.steps > 0 ? best : null;
  }, [history]);

  const explanation = buildStepsExplanation(stepGoal, steps, weightKg);
  const insights = buildStepsInsights(history, steps, stepGoal);
  const coachTips = buildCoachTips({
    steps,
    stepGoal,
    water: 0,
    waterGoal: 8,
    sleepHours: 0,
    caloriesRemaining: 0,
    calorieGoal: 2200,
    consumed: 0,
  });

  return (
    <MetricDetailLayout
      title="Steps"
      subtitle="Movement & daily activity"
      icon="walk"
      iconColor={colors.primary}
      period={period}
      onPeriodChange={setPeriod}
      loading={loading}
      onRefresh={() => void refresh()}
      hero={
        <View style={styles.hero}>
          <ProgressRing
            size={100}
            strokeWidth={8}
            progress={steps / stepGoal}
            color={colors.primary}
            trackColor={colors.border}
            label={steps.toLocaleString()}
            sublabel={`/ ${stepGoal.toLocaleString()}`}
          />
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            ~{stepsCaloriesBurned(steps, weightKg)} kcal burned from steps
          </Text>
        </View>
      }
    >
      <DataSourceBadge source="Device step sensor / phone pedometer" icon="phone-portrait-outline" />

      <StatGrid
        items={[
          { label: "Today", value: steps.toLocaleString(), sub: "steps" },
          { label: "Weekly avg", value: history ? Math.round(history.averages.steps).toLocaleString() : "—" },
          { label: "Best day", value: bestDay ? bestDay.steps.toLocaleString() : "—" },
          { label: "Workout streak", value: `${streak}d`, sub: "from workouts" },
        ]}
      />

      <SectionTitle>Trend</SectionTitle>
      <SimpleBarChart data={chartData} color={colors.primary} unit="" emptyMessage="Walk today to start your step history." />

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
  hero: { alignItems: "center", gap: 8, paddingVertical: 8 },
  heroSub: { fontSize: 13, fontFamily: "Inter_500Medium" },
  insight: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
