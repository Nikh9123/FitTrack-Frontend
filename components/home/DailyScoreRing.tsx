import { ProgressRing } from "@/components/ui/ProgressRing";
import { withAlpha } from "@/constants/energy-glow";
import { useCountUp } from "@/hooks/useCountUp";
import { useColors } from "@/hooks/useColors";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  onPress?: () => void;
}

export function DailyScoreRing({ score, subtitle, breakdown, animKey, onPress }: DailyScoreRingProps) {
  const colors = useColors();
  const track = colors.ringTrack;
  const gradientEnd = colors.gradientEnd;
  const displayScore = useCountUp(score, 600);

  const card = (
    <LinearGradient
      colors={[colors.primary + "35", gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: colors.border }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.energyLayer,
          { backgroundColor: withAlpha(colors.primary, 0.04) },
        ]}
      />

      <View style={styles.mainRow}>
        <View style={styles.copy}>
          <Text style={[colors.typography.label, { color: colors.mutedForeground }]}>Daily Score</Text>
          {subtitle ? (
            <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 8, lineHeight: 18 }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.ringWrap}>
          <View
            pointerEvents="none"
            style={[styles.ringGlow, { backgroundColor: withAlpha(colors.primary, 0.08) }]}
          />
          <ProgressRing
            size={92}
            strokeWidth={8}
            progress={score / 100}
            color={colors.primary}
            trackColor={track}
            animKey={animKey ?? score}
            centerContent={
              <>
                <Text style={[colors.typography.h2, { color: colors.foreground, textAlign: "center" }]}>
                  {displayScore}
                </Text>
                <Text
                  style={[
                    colors.typography.tiny,
                    { color: colors.mutedForeground, textAlign: "center", marginTop: 2 },
                  ]}
                >
                  / 100
                </Text>
              </>
            }
          />
        </View>
      </View>

      {breakdown && breakdown.length > 0 ? (
        <View style={styles.breakdownRow}>
          {breakdown.map((item) => {
            const pct = Math.min(item.value / item.max, 1);
            return (
              <View key={item.label} style={styles.breakdownItem}>
                <View style={[styles.breakdownTrack, { backgroundColor: colors.border }]}>
                  <LinearGradient
                    colors={[item.color, withAlpha(item.color, 0.55)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[styles.breakdownFill, { width: `${pct * 100}%` }]}
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

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {card}
      </TouchableOpacity>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
    overflow: "hidden",
  },
  energyLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
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
  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
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
