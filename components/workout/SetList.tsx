import { useColors } from "@/hooks/useColors";
import type { SetLog } from "@/lib/workout-types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SetRow } from "./SetRow";

interface SetListProps {
  sets: SetLog[];
  targetSets: number;
  exerciseIdx: number;
  onLogSet: (exerciseIdx: number, setIdx: number, weight: number, reps: number) => void;
  onAddSet: (exerciseIdx: number) => void;
  accentColor: string;
}

export function SetList({
  sets,
  targetSets,
  exerciseIdx,
  onLogSet,
  onAddSet,
  accentColor,
}: SetListProps) {
  const colors = useColors();
  const completedCount = sets.filter((s) => s.completed && s.reps > 0).length;

  return (
    <View style={styles.wrap}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>SET</Text>
        <Text style={[styles.headerLabel, { color: colors.mutedForeground, flex: 1, textAlign: "center" }]}>
          WEIGHT
        </Text>
        <Text style={[styles.headerLabel, { color: colors.mutedForeground, flex: 1, textAlign: "center" }]}>
          REPS
        </Text>
        <Text style={[styles.headerLabel, { color: colors.mutedForeground, width: 42, textAlign: "center" }]}>
          DONE
        </Text>
      </View>

      {/* Set rows */}
      {sets.map((log, idx) => (
        <SetRow
          key={idx}
          setIndex={idx}
          log={log}
          previousLog={idx > 0 ? sets[idx - 1] : null}
          onLog={(weight, reps) => onLogSet(exerciseIdx, idx, weight, reps)}
          accentColor={accentColor}
        />
      ))}

      {/* Completion summary */}
      <Text style={[styles.summary, { color: colors.mutedForeground }]}>
        {completedCount} / {sets.length} sets logged
        {sets.length < targetSets ? ` · target ${targetSets}` : ""}
      </Text>

      {/* Add set button */}
      <TouchableOpacity
        onPress={() => onAddSet(exerciseIdx)}
        style={[styles.addBtn, { borderColor: accentColor + "55" }]}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={15} color={accentColor} />
        <Text style={[styles.addBtnText, { color: accentColor }]}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 10,
    gap: 6,
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    width: 22,
  },
  summary: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
