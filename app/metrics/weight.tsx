import {
  CoachInsightsSection,
  DataSourceBadge,
  EmptyMetricState,
  MetricDetailLayout,
  SectionTitle,
  SimpleBarChart,
  StatGrid,
  WhySection,
} from "@/components/analytics";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useHomeData } from "@/hooks/useHomeData";
import { bucketLabel, useMetricHistory } from "@/hooks/useMetricHistory";
import { useColors } from "@/hooks/useColors";
import { buildWeightExplanation } from "@/lib/metrics/explanations";
import type { MetricPeriod } from "@/lib/metrics/types";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";

export default function WeightMetricScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { todayLog } = useFitness();
  const { weightSummary } = useHomeData();
  const [period, setPeriod] = useState<MetricPeriod>("month");
  const { history, loading, refresh, bucketsForChart } = useMetricHistory(period);

  const latest =
    weightSummary.latestKg ??
    todayLog.weight ??
    (parseFloat(user?.weightKg ?? "0") || null);

  const weightBuckets = useMemo(
    () => bucketsForChart.filter((b) => b.weightKg != null && b.weightKg > 0),
    [bucketsForChart],
  );

  const chartData = useMemo(
    () =>
      weightBuckets.map((b) => ({
        label: bucketLabel(b.date, period),
        value: b.weightKg!,
      })),
    [weightBuckets, period],
  );

  const sparkValues = weightSummary.points.map((p) => p.value).filter((v) => v > 0);
  const start = sparkValues.length > 0 ? sparkValues[0] : null;
  const change = latest != null && start != null ? latest - start : null;

  const explanation = buildWeightExplanation(latest, null, user?.fitnessGoal);

  return (
    <MetricDetailLayout
      title="Weight"
      subtitle="Trend & progress"
      icon="scale"
      iconColor={colors.purple}
      period={period}
      onPeriodChange={setPeriod}
      loading={loading}
      onRefresh={() => void refresh()}
      hero={
        latest != null ? (
          <StatGrid
            items={[
              { label: "Current", value: `${latest.toFixed(1)}`, sub: "kg", color: colors.purple },
              {
                label: "Change",
                value: change != null ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}` : "—",
                sub: "kg in period",
                color: change != null && change <= 0 ? colors.green : colors.yellow,
              },
            ]}
          />
        ) : undefined
      }
    >
      <DataSourceBadge
        source={weightSummary.source === "inbody" ? "InBody scans" : "Scale entries"}
        icon="scale-outline"
      />

      {latest == null && chartData.length === 0 ? (
        <EmptyMetricState
          icon="scale-outline"
          title="No weight data yet"
          message="Log your first weight measurement from Home → Weight quick action, or upload an InBody scan."
        />
      ) : (
        <>
          <StatGrid
            items={[
              { label: "Starting", value: start != null ? `${start.toFixed(1)} kg` : "—" },
              { label: "Entries", value: String(sparkValues.length || weightBuckets.length) },
              {
                label: "Weekly Δ (est.)",
                value:
                  change != null && sparkValues.length >= 2
                    ? `${(change / Math.max(1, sparkValues.length / 7)).toFixed(2)} kg`
                    : "—",
              },
              { label: "Goal", value: user?.fitnessGoal ?? "Set in profile", sub: "fitness goal" },
            ]}
          />

          <SectionTitle>Weight trend</SectionTitle>
          <SimpleBarChart
            data={chartData.length > 0 ? chartData : weightSummary.points.slice(-8).map((p, i) => ({
              label: p.week || String(i + 1),
              value: p.value,
            }))}
            color={colors.purple}
            emptyMessage="Log weight regularly to see trends."
          />

          {change != null && change < 0 ? (
            <Text style={[styles.insight, { color: colors.green }]}>
              • Progress rate looks healthy — aim for 0.25–0.75 kg/week for sustainable fat loss.
            </Text>
          ) : null}
        </>
      )}

      <WhySection explanation={explanation} />
      <CoachInsightsSection
        tips={[
          {
            message:
              latest != null
                ? "Weigh at the same time daily for the clearest trend."
                : "Log weight once this week to unlock predictions and insights.",
            icon: "nutrition",
          },
        ]}
      />
    </MetricDetailLayout>
  );
}

const styles = StyleSheet.create({
  insight: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
