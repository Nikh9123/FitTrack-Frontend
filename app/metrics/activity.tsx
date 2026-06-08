import {
  CoachInsightsSection,
  DataSourceBadge,
  MetricDetailLayout,
  SectionTitle,
} from "@/components/analytics";
import { buildTodayTimeline } from "@/components/home/build-today-timeline";
import { useFitness } from "@/context/FitnessContext";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ActivityMetricScreen() {
  const colors = useColors();
  const { todayLog, activitySummary, waterGoal, stepGoal } = useFitness();

  const events = useMemo(
    () =>
      buildTodayTimeline({
        steps: activitySummary.steps,
        stepGoal,
        meals: todayLog.meals,
        waterGlasses: todayLog.water,
        waterGoal,
        caloriesBurned: activitySummary.caloriesBurned,
        sleepHours: activitySummary.sleepHours,
        workoutCount: todayLog.workouts.length,
      }),
    [activitySummary, todayLog, waterGoal, stepGoal],
  );

  return (
    <MetricDetailLayout
      title="Today's Activity"
      subtitle="Full timeline"
      icon="time"
      iconColor={colors.cyan}
      period="today"
      onPeriodChange={() => {}}
    >
      <DataSourceBadge source="Meals, water, workouts, steps, sleep logs" icon="list-outline" />

      {events.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No activity yet today</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Log meals, water, or start a workout to build your timeline.
          </Text>
        </View>
      ) : (
        <>
          <SectionTitle>Timeline</SectionTitle>
          {events.map((ev, idx) => (
            <View key={ev.id} style={styles.row}>
              <View style={styles.timeCol}>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>{ev.timeLabel}</Text>
                {idx < events.length - 1 ? (
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                ) : null}
              </View>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.icon, { backgroundColor: ev.color + "20" }]}>
                  <Ionicons name={ev.icon} size={16} color={ev.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.foreground }]}>{ev.title}</Text>
                  {ev.subtitle ? (
                    <Text style={[styles.sub, { color: colors.mutedForeground }]}>{ev.subtitle}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      <CoachInsightsSection
        tips={[
          {
            message:
              events.length >= 3
                ? "Strong logging day — consistency builds better insights."
                : "Aim for at least 3 logs today (meal, water, or movement).",
          },
        ]}
      />
    </MetricDetailLayout>
  );
}

const styles = StyleSheet.create({
  empty: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", gap: 12, marginBottom: 4 },
  timeCol: { width: 52, alignItems: "center" },
  time: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  line: { width: 2, flex: 1, minHeight: 24, marginTop: 4 },
  card: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
