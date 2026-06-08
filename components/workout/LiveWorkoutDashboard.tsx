import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface LiveWorkoutDashboardProps {
  focusName: string;
  formattedTime: string;
  completedExercises: number;
  totalExercises: number;
  totalVolume: number;
  activeCalories: number;
  progressPct: number;
  onClose: () => void;
  onComplete: () => void;
}

export function LiveWorkoutDashboard({
  focusName,
  formattedTime,
  completedExercises,
  totalExercises,
  totalVolume,
  activeCalories,
  progressPct,
  onClose,
  onComplete,
}: LiveWorkoutDashboardProps) {
  const colors = useColors();
  const accent = colors.primary;
  const ORANGE = "#FF6B35";
  const ringTrack = (colors as any).ringTrack ?? colors.border;

  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseAnim.value }));

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference;
  const strokeOffset = (1 - progressPct) * circumference;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top row: close | title + timer | complete */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={[styles.closeBtn, { backgroundColor: colors.muted }]}
          accessibilityLabel="Close session"
        >
          <Ionicons name="close-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.centerBlock}>
          <Text style={[styles.titleLabel, { color: colors.mutedForeground }]}>ACTIVE SESSION</Text>
          <View style={styles.timerRow}>
            <Animated.View style={[styles.liveDot, { backgroundColor: colors.red }, pulseStyle]} />
            <Text style={[styles.timerText, { color: colors.red }]}>{formattedTime}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onComplete}
          style={[styles.completeBtn, { backgroundColor: accent }]}
        >
          <Text style={[styles.completeBtnText, { color: colors.primaryForeground }]}>Complete</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatPill icon="flame" value={`${activeCalories}`} label="kcal" color={ORANGE} colors={colors} />
        <StatPill icon="barbell" value={`${totalVolume}`} label="kg vol" color={colors.cyan} colors={colors} />
        <StatPill icon="layers" value={`${completedExercises}/${totalExercises}`} label="exercises" color={colors.green} colors={colors} />

        {/* Ring */}
        <View style={styles.ringWrap}>
          <Svg width={56} height={56} viewBox="0 0 56 56">
            <Circle cx={28} cy={28} r={radius} stroke={ringTrack} strokeWidth={4} fill="none" />
            <Circle
              cx={28} cy={28} r={radius}
              stroke={accent} strokeWidth={4} fill="none"
              strokeDasharray={`${strokeDash}`}
              strokeDashoffset={`${strokeOffset}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
            />
          </Svg>
          <View style={styles.ringTextWrap}>
            <Text style={[styles.ringPct, { color: accent }]}>{Math.round(progressPct * 100)}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function StatPill({
  icon,
  value,
  label,
  color,
  colors,
}: {
  icon: any;
  value: string;
  label: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBlock: { alignItems: "center" },
  titleLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timerText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  completeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  completeBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  ringWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  ringTextWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringPct: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
