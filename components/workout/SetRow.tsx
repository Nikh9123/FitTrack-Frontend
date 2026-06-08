import { useColors } from "@/hooks/useColors";
import type { SetLog } from "@/lib/workout-types";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface SetRowProps {
  setIndex: number;
  log: SetLog;
  previousLog?: SetLog | null;
  onLog: (weight: number, reps: number) => void;
  accentColor: string;
}

export function SetRow({ setIndex, log, previousLog, onLog, accentColor }: SetRowProps) {
  const colors = useColors();
  const [weight, setWeight] = useState(
    log.completed ? String(log.weight) : previousLog?.weight ? String(previousLog.weight) : "0",
  );
  const [reps, setReps] = useState(
    log.completed ? String(log.reps) : previousLog?.reps ? String(previousLog.reps) : "0",
  );

  const weightNum = parseFloat(weight) || 0;
  const repsNum = parseInt(reps, 10) || 0;

  const handleLog = useCallback(() => {
    if (repsNum > 0) onLog(weightNum, repsNum);
  }, [weightNum, repsNum, onLog]);

  const adjustWeight = (delta: number) => {
    setWeight((w) => String(Math.max(0, Math.round((parseFloat(w) || 0) * 10 + delta * 10) / 10)));
  };

  const adjustReps = (delta: number) => {
    setReps((r) => String(Math.max(0, (parseInt(r, 10) || 0) + delta)));
  };

  const rowBg = log.completed
    ? accentColor + "15"
    : colors.muted;
  const borderColor = log.completed ? accentColor + "55" : colors.border;
  const labelColor = log.completed ? accentColor : colors.mutedForeground;

  return (
    <View style={[styles.row, { backgroundColor: rowBg, borderColor }]}>
      {/* Set label */}
      <View style={styles.setLabel}>
        {log.completed ? (
          <Ionicons name="checkmark-circle" size={16} color={accentColor} />
        ) : (
          <Text style={[styles.setNum, { color: labelColor }]}>{setIndex + 1}</Text>
        )}
      </View>

      {/* Weight control */}
      <View style={styles.control}>
        <TouchableOpacity
          onPress={() => adjustWeight(-2.5)}
          onLongPress={() => adjustWeight(-5)}
          style={styles.nudge}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        />
        <TouchableOpacity
          onPress={() => adjustWeight(2.5)}
          onLongPress={() => adjustWeight(5)}
          style={styles.nudge}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.unit, { color: colors.mutedForeground }]}>kg</Text>
      </View>

      {/* Separator */}
      <Text style={[styles.sep, { color: colors.border }]}>×</Text>

      {/* Reps control */}
      <View style={styles.control}>
        <TouchableOpacity
          onPress={() => adjustReps(-1)}
          style={styles.nudge}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          selectTextOnFocus
          style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
        />
        <TouchableOpacity
          onPress={() => adjustReps(1)}
          style={styles.nudge}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.unit, { color: colors.mutedForeground }]}>reps</Text>
      </View>

      {/* Log button */}
      <Pressable
        onPress={handleLog}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.logBtn,
          {
            backgroundColor: log.completed ? accentColor : accentColor + "22",
            borderColor: accentColor,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons
          name={log.completed ? "checkmark" : "checkmark-outline"}
          size={16}
          color={log.completed ? "#fff" : accentColor}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
    marginBottom: 6,
  },
  setLabel: { width: 22, alignItems: "center" },
  setNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  control: { flexDirection: "row", alignItems: "center", gap: 2 },
  nudge: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  input: {
    width: 40,
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  unit: { fontSize: 11, fontFamily: "Inter_500Medium", marginLeft: 2 },
  sep: { fontSize: 14, fontFamily: "Inter_500Medium", marginHorizontal: 2 },
  logBtn: {
    marginLeft: "auto",
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
