import {
  CoachInsightsSection,
  DataSourceBadge,
  MetricDetailLayout,
  SectionTitle,
  StatGrid,
} from "@/components/analytics";
import { useFitness } from "@/context/FitnessContext";
import { useProgressAPI } from "@/hooks/useProgressAPI";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const ACHIEVEMENTS = [
  { days: 7, label: "7 Day Streak", icon: "🔥" },
  { days: 30, label: "30 Day Streak", icon: "🏆" },
  { days: 100, label: "100 Day Streak", icon: "⭐" },
];

export default function StreakMetricScreen() {
  const colors = useColors();
  const { streak } = useFitness();
  const { dashboard } = useProgressAPI();
  const longest = dashboard.workoutStats.longestStreak ?? streak;

  return (
    <MetricDetailLayout
      title="Streak"
      subtitle="Consistency & momentum"
      icon="flame"
      iconColor={colors.primary}
      period="week"
      onPeriodChange={() => {}}
      hero={
        <View style={[styles.hero, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Text style={[styles.count, { color: colors.primary }]}>{streak}</Text>
          <Text style={[styles.lbl, { color: colors.mutedForeground }]}>day workout streak</Text>
        </View>
      }
    >
      <DataSourceBadge source="Completed workout sessions" icon="barbell-outline" />

      <StatGrid
        items={[
          { label: "Current", value: `${streak}d` },
          { label: "Longest", value: `${longest}d` },
          { label: "This week", value: streak >= 7 ? "On fire" : `${Math.min(streak, 7)}/7` },
          { label: "Consistency", value: dashboard.workoutStats.streak > 0 ? "Active" : "Building" },
        ]}
      />

      <SectionTitle>Achievements</SectionTitle>
      {ACHIEVEMENTS.map((a) => {
        const unlocked = streak >= a.days || longest >= a.days;
        return (
          <View
            key={a.days}
            style={[
              styles.badge,
              {
                backgroundColor: unlocked ? colors.primary + "15" : colors.muted,
                borderColor: unlocked ? colors.primary + "40" : colors.border,
                opacity: unlocked ? 1 : 0.6,
              },
            ]}
          >
            <Text style={styles.badgeIcon}>{a.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.badgeTitle, { color: colors.foreground }]}>{a.label}</Text>
              <Text style={[styles.badgeSub, { color: colors.mutedForeground }]}>
                {unlocked ? "Unlocked" : `${a.days - streak} days to go`}
              </Text>
            </View>
          </View>
        );
      })}

      <SectionTitle>Calendar</SectionTitle>
      <Text style={[styles.calHint, { color: colors.mutedForeground }]}>
        Complete a workout each day to extend your streak. Rest days don't break streak if your plan marks them as rest.
      </Text>
      <View style={styles.calRow}>
        {Array.from({ length: 7 }).map((_, i) => {
          const done = i < Math.min(streak, 7);
          return (
            <View
              key={i}
              style={[
                styles.calDot,
                {
                  backgroundColor: done ? colors.primary : colors.border,
                },
              ]}
            />
          );
        })}
      </View>

      <CoachInsightsSection
        tips={[
          {
            message:
              streak === 0
                ? "Complete today's workout to start a new streak."
                : `You're on a ${streak}-day streak — one more workout keeps it alive.`,
            icon: "flame",
          },
        ]}
      />
    </MetricDetailLayout>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center" },
  count: { fontSize: 56, fontFamily: "Inter_700Bold" },
  lbl: { fontSize: 14, fontFamily: "Inter_500Medium" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeIcon: { fontSize: 24 },
  badgeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  badgeSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  calHint: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  calRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  calDot: { flex: 1, height: 32, borderRadius: 8 },
});
