import { PulseGlow } from "@/components/progress/PulseGlow";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface StreakBadgeProps {
  count: number;
  label?: string;
  size?: "sm" | "md";
  pulse?: boolean;
}

export function StreakBadge({ count, label, size = "md", pulse = true }: StreakBadgeProps) {
  const colors = useColors();
  if (count <= 0) return null;

  const isSm = size === "sm";
  const displayLabel = label ?? `${count} day streak`;

  const inner = (
    <View
      style={[
        styles.chip,
        isSm ? styles.chipSm : styles.chipMd,
        { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
      ]}
    >
      <Ionicons name="flame" size={isSm ? 12 : 14} color={colors.primary} />
      <Text
        style={[
          isSm ? styles.textSm : styles.textMd,
          { color: colors.foreground },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );

  if (pulse) {
    return (
      <PulseGlow active color={colors.primary} style={styles.pulseWrap}>
        {inner}
      </PulseGlow>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  pulseWrap: {
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipMd: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  textSm: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  textMd: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
