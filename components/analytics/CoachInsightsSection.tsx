import { InsightCard } from "@/components/ui/InsightCard";
import { useColors } from "@/hooks/useColors";
import type { CoachTip } from "@/lib/metrics/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CoachInsightsSectionProps {
  tips: CoachTip[];
  insights?: string[];
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  water: "water",
  walk: "walk",
  moon: "moon",
  nutrition: "nutrition",
  flame: "flame",
};

export function CoachInsightsSection({ tips, insights = [] }: CoachInsightsSectionProps) {
  const colors = useColors();
  const messages = [...insights, ...tips.map((t) => t.message)];

  if (messages.length === 0) {
    messages.push("Keep logging daily — personalized coach tips appear as your data grows.");
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>Coach Insights</Text>
      </View>
      {messages.map((msg, i) => (
        <InsightCard
          key={`${i}-${msg.slice(0, 20)}`}
          message={msg}
          variant="motivation"
          icon={tips[i]?.icon ? ICON_MAP[tips[i].icon!] ?? "sparkles" : "sparkles"}
          compact
        />
      ))}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/trainer")}
        style={[styles.chatBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "35" }]}
      >
        <Text style={[styles.chatText, { color: colors.primary }]}>Ask AI Coach for more →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  chatBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, marginTop: 4 },
  chatText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
