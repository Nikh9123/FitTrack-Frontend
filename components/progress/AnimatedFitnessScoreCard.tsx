import { MOTION, entranceFade } from "@/constants/animations";
import { ProgressRing } from "@/components/ui/ProgressRing";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let frame: number;
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setValue(Math.round(target * p));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function BreakdownBar({
  label,
  pts,
  maxPts,
  color,
  delay,
  trackColor,
}: {
  label: string;
  pts: number;
  maxPts: number;
  color: string;
  delay: number;
  trackColor: string;
}) {
  const width = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(width);
    width.value = 0;
    width.value = withDelay(delay, withTiming(Math.min(pts / maxPts, 1), MOTION.timingRing));
  }, [pts, maxPts, delay, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownKey, { color: trackColor }]}>{label}</Text>
      <View style={[styles.breakdownTrack, { backgroundColor: trackColor + "40" }]}>
        <Animated.View style={[styles.breakdownFill, { backgroundColor: color }, fillStyle]} />
      </View>
      <Text style={[styles.breakdownPts, { color }]}>{pts}</Text>
    </View>
  );
}

export function AnimatedFitnessScoreCard({
  score,
  label,
  breakdown,
  colors,
  animKey,
}: {
  score: number;
  label: string;
  breakdown: Record<string, number>;
  colors: any;
  animKey?: string | number;
}) {
  const scoreColor =
    score >= 80 ? colors.green : score >= 60 ? colors.primary : score >= 40 ? "#F59E0B" : colors.red;
  const displayScore = useCountUp(score);

  return (
    <Animated.View
      entering={entranceFade(0)}
      style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.scoreCardInner}>
        <ProgressRing
          size={128}
          strokeWidth={10}
          progress={score / 100}
          color={scoreColor}
          trackColor={colors.border}
          animKey={animKey ?? score}
          centerContent={
            <View style={styles.scoreCenter}>
              <Text style={[styles.scoreNum, { color: scoreColor }]}>{displayScore}</Text>
              <Text style={[styles.scoreMax, { color: colors.mutedForeground }]}>/100</Text>
            </View>
          }
        />
        <View style={styles.scoreInfo}>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>AI FITNESS SCORE</Text>
          <Text style={[styles.scoreLabel2, { color: colors.foreground }]}>{label}</Text>
          <View style={styles.breakdownList}>
            {Object.entries(breakdown).map(([key, pts], i) => (
              <BreakdownBar
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                pts={pts as number}
                maxPts={20}
                color={scoreColor}
                delay={i * 80}
                trackColor={colors.mutedForeground}
              />
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scoreCard: { borderRadius: 20, padding: 18, borderWidth: 1, overflow: "hidden" },
  scoreCardInner: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreCenter: { alignItems: "center" },
  scoreNum: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  scoreMax: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: -4 },
  scoreInfo: { flex: 1, gap: 4 },
  scoreLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  scoreLabel2: { fontSize: 18, fontFamily: "Inter_700Bold" },
  breakdownList: { gap: 5, marginTop: 4 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  breakdownKey: { fontSize: 10, fontFamily: "Inter_400Regular", width: 70 },
  breakdownTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  breakdownFill: { height: 4, borderRadius: 2 },
  breakdownPts: { fontSize: 10, fontFamily: "Inter_600SemiBold", width: 22, textAlign: "right" },
});
