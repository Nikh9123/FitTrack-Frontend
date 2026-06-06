import { screenEntrance } from "@/constants/animations";
import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

interface ScreenEntranceProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Stagger index for nested sections on the same screen */
  index?: number;
}

export function ScreenEntrance({ children, style, index = 0 }: ScreenEntranceProps) {
  return (
    <Animated.View entering={screenEntrance(index)} style={[styles.flex, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
