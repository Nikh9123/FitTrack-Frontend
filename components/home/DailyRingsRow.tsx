import { ProgressRing } from "@/components/ui/ProgressRing";
import { useColors } from "@/hooks/useColors";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface DailyRingsRowProps {
  steps: number;
  stepGoal?: number;
  calories: number;
  calorieGoal: number;
  waterGlasses: number;
  waterGoal: number;
  onStepGoalPress?: () => void;
  onStepsPress?: () => void;
  onCaloriesPress?: () => void;
  onWaterPress?: () => void;
}

export function DailyRingsRow({
  steps,
  stepGoal = 10000,
  calories,
  calorieGoal,
  waterGlasses,
  waterGoal,
  onStepGoalPress,
  onStepsPress,
  onCaloriesPress,
  onWaterPress,
}: DailyRingsRowProps) {
  const colors = useColors();
  const track = (colors as { ringTrack?: string }).ringTrack ?? colors.border;

  const rings = [
    {
      label: "Steps",
      value: steps.toLocaleString(),
      sub: `${Math.round((steps / stepGoal) * 100)}%`,
      progress: steps / stepGoal,
      color: colors.primary,
      onPress: onStepsPress,
      onLongPress: onStepGoalPress,
    },
    {
      label: "Calories",
      value: `${calories}`,
      sub: "eaten",
      progress: calories / calorieGoal,
      color: colors.green,
      onPress: onCaloriesPress,
    },
    {
      label: "Water",
      value: `${waterGlasses}`,
      sub: `/${waterGoal}`,
      progress: waterGlasses / waterGoal,
      color: colors.cyan,
      onPress: onWaterPress,
    },
  ];

  return (
    <View style={styles.row}>
      {rings.map((ring, index) => {
        const content = (
          <>
            <ProgressRing
              size={78}
              strokeWidth={7}
              progress={ring.progress}
              color={ring.color}
              trackColor={track}
              label={ring.value}
              sublabel={ring.sub}
            />
            <Text
              style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 6, textAlign: "center" }]}
              numberOfLines={1}
            >
              {ring.label}
            </Text>
          </>
        );

        if (ring.onPress || ring.onLongPress) {
          return (
            <TouchableOpacity
              key={ring.label}
              style={styles.item}
              onPress={ring.onPress}
              onLongPress={ring.onLongPress}
              activeOpacity={0.7}
            >
              {content}
            </TouchableOpacity>
          );
        }

        return (
          <View key={ring.label} style={styles.item}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
    gap: 4,
  },
  item: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
});
