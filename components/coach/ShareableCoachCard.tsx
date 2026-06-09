import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type ShareCoachReportData = {
  kind: "weekly" | "monthly";
  title: string;
  periodLabel: string;
  score: number;
  headline: string;
  stats: Array<{ label: string; value: string }>;
};

export const ShareableCoachCard = React.forwardRef<View, { data: ShareCoachReportData }>(function ShareableCoachCard(
  { data },
  ref,
) {
  const colors = useColors();
  const accent = data.kind === "monthly" ? colors.purple : colors.primary;

  return (
    <View ref={ref} collapsable={false} style={[styles.wrap, { backgroundColor: colors.card }]}>
      <LinearGradient colors={[accent + "22", colors.card]} style={styles.hero}>
        <View style={styles.brandRow}>
          <Ionicons name="fitness" size={18} color={accent} />
          <Text style={[styles.brand, { color: colors.foreground }]}>FitTrack Coach</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{data.title}</Text>
        <Text style={[styles.period, { color: colors.mutedForeground }]}>{data.periodLabel}</Text>
        <View style={[styles.scoreRing, { borderColor: accent }]}>
          <Text style={[styles.scoreValue, { color: accent }]}>{data.score}</Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>/ 100</Text>
        </View>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={[styles.headline, { color: colors.foreground }]} numberOfLines={3}>
          {data.headline}
        </Text>
        <View style={styles.statsGrid}>
          {data.stats.slice(0, 4).map((s) => (
            <View key={s.label} style={[styles.statCell, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Generated with FitTrack AI Coach</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: 340, borderRadius: 20, overflow: "hidden" },
  hero: { padding: 20, gap: 6, alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  brand: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", alignSelf: "flex-start" },
  period: { fontSize: 13, fontFamily: "Inter_500Medium", alignSelf: "flex-start", marginBottom: 8 },
  scoreRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 4,
  },
  scoreValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  body: { padding: 20, gap: 14 },
  headline: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 21 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { width: "47%", borderRadius: 12, borderWidth: 1, padding: 10, gap: 2 },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  footer: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
});
