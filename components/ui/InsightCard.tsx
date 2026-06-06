import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type InsightTrend = "up" | "down" | "neutral";

interface InsightCardProps {
  message: string;
  trend?: InsightTrend;
  icon?: keyof typeof Ionicons.glyphMap;
  /** default = history insight row; motivation = home hero; tip = empty-state hint */
  variant?: "default" | "motivation" | "tip";
  compact?: boolean;
}

function trendIcon(trend: InsightTrend): keyof typeof Ionicons.glyphMap {
  if (trend === "up") return "trending-up";
  if (trend === "down") return "trending-down";
  return "information-circle-outline";
}

function trendColor(trend: InsightTrend, colors: ReturnType<typeof useColors>): string {
  if (trend === "up") return colors.green;
  if (trend === "down") return colors.primary;
  return colors.mutedForeground;
}

export function InsightCard({
  message,
  trend = "neutral",
  icon,
  variant = "default",
  compact = false,
}: InsightCardProps) {
  const colors = useColors();
  const resolvedIcon = icon ?? (variant === "motivation" ? "sparkles" : trendIcon(trend));
  const iconColor =
    variant === "motivation"
      ? colors.purple
      : variant === "tip"
        ? colors.cyan
        : trendColor(trend, colors);

  const bg =
    variant === "motivation"
      ? colors.purple + "12"
      : variant === "tip"
        ? colors.cyan + "12"
        : colors.muted;

  const border =
    variant === "motivation"
      ? colors.purple + "30"
      : variant === "tip"
        ? colors.cyan + "30"
        : colors.border;

  return (
    <View
      style={[
        styles.row,
        compact ? styles.compact : styles.normal,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      <Ionicons name={resolvedIcon} size={compact ? 14 : 16} color={iconColor} />
      <Text
        style={[
          compact ? colors.typography.tiny : colors.typography.caption,
          { color: colors.foreground, flex: 1, lineHeight: compact ? 16 : 18 },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
  },
  normal: {
    padding: 10,
  },
  compact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});
