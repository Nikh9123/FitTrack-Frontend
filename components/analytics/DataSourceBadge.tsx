import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface DataSourceBadgeProps {
  source: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function DataSourceBadge({ source, icon = "information-circle-outline" }: DataSourceBadgeProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>Source: {source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
