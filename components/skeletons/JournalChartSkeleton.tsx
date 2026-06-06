import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, View } from "react-native";

export function JournalChartSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Skeleton width={120} height={16} borderRadius={6} />
        <View style={styles.periodRow}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={36} height={28} borderRadius={10} />
          ))}
        </View>
      </View>
      <View style={styles.chips}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={64} height={28} borderRadius={10} />
        ))}
      </View>
      <View style={styles.barsRow}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.barCol}>
            <Skeleton width="100%" height={24 + (i % 4) * 14} borderRadius={6} style={{ maxWidth: 22 }} />
            <Skeleton width={28} height={8} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  header: { gap: 10 },
  periodRow: { flexDirection: "row", gap: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  barsRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 3, paddingTop: 8 },
  barCol: { flex: 1, alignItems: "center", maxWidth: 36 },
});
