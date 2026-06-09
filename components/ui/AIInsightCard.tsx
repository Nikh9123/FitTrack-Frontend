import { GlassCard } from "@/components/ui/GlassCard";
import { ShimmerOverlay } from "@/components/ui/ShimmerOverlay";
import { withAlpha } from "@/constants/energy-glow";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface AIInsightCardProps {
  insights: string[];
  title?: string;
  loading?: boolean;
}

export function AIInsightCard({
  insights,
  title = "AI Insights",
  loading = false,
}: AIInsightCardProps) {
  const colors = useColors();

  return (
    <GlassCard style={styles.card}>
      <LinearGradient
        colors={[colors.purple + "20", colors.primary + "08", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.purple + "18" }]}>
          <Ionicons name="sparkles" size={18} color={colors.purple} />
        </View>
        <Text style={[colors.typography.h3, { color: colors.foreground, marginLeft: 8, flex: 1 }]}>
          {title}
        </Text>
        {loading ? <ActivityIndicator size="small" color={colors.purple} /> : null}
      </View>

      {loading ? (
        <View style={[styles.loadingBox, { borderColor: colors.border, overflow: "hidden" }]}>
          <ShimmerOverlay
            colors={["transparent", withAlpha(colors.purple, 0.2), "transparent"]}
            style={StyleSheet.absoluteFillObject}
            intervalMs={1600}
          />
          <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
            Analyzing your progress…
          </Text>
        </View>
      ) : (
        <View style={styles.insightsList}>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightRow}>
              <View style={[styles.dot, { backgroundColor: colors.purple }]} />
              <Text style={[colors.typography.caption, { color: colors.secondary, flex: 1 }]}>
                {insight}
              </Text>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  insightsList: {
    gap: 10,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
});
