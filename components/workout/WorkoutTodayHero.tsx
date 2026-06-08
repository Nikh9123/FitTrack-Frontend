import { useColors } from "@/hooks/useColors";
import type { WorkoutDayPlan } from "@/lib/workout-plan-api";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  planTitle: string | null;
  goal: string | null;
  todayDay: WorkoutDayPlan | null;
  loading?: boolean;
  saving?: boolean;
  onStart: (day: WorkoutDayPlan) => void;
  onSetup: () => void;
}

export function WorkoutTodayHero({
  planTitle,
  goal,
  todayDay,
  loading,
  saving,
  onStart,
  onSetup,
}: Props) {
  const colors = useColors();
  const isRest = !todayDay || todayDay.isRest || (todayDay.exercises?.length ?? 0) === 0;
  const exercises = todayDay?.exercises ?? [];
  const preview = exercises.slice(0, 2).map((e) => e.name).join(" · ");
  const moreCount = exercises.length > 2 ? exercises.length - 2 : 0;

  if (loading || saving) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.loadingTitle, { color: colors.foreground }]}>
              {saving ? "Adding plan to your profile…" : "Loading today's workout…"}
            </Text>
            <Text style={[styles.loadingSub, { color: colors.mutedForeground }]}>
              {saving ? "Syncing exercises and updating your schedule" : "Fetching your saved plan"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!planTitle && isRest) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.restPill, { backgroundColor: colors.muted, color: colors.mutedForeground }]}>GET STARTED</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>No workout plan yet</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Build a personalised plan from your goal and InBody data.
        </Text>
        <TouchableOpacity onPress={onSetup} style={[styles.cta, { backgroundColor: colors.primary }]}>
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Build my plan</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    );
  }

  if (isRest) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.topRow}>
          <Text style={[styles.todayPill, { backgroundColor: colors.muted, color: colors.mutedForeground }]}>REST DAY</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{todayDay?.dayName ?? "Today"}</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{planTitle ?? "Your plan"}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Recovery day — light walk or mobility optional.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + "28" }]}>
      <View style={styles.topRow}>
        <Text style={[styles.todayPill, { backgroundColor: colors.primary, color: colors.primaryForeground }]}>TODAY</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {todayDay?.estimatedDuration ?? "45–55 min"}
        </Text>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {planTitle ?? `${todayDay?.focus ?? "Workout"} Session`}
      </Text>

      <View style={styles.statsRow}>
        <StatChip icon="calendar-outline" label={todayDay?.dayName ?? "Today"} colors={colors} />
        <StatChip icon="layers-outline" label={`${exercises.length} exercises`} colors={colors} />
        {todayDay?.estimatedCalories ? (
          <StatChip icon="flame-outline" label={`~${todayDay.estimatedCalories} kcal`} colors={colors} accent />
        ) : null}
      </View>

      {goal ? (
        <Text style={[styles.goalLine, { color: colors.mutedForeground }]}>Goal: {goal}</Text>
      ) : null}

      {preview ? (
        <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={1}>
          {preview}{moreCount > 0 ? ` +${moreCount} more` : ""}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={() => todayDay && onStart(todayDay)}
        style={[styles.cta, { backgroundColor: colors.primary }]}
        activeOpacity={0.88}
      >
        <Ionicons name="play" size={18} color={colors.primaryForeground} />
        <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Start Workout</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatChip({
  icon,
  label,
  colors,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: ReturnType<typeof useColors>;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statChip, { backgroundColor: accent ? colors.primary + "12" : colors.muted }]}>
      <Ionicons name={icon} size={12} color={accent ? colors.primary : colors.mutedForeground} />
      <Text style={[styles.statChipText, { color: accent ? colors.primary : colors.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 4,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  todayPill: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  restPill: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  meta: { fontSize: 12, fontFamily: "Inter_500Medium" },
  goalLine: { fontSize: 12, fontFamily: "Inter_500Medium" },
  preview: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 4,
  },
  ctaText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  loadingTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loadingSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
