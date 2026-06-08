import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import type { WorkoutPlanContext } from "@/lib/workout-plan-api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  context: WorkoutPlanContext;
  onGenerateAi?: () => void;
}

export function WorkoutPlanSourceBanner({ context, onGenerateAi }: Props) {
  const colors = useColors();

  if (context.hasTrainerAssigned) {
    return (
      <GlassCard style={[styles.card, { borderColor: colors.cyan + "44" }] as any} elevated shadowLevel="soft">
        <View style={[styles.iconWrap, { backgroundColor: colors.cyan + "18" }]}>
          <Ionicons name="person" size={20} color={colors.cyan} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.foreground }]}>Trainer-assigned plan</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {context.trainerName ?? "Your trainer"} manages your workout program. Contact them for plan changes.
          </Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={[styles.card, { borderColor: colors.primary + "33" }] as any} elevated shadowLevel="soft">
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]}>AI workout coach</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {context.hasInBodyReport
            ? "Plans use your InBody scan + preferences from 1,500+ exercises."
            : "Generate a plan from your goal, or upload InBody for smarter programming."}
        </Text>
        <View style={styles.actions}>
          {onGenerateAi ? (
            <TouchableOpacity
              onPress={onGenerateAi}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Build / Update Plan</Text>
            </TouchableOpacity>
          ) : null}
          {!context.hasInBodyReport ? (
            <TouchableOpacity
              onPress={() => router.push("/inbody")}
              style={[styles.btnOutline, { borderColor: colors.border }]}
            >
              <Text style={[styles.btnOutlineText, { color: colors.foreground }]}>Upload InBody</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {context.catalogExerciseCount != null && context.catalogExerciseCount > 0 ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {context.catalogExerciseCount.toLocaleString()} exercises in catalog
          </Text>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 6 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  btnOutline: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnOutlineText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
