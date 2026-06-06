import { Skeleton, SkeletonCircle } from "@/components/ui/Skeleton";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, View } from "react-native";

export function DailyRingsSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.ringsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.ringsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.ringCol}>
            <SkeletonCircle size={78} />
            <Skeleton width={48} height={10} borderRadius={5} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function WorkoutCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.workoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width={72} height={22} borderRadius={999} />
      <Skeleton width="70%" height={22} borderRadius={8} style={{ marginTop: 14 }} />
      <Skeleton width="90%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
      <Skeleton width="100%" height={44} borderRadius={12} style={{ marginTop: 16 }} />
    </View>
  );
}

export function WeightSparklineSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.sparkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sparkHeader}>
        <Skeleton width={100} height={16} borderRadius={6} />
        <Skeleton width={56} height={20} borderRadius={6} />
      </View>
      <View style={styles.barsRow}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} width="100%" height={12 + (i % 3) * 10} borderRadius={4} style={{ flex: 1 }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringsCard: { borderRadius: 18, borderWidth: 1, padding: 12 },
  ringsRow: { flexDirection: "row", justifyContent: "space-between" },
  ringCol: { alignItems: "center", flex: 1 },
  workoutCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  sparkCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  sparkHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  barsRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 48 },
});
