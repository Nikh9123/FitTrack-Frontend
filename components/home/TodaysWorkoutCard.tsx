import { WorkoutCardSkeleton } from "@/components/skeletons/HomeSkeletons";
import type { CurrentWorkoutPlan } from "@/lib/home-api";
import { getTodaysPlanExercises } from "@/lib/home-api";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TodaysWorkoutCardProps {
  plan: CurrentWorkoutPlan | null;
  loading?: boolean;
  onPress: () => void;
}

export function TodaysWorkoutCard({ plan, loading, onPress }: TodaysWorkoutCardProps) {
  const colors = useColors();
  const gradient = colors.workoutCardGradient;
  const gradientTwo = gradient.length >= 2 ? [gradient[0], gradient[1]] : gradient;

  if (loading) {
    return <WorkoutCardSkeleton />;
  }

  if (!plan) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={gradientTwo as [string, string, ...string[]]}
          style={[styles.card, { borderColor: colors.border }]}
        >
          <Text style={[styles.pill, { backgroundColor: colors.mutedForeground + "33", color: colors.mutedForeground }]}>
            REST DAY
          </Text>
          <Text style={[styles.title, { color: colors.onGradient, marginTop: 10 }]}>No plan yet</Text>
          <Text style={[styles.sub, { color: colors.onGradientMuted }]}>
            Open Workout to build or start your AI plan.
          </Text>
          <View style={[styles.cta, { backgroundColor: colors.primary, marginTop: 14 }]}>
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Set up workout</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const { dayName, exercises } = getTodaysPlanExercises(plan);

  if (exercises.length === 0) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={gradientTwo as [string, string, ...string[]]}
          style={[styles.card, { borderColor: colors.border }]}
        >
          <Text style={[styles.pill, { backgroundColor: colors.mutedForeground + "33", color: colors.mutedForeground }]}>
            REST DAY
          </Text>
          <Text style={[styles.title, { color: colors.onGradient, marginTop: 10 }]}>{dayName}</Text>
          <Text style={[styles.sub, { color: colors.onGradientMuted }]}>
            Recovery day — light walk or mobility optional.
          </Text>
          <View style={[styles.cta, { backgroundColor: colors.primary + "CC", marginTop: 14 }]}>
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Browse Workouts</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const preview = exercises.slice(0, 2).map((e) => e.exerciseName).join(" · ");
  const more = exercises.length > 2 ? ` +${exercises.length - 2} more` : "";

  return (
    <View>
      <LinearGradient
        colors={gradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: colors.border }]}
      >
        <View style={styles.topRow}>
          <Text style={[styles.pill, { backgroundColor: colors.primary, color: colors.primaryForeground }]}>TODAY</Text>
          {plan.estimatedDuration ? (
            <Text style={[styles.meta, { color: colors.onGradientMuted }]}>{plan.estimatedDuration}</Text>
          ) : null}
        </View>
        <Text style={[styles.title, { color: colors.onGradient, marginTop: 10 }]} numberOfLines={1}>
          {plan.title}
        </Text>
        <Text style={[styles.sub, { color: colors.onGradientMuted, marginTop: 4 }]} numberOfLines={2}>
          {dayName}
          {exercises.length > 0 ? ` · ${exercises.length} exercises` : ""}
          {preview ? ` — ${preview}${more}` : ""}
        </Text>
        {plan.estimatedCalories ? (
          <Text style={[styles.meta, { color: colors.green, marginTop: 6 }]}>
            ~{plan.estimatedCalories} kcal
          </Text>
        ) : null}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.88}
          style={[styles.cta, { backgroundColor: colors.primary, marginTop: 14 }]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>View Today's Session</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, borderWidth: 1 },
  loadingCard: {
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    alignItems: "center",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  meta: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
