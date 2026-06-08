import { useTheme } from "@/context/ThemeContext";
import { hapticError, hapticLight, hapticSuccess } from "@/lib/haptics";
import type { SetLog } from "@/lib/workout-types";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");
const REST_OPTIONS = [30, 60, 90, 120] as const;
const WEIGHT_CHIPS = [2.5, 5, 10] as const;

type DraftRow = {
  weight: string;
  reps: string;
  completed: boolean;
};

type ExerciseShape = {
  name: string;
  repsRange: string;
  restSeconds: number;
  setsLogged: SetLog[];
};

export interface ExerciseLoggingModalProps {
  exercise: ExerciseShape;
  personalRecords: Record<string, number>;
  colors: any;
  onClose: () => void;
  onSaveSet: (setIdx: number, weight: number, reps: number) => void;
  onSaveExercise: (sets: SetLog[]) => void;
  onFinishWorkout: () => void;
}

function initDraftRows(exercise: ExerciseShape): DraftRow[] {
  if (exercise.setsLogged.length === 0) {
    return [{ weight: "", reps: "", completed: false }];
  }
  return exercise.setsLogged.map((s) => ({
    weight: s.weight > 0 ? String(s.weight) : "",
    reps: s.reps > 0 ? String(s.reps) : "",
    completed: s.completed,
  }));
}

