import { ScoreCardSkeleton } from "@/components/skeletons/ScoreCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, View } from "react-native";

export function AnalysisSkeleton() {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <ScoreCardSkeleton />
      <View style={styles.metricsGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <Skeleton width="60%" height={10} borderRadius={4} style={{ marginTop: 10 }} />
            <Skeleton width="80%" height={18} borderRadius={6} style={{ marginTop: 6 }} />
            <Skeleton width="50%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "47%", borderRadius: 16, borderWidth: 1, padding: 14 },
});
