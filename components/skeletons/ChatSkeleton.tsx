import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, View } from "react-native";

export function ChatSkeleton() {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.bubble, styles.assistant, { backgroundColor: colors.muted }]}>
        <Skeleton width={64} height={10} borderRadius={4} />
        <Skeleton width="100%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        <Skeleton width="85%" height={14} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
      <View style={[styles.bubble, styles.user, { backgroundColor: colors.primary + "44" }]}>
        <Skeleton width="70%" height={14} borderRadius={6} />
      </View>
      <View style={[styles.bubble, styles.assistant, { backgroundColor: colors.muted }]}>
        <Skeleton width={64} height={10} borderRadius={4} />
        <Skeleton width="95%" height={14} borderRadius={6} style={{ marginTop: 8 }} />
        <Skeleton width="80%" height={14} borderRadius={6} style={{ marginTop: 6 }} />
        <Skeleton width="60%" height={14} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  bubble: { borderRadius: 16, padding: 14, maxWidth: "82%" },
  assistant: { alignSelf: "flex-start" },
  user: { alignSelf: "flex-end", width: "55%" },
});
