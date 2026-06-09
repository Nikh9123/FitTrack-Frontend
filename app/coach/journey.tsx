import { AchievementBadgeGrid, achievementToBadge } from "@/components/progress/AchievementBadgeGrid";
import { ScreenEntrance } from "@/components/ui/ScreenEntrance";
import { useColors } from "@/hooks/useColors";
import { useAchievements } from "@/hooks/useAchievements";
import { RARITY_COLORS } from "@/lib/achievements-api";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AchievementJourneyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { achievements, journeyStages, currentStage, totalPoints, pointsToNext, equippedTitle, earnedCount, refresh } =
    useAchievements();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const badges = useMemo(
    () => achievements.filter((a) => a.earned).map(achievementToBadge),
    [achievements],
  );

  const topPad = insets.top + 8;

  return (
    <ScreenEntrance style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.foreground }]}>Fitness Journey</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Progress through stages by earning achievement points from real activity.
        </Text>

        {equippedTitle ? (
          <View style={[styles.titleCard, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "40" }]}>
            <Ionicons name="ribbon" size={18} color={colors.primary} />
            <Text style={[styles.equippedTitle, { color: colors.primary }]}>{equippedTitle}</Text>
          </View>
        ) : null}

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalPoints}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Points</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{earnedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Badges</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {pointsToNext != null ? pointsToNext : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>To next</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Journey Path</Text>
        <View style={styles.path}>
          {journeyStages.map((stage, index) => {
            const isLast = index === journeyStages.length - 1;
            const stageColor = stage.current ? colors.primary : stage.unlocked ? colors.green : colors.border;
            return (
              <View key={stage.id} style={styles.pathRow}>
                <View style={styles.pathLeft}>
                  <View style={[styles.node, { backgroundColor: stageColor + "22", borderColor: stageColor }]}>
                    {stage.unlocked ? (
                      <Ionicons name="checkmark" size={14} color={stageColor} />
                    ) : (
                      <Ionicons name="lock-closed" size={12} color={colors.mutedForeground} />
                    )}
                  </View>
                  {!isLast ? <View style={[styles.pathLine, { backgroundColor: stage.unlocked ? colors.green : colors.border }]} /> : null}
                </View>
                <View style={[styles.pathContent, { opacity: stage.unlocked ? 1 : 0.55 }]}>
                  <Text style={[styles.stageName, { color: stage.current ? colors.primary : colors.foreground }]}>
                    {stage.name}
                  </Text>
                  <Text style={[styles.stageDesc, { color: colors.mutedForeground }]}>{stage.description}</Text>
                  <Text style={[styles.stagePts, { color: colors.mutedForeground }]}>{stage.minPoints}+ pts</Text>
                </View>
              </View>
            );
          })}
        </View>

        {currentStage ? (
          <Text style={[styles.currentStage, { color: colors.mutedForeground }]}>
            You are currently: {currentStage.name}
          </Text>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Earned Badges</Text>
        {badges.length > 0 ? (
          <AchievementBadgeGrid badges={badges} columns={3} showProgress={false} />
        ) : (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            Log workouts, steps, water, and check-ins to start earning badges.
          </Text>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rarity Guide</Text>
        <View style={styles.rarityRow}>
          {Object.entries(RARITY_COLORS).map(([key, color]) => (
            <View key={key} style={[styles.rarityChip, { borderColor: color + "66" }]}>
              <View style={[styles.rarityDot, { backgroundColor: color }]} />
              <Text style={[styles.rarityLabel, { color: colors.mutedForeground }]}>{key}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenEntrance>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, gap: 12 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  backText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  titleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  equippedTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statsCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  divider: { width: 1, height: 36 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 8 },
  path: { gap: 0 },
  pathRow: { flexDirection: "row", gap: 12, minHeight: 72 },
  pathLeft: { alignItems: "center", width: 28 },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pathLine: { width: 2, flex: 1, minHeight: 24 },
  pathContent: { flex: 1, paddingBottom: 12 },
  stageName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  stageDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  stagePts: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4 },
  currentStage: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  rarityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rarityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  rarityLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
});
