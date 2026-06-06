import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: string;
}

function QuickActionPill({ icon, label, onPress, accent }: QuickAction) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const color = accent ?? colors.primary;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      activeOpacity={0.85}
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 12, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        animStyle,
        styles.pill,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
    </AnimatedTouchable>
  );
}

interface QuickActionsRowProps {
  actions: QuickAction[];
}

export function QuickActionsRow({ actions }: QuickActionsRowProps) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <Text style={[colors.typography.h3, { color: colors.foreground, marginBottom: 8 }]}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {actions.map((action) => (
          <QuickActionPill key={action.label} {...action} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 2 },
  row: { gap: 10, paddingRight: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    paddingRight: 2,
  },
});
