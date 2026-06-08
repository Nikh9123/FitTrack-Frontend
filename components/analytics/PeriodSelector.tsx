import { useColors } from "@/hooks/useColors";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { MetricPeriod } from "@/lib/metrics/types";

const PERIODS: { key: MetricPeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

interface PeriodSelectorProps {
  value: MetricPeriod;
  onChange: (p: MetricPeriod) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {PERIODS.map((p) => {
        const active = p.key === value;
        return (
          <TouchableOpacity
            key={p.key}
            onPress={() => onChange(p.key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.muted,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: active ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
