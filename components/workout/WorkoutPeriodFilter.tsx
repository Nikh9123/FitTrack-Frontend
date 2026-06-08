import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type WorkoutPlanPeriod = "today" | "week" | "month";

interface Props {
  value: WorkoutPlanPeriod;
  onChange: (period: WorkoutPlanPeriod) => void;
}

const OPTIONS: Array<{ key: WorkoutPlanPeriod; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export function WorkoutPeriodFilter({ value, onChange }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.row, { backgroundColor: colors.muted }]}>
      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.pill,
              active && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 6, elevation: 2 },
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.primaryForeground : colors.mutedForeground },
                active && styles.labelActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
  },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  labelActive: { fontFamily: "Inter_700Bold" },
});
