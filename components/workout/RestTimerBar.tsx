import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRESETS = [30, 60, 90, 120, 180];

interface RestTimerBarProps {
  defaultSeconds?: number;
  onDismiss: () => void;
}

export function RestTimerBar({ defaultSeconds = 60, onDismiss }: RestTimerBarProps) {
  const colors = useColors();
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [total, setTotal] = useState(defaultSeconds);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1);

  const resetTimer = useCallback((secs: number) => {
    setTotal(secs);
    setRemaining(secs);
    setPaused(false);
    progress.value = 1;
    progress.value = withTiming(0, { duration: secs * 1000 });
  }, [progress]);

  useEffect(() => {
    resetTimer(defaultSeconds);
  }, [defaultSeconds, resetTimer]);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeLabel = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  const accent = colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Progress bar */}
      <View style={[styles.trackBar, { backgroundColor: colors.muted }]}>
        <Animated.View style={[styles.fillBar, { backgroundColor: remaining === 0 ? colors.green : accent }, barStyle]} />
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>REST</Text>
        <Text style={[styles.timer, { color: remaining === 0 ? colors.green : accent }]}>
          {remaining === 0 ? "Done!" : timeLabel}
        </Text>

        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => resetTimer(p)}
              style={[
                styles.preset,
                { backgroundColor: total === p ? accent + "22" : colors.muted, borderColor: total === p ? accent : "transparent" },
              ]}
            >
              <Text style={[styles.presetText, { color: total === p ? accent : colors.mutedForeground }]}>
                {p < 60 ? `${p}s` : `${p / 60}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setPaused((p) => !p)}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons name={paused ? "play" : "pause"} size={14} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDismiss}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="close" size={14} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  trackBar: {
    height: 3,
    width: "100%",
  },
  fillBar: {
    height: 3,
    borderRadius: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  timer: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    minWidth: 48,
  },
  presets: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  preset: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
