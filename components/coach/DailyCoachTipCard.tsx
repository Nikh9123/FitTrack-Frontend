import { ShimmerOverlay } from "@/components/ui/ShimmerOverlay";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { withAlpha } from "@/constants/energy-glow";
import { useColors } from "@/hooks/useColors";
import { fetchDailyDigest, type DailyDigest } from "@/lib/coach-api";
import { hapticLight } from "@/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CATEGORY_ICON: Record<DailyDigest["category"], keyof typeof Ionicons.glyphMap> = {
  nutrition: "restaurant",
  activity: "footsteps",
  recovery: "moon",
  consistency: "flame",
  general: "sparkles",
};

export function DailyCoachTipCard({ token }: { token: string | null }) {
  const colors = useColors();
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await fetchDailyDigest(token, { refresh: forceRefresh });
        setDigest(data);
      } catch {
        setDigest(null);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  React.useEffect(() => {
    void load(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  if (!token) return null;

  const icon = digest ? CATEGORY_ICON[digest.category] : "sparkles";
  const isAi = digest?.narrativeSource === "groq";

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => {
        void hapticLight();
        router.push("/(tabs)/trainer");
      }}
      style={[styles.wrap, { borderColor: colors.primary + "35" }]}
    >
      <LinearGradient colors={[colors.primary + "12", colors.purple + "08"]} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}>
        {loading && !digest ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name={icon} size={20} color={colors.primary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Coach Tip of the Day</Text>
          {digest?.narrativeSource ? (
            <View
              style={[
                styles.sourcePill,
                {
                  backgroundColor: isAi ? colors.green + "18" : colors.orange + "18",
                  overflow: "hidden",
                },
              ]}
            >
              {isAi ? (
                <ShimmerOverlay
                  colors={["transparent", withAlpha(colors.green, 0.35), "transparent"]}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Text style={[styles.sourceText, { color: isAi ? colors.green : colors.orange }]}>
                {isAi ? "AI" : "Rules"}
              </Text>
            </View>
          ) : null}
          {digest?.streakDays ? (
            <View style={[styles.streakPill, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="flame" size={11} color={colors.primary} />
              <Text style={[styles.streakText, { color: colors.primary }]}>{digest.streakDays}d</Text>
            </View>
          ) : null}
        </View>
        {digest ? (
          <>
            <TypewriterText
              text={digest.tip}
              style={[styles.tip, { color: colors.foreground }]}
              numberOfLines={2}
            />
            <Text style={[styles.action, { color: colors.primary }]} numberOfLines={1}>
              → {digest.focusAction}
            </Text>
          </>
        ) : (
          <Text style={[styles.tip, { color: colors.mutedForeground }]}>
            {loading ? "Analyzing your progress…" : "Tap to open your AI coach."}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation?.();
          void hapticLight();
          void load(true);
        }}
        hitSlop={8}
        disabled={loading}
      >
        <Ionicons name="refresh" size={16} color={loading ? colors.primary : colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  title: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sourcePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    position: "relative",
  },
  sourceText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  streakText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tip: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  action: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 6 },
});