function parseWeight(val: string): number {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

function parseReps(val: string): number {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : 0;
}

function formatWeight(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export function ExerciseLoggingModal({
  exercise,
  personalRecords,
  colors,
  onClose,
  onSaveSet,
  onSaveExercise,
  onFinishWorkout,
}: ExerciseLoggingModalProps) {
  const { isDark } = useTheme();
  const accent = colors.primary;
  const accentSoft = colors.primary + "15";
  const previousPR = personalRecords[exercise.name] ?? 0;

  const [draftRows, setDraftRows] = useState<DraftRow[]>(() => initDraftRows(exercise));
  const [restDuration, setRestDuration] = useState(() => {
    const preferred = exercise.restSeconds;
    return (REST_OPTIONS as readonly number[]).includes(preferred) ? preferred : 60;
  });
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const summary = useMemo(() => {
    let totalSets = 0;
    let totalReps = 0;
    let totalVolume = 0;
    draftRows.forEach((row) => {
      if (!row.completed) return;
      const w = parseWeight(row.weight);
      const r = parseReps(row.reps);
      if (w <= 0 || r <= 0) return;
      totalSets += 1;
      totalReps += r;
      totalVolume += w * r;
    });
    return { totalSets, totalReps, totalVolume };
  }, [draftRows]);

  useEffect(() => {
    if (restSecondsLeft <= 0) {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      return;
    }
    restIntervalRef.current = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) {
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
          void hapticLight();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [restSecondsLeft > 0]);

  const startRestTimer = useCallback(() => {
    setRestSecondsLeft(restDuration);
  }, [restDuration]);

  const skipRestTimer = useCallback(() => {
    setRestSecondsLeft(0);
  }, []);

  const updateRow = (idx: number, patch: Partial<DraftRow>) => {
    setDraftRows((rows) => rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const changeWeight = (idx: number, delta: number) => {
    void hapticLight();
    const current = parseWeight(draftRows[idx]?.weight ?? "0");
    updateRow(idx, { weight: formatWeight(Math.max(0, current + delta)) });
  };

  const changeReps = (idx: number, delta: number) => {
    void hapticLight();
    const current = parseReps(draftRows[idx]?.reps ?? "0");
    updateRow(idx, { reps: String(Math.max(0, current + delta)) });
  };

  const saveRow = (idx: number) => {
    const w = parseWeight(draftRows[idx].weight);
    const r = parseReps(draftRows[idx].reps);
    if (w <= 0 || r <= 0) {
      void hapticError();
      Alert.alert("Invalid set", "Enter weight and reps before saving.");
      return;
    }
    void hapticSuccess();
    updateRow(idx, { completed: true, weight: formatWeight(w), reps: String(r) });
    onSaveSet(idx, w, r);

    const isNewPR = w > previousPR;
    setToastMessage(isNewPR ? `New PR — ${w} kg! Rest timer started.` : `Set ${idx + 1} saved. Rest timer started.`);
    setTimeout(() => setToastMessage(null), 2500);
    startRestTimer();
  };

  const addSet = () => {
    void hapticLight();
    const last = draftRows[draftRows.length - 1];
    const copyWeight = last ? (last.weight || (last.completed ? "" : "")) : "";
    const copyReps = last ? (last.reps || "") : "";
    setDraftRows((rows) => [
      ...rows,
      {
        weight: copyWeight,
        reps: copyReps,
        completed: false,
      },
    ]);
  };

  const handleSaveExercise = () => {
    const sets: SetLog[] = draftRows
      .filter((row) => row.completed && parseWeight(row.weight) > 0 && parseReps(row.reps) > 0)
      .map((row) => ({
        weight: parseWeight(row.weight),
        reps: parseReps(row.reps),
        completed: true,
      }));
    if (sets.length === 0) {
      Alert.alert("No sets logged", "Save at least one set before finishing this exercise.");
      return;
    }
    void hapticSuccess();
    onSaveExercise(sets);
  };

  return (
    <View style={[styles.overlay, { backgroundColor: colors.foreground + (isDark ? "99" : "55") }]}>
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {toastMessage ? (
          <View style={[styles.toast, { backgroundColor: accent }]}>
            <Ionicons name="sparkles" size={14} color={colors.primaryForeground} />
            <Text style={[styles.toastText, { color: colors.primaryForeground }]}>{toastMessage}</Text>
          </View>
        ) : null}

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.exerciseName, { color: colors.foreground }]} numberOfLines={2}>
              {exercise.name}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                <Ionicons name="repeat-outline" size={12} color={colors.cyan} />
                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>Goal {exercise.repsRange}</Text>
              </View>
              {previousPR > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.yellow + "18" }]}>
                  <Ionicons name="trophy" size={12} color={colors.yellow} />
                  <Text style={[styles.badgeText, { color: colors.yellow }]}>PR {previousPR} kg</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close exercise logging"
            style={[styles.closeBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="close" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={[styles.summaryRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{summary.totalSets}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Sets</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{summary.totalReps}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Reps</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: accent }]}>{summary.totalVolume}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Volume (kg)</Text>
          </View>
        </View>

        {/* Rest timer */}
        {restSecondsLeft > 0 ? (
          <View style={[styles.restBar, { backgroundColor: accentSoft, borderColor: accent + "44" }]}>
            <Ionicons name="timer-outline" size={18} color={accent} />
            <Text style={[styles.restBarText, { color: colors.foreground }]}>
              Rest {restSecondsLeft}s
            </Text>
            <TouchableOpacity onPress={skipRestTimer} style={[styles.restSkipBtn, { backgroundColor: colors.card }]}>
              <Text style={[styles.restSkipText, { color: colors.mutedForeground }]}>Skip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.restPickerRow}>
            <Text style={[styles.restPickerLabel, { color: colors.mutedForeground }]}>Rest after set</Text>
            <View style={styles.restPickerChips}>
              {REST_OPTIONS.map((sec) => (
                <TouchableOpacity
                  key={sec}
                  onPress={() => {
                    void hapticLight();
                    setRestDuration(sec);
                  }}
                  style={[
                    styles.restChip,
                    {
                      backgroundColor: restDuration === sec ? accent : colors.muted,
                      borderColor: restDuration === sec ? accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.restChipText,
                      { color: restDuration === sec ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {sec}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Column headers */}
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.colHeader, styles.colSet, { color: colors.mutedForeground }]}>Set</Text>
          <Text style={[styles.colHeader, styles.colWeight, { color: colors.mutedForeground }]}>kg</Text>
          <Text style={[styles.colHeader, styles.colReps, { color: colors.mutedForeground }]}>Reps</Text>
          <View style={styles.colSave} />
        </View>

        {/* Sets list */}
        <ScrollView style={styles.setList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {draftRows.map((row, idx) => {
            const isSaved = row.completed;
            return (
              <View
                key={`set-${idx}`}
                style={[
                  styles.setRow,
                  {
                    backgroundColor: isSaved ? accentSoft : colors.card,
                    borderColor: isSaved ? accent + "55" : colors.border,
                  },
                ]}
              >
                <View style={[styles.colSet, styles.setNumWrap]}>
                  <View
                    style={[
                      styles.setNumBadge,
                      { backgroundColor: isSaved ? colors.green : accent },
                    ]}
                  >
                    {isSaved ? (
                      <Ionicons name="checkmark" size={13} color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.setNumText, { color: colors.primaryForeground }]}>{idx + 1}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.colWeight}>
                  {isSaved ? (
                    <Text style={[styles.savedValue, { color: colors.foreground }]}>{row.weight}</Text>
                  ) : (
                    <>
                      <View style={[styles.stepper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                        <TouchableOpacity
                          onPress={() => changeWeight(idx, -2.5)}
                          style={[styles.stepperBtn, { borderRightColor: colors.border }]}
                        >
                          <Ionicons name="remove" size={20} color={colors.foreground} />
                        </TouchableOpacity>
                        <TextInput
                          value={row.weight}
                          onChangeText={(v) => updateRow(idx, { weight: v })}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={colors.mutedForeground}
                          style={[styles.stepperInput, { color: colors.foreground }]}
                        />
                        <TouchableOpacity
                          onPress={() => changeWeight(idx, 2.5)}
                          style={[styles.stepperBtn, styles.stepperBtnRight, { borderLeftColor: colors.border }]}
                        >
                          <Ionicons name="add" size={20} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.weightChips}>
                        {WEIGHT_CHIPS.map((chip) => (
                          <TouchableOpacity
                            key={chip}
                            onPress={() => changeWeight(idx, chip)}
                            style={[styles.weightChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                          >
                            <Text style={[styles.weightChipText, { color: colors.foreground }]}>+{chip}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.colReps}>
                  {isSaved ? (
                    <Text style={[styles.savedValue, { color: colors.foreground }]}>{row.reps}</Text>
                  ) : (
                    <View style={[styles.stepper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                      <TouchableOpacity
                        onPress={() => changeReps(idx, -1)}
                        style={[styles.stepperBtn, { borderRightColor: colors.border }]}
                      >
                        <Ionicons name="remove" size={20} color={colors.foreground} />
                      </TouchableOpacity>
                      <TextInput
                        value={row.reps}
                        onChangeText={(v) => updateRow(idx, { reps: v })}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.stepperInput, { color: colors.foreground }]}
                      />
                      <TouchableOpacity
                        onPress={() => changeReps(idx, 1)}
                        style={[styles.stepperBtn, styles.stepperBtnRight, { borderLeftColor: colors.border }]}
                      >
                        <Ionicons name="add" size={20} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={[styles.colSave, styles.saveWrap]}>
                  {!isSaved ? (
                    <TouchableOpacity
                      onPress={() => saveRow(idx)}
                      style={[styles.saveSetBtn, { backgroundColor: accent }]}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.primaryForeground} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            onPress={addSet}
            style={[styles.addSetBtn, { borderColor: accent, backgroundColor: accentSoft }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={accent} />
            <Text style={[styles.addSetText, { color: accent }]}>Add Set</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sticky footer */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity
            onPress={handleSaveExercise}
            style={[styles.footerBtn, styles.footerBtnPrimary, { backgroundColor: accent }]}
          >
            <Text style={[styles.footerBtnText, { color: colors.primaryForeground }]}>Save Exercise</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Finish workout?",
                "This will complete your entire session.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Finish", style: "destructive", onPress: onFinishWorkout },
                ],
              );
            }}
            style={[styles.footerBtn, styles.footerBtnSecondary, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Text style={[styles.footerBtnText, { color: colors.foreground }]}>Finish Workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  toastText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    maxWidth: SCREEN_W - 80,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  restBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  restBarText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  restSkipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restSkipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  restPickerRow: {
    marginBottom: 10,
    gap: 6,
  },
  restPickerLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  restPickerChips: {
    flexDirection: "row",
    gap: 8,
  },
  restChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  restChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  colHeader: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  colSet: { width: 36 },
  colWeight: { flex: 1.3, marginRight: 6 },
  colReps: { flex: 1, marginRight: 6 },
  colSave: { width: 40 },
  setList: {
    maxHeight: 340,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  setNumWrap: {
    paddingTop: 8,
    alignItems: "center",
  },
  setNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  setNumText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    overflow: "hidden",
  },
  stepperBtn: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
  },
  stepperBtnRight: {
    borderRightWidth: 0,
    borderLeftWidth: 1,
  },
  stepperInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    paddingVertical: 0,
    minWidth: 48,
  },
  savedValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    paddingTop: 10,
    textAlign: "center",
  },
  weightChips: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  weightChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  weightChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  saveWrap: {
    paddingTop: 4,
    alignItems: "center",
  },
  saveSetBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  addSetText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnPrimary: {},
  footerBtnSecondary: {
    borderWidth: 1,
  },
  footerBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
