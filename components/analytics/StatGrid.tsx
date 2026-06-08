import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface StatItem {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export function StatGrid({ items }: { items: StatItem[] }) {
  const colors = useColors();
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.cell, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{item.label}</Text>
          <Text style={[styles.value, { color: item.color ?? colors.foreground }]}>{item.value}</Text>
          {item.sub ? (
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{item.sub}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 2,
  },
  label: { fontSize: 11, fontFamily: "Inter_500Medium" },
  value: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
