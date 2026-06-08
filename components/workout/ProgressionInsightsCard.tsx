import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import type { ProgressionSuggestion } from "@/lib/workout-plan-api";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  increase_weight: "barbell",
  increase_volume: "trending-up",
  body_composition: "body",
  consistency: "flame",
  recovery: "bed",
  pr_opportunity: "trophy",
};

interface Props {
  suggestions: ProgressionSuggestion[];
  loading?: boolean;
}

export function ProgressionInsightsCard({ suggestions, loading }: Props) {
  const colors = useColors();

  if (loading) {
    return (
      <GlassCard style={styles.card as any} elevated shadowLevel="soft">
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Analysing your progress…</Text>
      </GlassCard>
    );
  }

  if (suggestions.length === 0) {
    return (
      <GlassCard style={styles.card as any} elevated shadowLevel="soft">
        <Ionicons name="analytics-outline" size={28} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Progression insights</Text>
        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
          Log workouts and upload InBody scans to get load and strength recommendations.
        </Text>
      </GlassCard>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Coach progression tips</Text>
      {suggestions.map((s, i) => {
        const icon = TYPE_ICON[s.type] ?? "bulb";
        const accent =
          s.priority === "high" ? colors.primary : s.priority === "medium" ? colors.cyan : colors.mutedForeground;
        return (
          <GlassCard
            key={`${s.type}-${i}`}
            style={[styles.item, { borderColor: accent + "33" }] as any}
            elevated
            shadowLevel="soft"
          >
            <View style={[styles.itemIcon, { backgroundColor: accent + "15" }]}>
              <Ionicons name={icon} size={18} color={accent} />
            </View>
            <View style={styles.itemBody}>
              <Text style={[styles.itemTitle, { color: colors.foreground }]}>{s.title}</Text>
              <Text style={[styles.itemMsg, { color: colors.mutedForeground }]}>{s.message}</Text>
              {s.suggestedDelta ? (
                <Text style={[styles.delta, { color: accent }]}>{s.suggestedDelta}</Text>
              ) : null}
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  card: { padding: 20, alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular" },
  item: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemMsg: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  delta: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
});
