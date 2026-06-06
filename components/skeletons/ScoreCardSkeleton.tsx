import { Skeleton, SkeletonCircle } from "@/components/ui/Skeleton";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, View } from "react-native";

export function ScoreCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonCircle size={128} />
      <View style={styles.info}>
        <Skeleton width={120} height={10} borderRadius={4} />
        <Skeleton width={80} height={22} borderRadius={6} style={{ marginTop: 8 }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.barRow}>
            <Skeleton width={64} height={10} borderRadius={4} />
            <Skeleton width="100%" height={4} borderRadius={2} style={{ flex: 1 }} />
            <Skeleton width={28} height={10} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  info: { flex: 1, gap: 8 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
});
