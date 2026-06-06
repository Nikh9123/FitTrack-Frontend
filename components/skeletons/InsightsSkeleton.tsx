import { Skeleton } from "@/components/ui/Skeleton";
import React from "react";
import { StyleSheet, View } from "react-native";

export function InsightsSkeleton() {
  return (
    <View style={styles.wrap}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={6} height={6} borderRadius={3} />
          <Skeleton width={`${88 - i * 8}%`} height={12} borderRadius={4} style={{ flex: 1 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
