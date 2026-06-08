import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HomeAtAGlanceProps {
  calories: number;
  calorieGoal: number;
  caloriesRemaining: number;
  caloriesBurned: number;
  sleepHours: number;
  protein: number;
  carbs: number;
  fat: number;
  onCaloriesPress?: () => void;
  onSleepPress?: () => void;
  onProteinPress?: () => void;
  onCarbsPress?: () => void;
  onFatPress?: () => void;
}

function MiniStat({
  icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  const inner = (
    <View style={[styles.stat, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[colors.typography.caption, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

function MacroPill({
  label,
  value,
  max,
  color,
  onPress,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  const pct = Math.min(value / max, 1);
  const inner = (
    <View style={styles.macroPill}>
      <View style={styles.macroTop}>
        <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[colors.typography.tiny, { color, fontFamily: "Inter_600SemiBold" }]}>{value.toFixed(0)}g</Text>
      </View>
      <View style={[styles.macroTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

/** Compact summary — replaces separate Calories, Sleep, and Macros cards */
export function HomeAtAGlance({
  calories,
  calorieGoal,
  caloriesRemaining,
  caloriesBurned,
  sleepHours,
  protein,
  carbs,
  fat,
  onCaloriesPress,
  onSleepPress,
  onProteinPress,
  onCarbsPress,
  onFatPress,
}: HomeAtAGlanceProps) {
  const colors = useColors();

  return (
    <GlassCard style={styles.card}>
      <Text style={[colors.typography.h3, { color: colors.foreground, marginBottom: 10 }]}>At a Glance</Text>

      <View style={styles.statRow}>
        <MiniStat
          icon="flame"
          label="Calories"
          value={`${calories} / ${calorieGoal}`}
          color={colors.green}
          onPress={onCaloriesPress}
        />
        <MiniStat
          icon="moon"
          label="Sleep"
          value={sleepHours > 0 ? `${sleepHours}h` : "Not logged"}
          color={colors.purple}
          onPress={onSleepPress}
        />
      </View>

      <View style={[styles.banner, { backgroundColor: colors.green + "12", borderColor: colors.green + "30" }]}>
        <Text style={[colors.typography.caption, { color: colors.green, fontFamily: "Inter_600SemiBold" }]}>
          {caloriesRemaining} kcal left
        </Text>
        <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>
          · burned {caloriesBurned} from activity
        </Text>
      </View>

      <View style={styles.macroRow}>
        <MacroPill label="Protein" value={protein} max={160} color={colors.primary} onPress={onProteinPress} />
        <MacroPill label="Carbs" value={carbs} max={220} color={colors.cyan} onPress={onCarbsPress} />
        <MacroPill label="Fat" value={fat} max={70} color={colors.purple} onPress={onFatPress} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  statRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  macroRow: { flexDirection: "row", gap: 8 },
  macroPill: { flex: 1, gap: 4 },
  macroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  macroTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  macroFill: { height: 4, borderRadius: 2 },
});
