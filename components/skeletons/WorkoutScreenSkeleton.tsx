import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, View } from "react-native";

export function WorkoutScreenSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width={120} height={14} borderRadius={6} />
          <Skeleton width={80} height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={styles.tabs}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={72} height={32} borderRadius={999} />
        ))}
      </View>
      <View style={[styles.featured, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Skeleton width="100%" height={160} borderRadius={16} />
        <Skeleton width="70%" height={20} borderRadius={8} style={{ marginTop: 14 }} />
        <Skeleton width="100%" height={44} borderRadius={12} style={{ marginTop: 12 }} />
      </View>
      <View style={styles.categories}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={64} height={72} borderRadius={14} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 16 },
  header: { flexDirection: "row", alignItems: "center" },
  tabs: { flexDirection: "row", gap: 8 },
  featured: { borderRadius: 18, borderWidth: 1, padding: 14 },
  categories: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
});
