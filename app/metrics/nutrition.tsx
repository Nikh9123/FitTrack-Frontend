import {
  CoachInsightsSection,
  DataSourceBadge,
  MetricDetailLayout,
  SectionTitle,
  SimpleBarChart,
  StatGrid,
} from "@/components/analytics";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

export default function NutritionMetricScreen() {
  const colors = useColors();
  const { macro } = useLocalSearchParams<{ macro?: string }>();
  const { todayLog, calorieGoal } = useFitness();

  const protein = todayLog.meals.reduce((s, m) => s + m.protein, 0);
  const carbs = todayLog.meals.reduce((s, m) => s + m.carbs, 0);
  const fat = todayLog.meals.reduce((s, m) => s + m.fat, 0);

  const focus = macro === "carbs" ? "carbs" : macro === "fat" ? "fat" : "protein";
  const labels = { protein: "Protein", carbs: "Carbs", fat: "Fat" };
  const values = { protein, carbs, fat };
  const goals = { protein: 160, carbs: 220, fat: 70 };
  const chartColors = { protein: colors.primary, carbs: colors.cyan, fat: colors.purple };

  const mealBreakdown = useMemo(
    () =>
      todayLog.meals.map((m, i) => ({
        label: m.type.slice(0, 3).toUpperCase(),
        value: focus === "protein" ? m.protein : focus === "carbs" ? m.carbs : m.fat,
      })),
    [todayLog.meals, focus],
  );

  return (
    <MetricDetailLayout
      title={labels[focus]}
      subtitle="Macro breakdown"
      icon="nutrition"
      iconColor={chartColors[focus]}
      period="today"
      onPeriodChange={() => {}}
      hero={
        <StatGrid
          items={[
            {
              label: labels[focus],
              value: `${values[focus].toFixed(0)}g`,
              sub: `goal ~${goals[focus]}g`,
              color: chartColors[focus],
            },
            { label: "Calories today", value: `${todayLog.calories}`, sub: `/ ${calorieGoal} kcal` },
          ]}
        />
      }
    >
      <DataSourceBadge source="Meal entries" icon="restaurant-outline" />

      <SectionTitle>By meal</SectionTitle>
      <SimpleBarChart
        data={mealBreakdown}
        color={chartColors[focus]}
        emptyMessage="Log meals to see macro breakdown."
      />

      <SectionTitle>All macros today</SectionTitle>
      <StatGrid
        items={[
          { label: "Protein", value: `${protein.toFixed(0)}g`, color: colors.primary },
          { label: "Carbs", value: `${carbs.toFixed(0)}g`, color: colors.cyan },
          { label: "Fat", value: `${fat.toFixed(0)}g`, color: colors.purple },
          { label: "Meals", value: String(todayLog.meals.length) },
        ]}
      />

      <Text style={[styles.tip, { color: colors.mutedForeground }]}>
        Protein supports muscle recovery; carbs fuel training; fat supports hormones and satiety. Balance all three within your calorie goal.
      </Text>

      <CoachInsightsSection
        tips={[
          {
            message:
              values[focus] < goals[focus] * 0.7
                ? `Add a ${focus}-rich meal or snack to reach today's ${labels[focus].toLowerCase()} target.`
                : `${labels[focus]} intake is on track for today.`,
          },
        ]}
      />
    </MetricDetailLayout>
  );
}

const styles = StyleSheet.create({
  tip: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
});
