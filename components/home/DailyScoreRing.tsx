import { ProgressRing } from "@/components/ui/ProgressRing";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface ScoreBreakdownItem {
  label: string;
  value: number;
  max: number;
  color: string;
}

interface DailyScoreRingProps {
  score: number;
  subtitle?: string;
  breakdown?: ScoreBreakdownItem[];
  animKey?: string | number;
}

export function DailyScoreRing({ score, subtitle, breakdown, animKey }: DailyScoreRingProps) {
  const colors = useColors();
  const track = (colors as { ringTrack?: string }).ringTrack ?? colors.border;
  const gradientEnd = (colors as { gradientEnd?: string }).gradientEnd ?? colors.surfaceElevated;

  return (
    <LinearGradient
      colors={[colors.primary + "35", gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: colors.border }]}
    >
      <View style={styles.mainRow}>
        <View style={styles.copy}>
          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Daily Score</Text>
          {subtitle ? (
            <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 8, lineHeight: 18 }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <ProgressRing
          size={92}
          strokeWidth={8}
          progress={score / 100}
          color={colors.primary}
          trackColor={track}
          label={String(score)}
          sublabel="/ 100"
          animKey={animKey ?? score}
        />
      </View>

      {breakdown && breakdown.length > 0 ? (
        <View style={styles.breakdownRow}>
          {breakdown.map((item) => {
            const pct = Math.min(item.value / item.max, 1);
            return (
              <View key={item.label} style={styles.breakdownItem}>
                <View style={[styles.breakdownTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.breakdownFill,
                      { width: `${pct * 100}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
                <Text style={[colors.typography.tiny, { color: colors.mutedForeground, marginTop: 4 }]}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  breakdownRow: {
    flexDirection: "row",
    gap: 10,
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  breakdownFill: {
    height: 4,
    borderRadius: 2,
  },
});
