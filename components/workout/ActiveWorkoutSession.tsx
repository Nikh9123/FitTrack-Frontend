/**
 * Phase B — Full-screen active workout session.
 * Replaces the old modal-based ActiveSessionPlayer + ExerciseLoggingModal combo.
 * All set logging happens inline; no secondary modal needed.
 */
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import type { ActiveSession } from "@/lib/workout-types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LiveWorkoutDashboard } from "./LiveWorkoutDashboard";
import { RestTimerBar } from "./RestTimerBar";
import { SetList } from "./SetList";

const ORANGE = "#FF6B35";
const DIFF_COLOR: Record<string, string> = {
  Beginner: "#22C55E",
  Intermediate: "#F59E0B",
  Advanced: "#EF4444",
};

interface ActiveWorkoutSessionProps {
  session: ActiveSession;
  elapsedSeconds: number;
  formattedTime: (s: number) => string;
  completedExercises: number;
  totalExercises: number;
  progressPct: number;
  totalVolume: number;
  activeCalories: number;
  personalRecords: Record<string, number>;
  topPad: number;
  onLogSet: (exerciseIdx: number, setIdx: number, weight: number, reps: number) => void;
  onAddSet: (exerciseIdx: number) => void;
  onMarkDone: (exerciseIdx: number) => void;
  onClose: () => void;
  onComplete: () => void;
}

export function ActiveWorkoutSession({
  session,
  elapsedSeconds,
  formattedTime,
  completedExercises,
  totalExercises,
  progressPct,
  totalVolume,
  activeCalories,
  personalRecords,
  topPad,
  onLogSet,
  onAddSet,
  onMarkDone,
  onClose,
  onComplete,
}: ActiveWorkoutSessionProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [restForExercise, setRestForExercise] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const accent = colors.primary;
  const accentSoft = accent + "15";

  const handleLogSet = useCallback(
    (exerciseIdx: number, setIdx: number, weight: number, reps: number) => {
      onLogSet(exerciseIdx, setIdx, weight, reps);
      const ex = session.exercises[exerciseIdx];
      const allDone = ex.setsLogged.every((s, i) =>
        i === setIdx ? reps > 0 : s.completed,
      );
      if (allDone) {
        onMarkDone(exerciseIdx);
      }
      // Show rest timer for this exercise
      setRestForExercise(exerciseIdx);
    },
    [onLogSet, onMarkDone, session.exercises],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Subtle bg glow */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={[styles.bgGlow, { backgroundColor: accent, opacity: isDark ? 0.12 : 0.05 }]} />
      </View>

      {/* Sticky dashboard */}
      <View style={[styles.dashboardWrap, { paddingTop: topPad + 8, paddingHorizontal: 14 }]}>
        <LiveWorkoutDashboard
          focusName={session.focus}
          formattedTime={formattedTime(elapsedSeconds)}
          completedExercises={completedExercises}
          totalExercises={totalExercises}
          totalVolume={totalVolume}
          activeCalories={activeCalories}
          progressPct={progressPct}
          onClose={onClose}
          onComplete={onComplete}
        />
      </View>

      {/* Exercise list */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {session.focus} Split — {totalExercises} exercises
        </Text>

        {session.exercises.map((ex, idx) => {
          const isExpanded = expandedIdx === idx;
          const showRest = restForExercise === idx;
          const isFirstUncompleted =
            session.exercises.findIndex((e) => !e.completed) === idx;
          const pr = personalRecords[ex.name] ?? null;
          const lastDoneSet = ex.setsLogged.filter((s) => s.completed && s.reps > 0).slice(-1)[0];

          return (
            <ExerciseCard
              key={ex.id + idx}
              exercise={ex}
              exerciseIdx={idx}
              isExpanded={isExpanded}
              isActive={isFirstUncompleted}
              pr={pr}
              lastDoneSet={lastDoneSet ?? null}
              showRest={showRest}
              onToggleExpand={() => setExpandedIdx(isExpanded ? null : idx)}
              onLogSet={handleLogSet}
              onAddSet={onAddSet}
              onDismissRest={() => setRestForExercise(null)}
              accent={accent}
              accentSoft={accentSoft}
              colors={colors}
            />
          );
        })}

        <View style={styles.completeRow}>
          <TouchableOpacity
            onPress={onComplete}
            style={[styles.bigCompleteBtn, { backgroundColor: accent }]}
            activeOpacity={0.88}
          >
            <Ionicons name="trophy-outline" size={20} color={colors.primaryForeground} />
            <Text style={[styles.bigCompleteBtnText, { color: colors.primaryForeground }]}>
              Finish Workout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────
function ExerciseCard({
  exercise,
  exerciseIdx,
  isExpanded,
  isActive,
  pr,
  lastDoneSet,
  showRest,
  onToggleExpand,
  onLogSet,
  onAddSet,
  onDismissRest,
  accent,
  accentSoft,
  colors,
}: {
  exercise: ActiveSession["exercises"][number] & {
    gifUrl?: string;
    instructions?: string[];
    bodyPart?: string;
    equipment?: string;
    estimatedCaloriesPerSet?: number;
  };
  exerciseIdx: number;
  isExpanded: boolean;
  isActive: boolean;
  pr: number | null;
  lastDoneSet: { weight: number; reps: number } | null;
  showRest: boolean;
  onToggleExpand: () => void;
  onLogSet: (exIdx: number, setIdx: number, w: number, r: number) => void;
  onAddSet: (exIdx: number) => void;
  onDismissRest: () => void;
  accent: string;
  accentSoft: string;
  colors: any;
}) {
  const diffColor = DIFF_COLOR[exercise.difficulty] ?? "#888";
  const completedSets = exercise.setsLogged.filter((s) => s.completed && s.reps > 0).length;
  const allDone = exercise.completed;
  const borderColor = allDone
    ? (colors.green + "55")
    : isActive
    ? accent + "44"
    : colors.border;
  const cardBg = allDone ? (colors.green + "08") : isActive ? accentSoft : colors.card;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      {/* Card header */}
      <TouchableOpacity
        onPress={onToggleExpand}
        activeOpacity={0.85}
        style={styles.cardHeader}
      >
        {/* Left: number badge */}
        <View
          style={[
            styles.exNumBadge,
            {
              backgroundColor: allDone
                ? colors.green + "22"
                : isActive
                ? accentSoft
                : colors.muted,
            },
          ]}
        >
          {allDone ? (
            <Ionicons name="checkmark" size={14} color={colors.green} />
          ) : (
            <Text style={[styles.exNum, { color: isActive ? accent : colors.mutedForeground }]}>
              {exerciseIdx + 1}
            </Text>
          )}
        </View>

        {/* Center: name + meta */}
        <View style={styles.exInfo}>
          <Text style={[styles.exName, { color: colors.foreground }]} numberOfLines={1}>
            {exercise.name}
          </Text>
          <View style={styles.exMeta}>
            <Text style={[styles.exMetaText, { color: colors.mutedForeground }]}>
              {exercise.sets} sets · {exercise.repsRange}
            </Text>
            {exercise.bodyPart ? (
              <View style={[styles.exTag, { backgroundColor: accent + "18" }]}>
                <Text style={[styles.exTagText, { color: accent }]}>{exercise.bodyPart}</Text>
              </View>
            ) : null}
            <View style={[styles.exTag, { backgroundColor: diffColor + "18" }]}>
              <Text style={[styles.exTagText, { color: diffColor }]}>{exercise.difficulty}</Text>
            </View>
          </View>
          {/* PR / last performance */}
          <View style={styles.exPerfRow}>
            {lastDoneSet && (
              <Text style={[styles.exPerfText, { color: colors.mutedForeground }]}>
                Last: {lastDoneSet.weight}kg × {lastDoneSet.reps}
              </Text>
            )}
            {pr && (
              <Text style={[styles.exPerfText, { color: colors.green }]}>
                PR: {pr}kg
              </Text>
            )}
          </View>
        </View>

        {/* Right: sets logged pill + expand */}
        <View style={styles.exRight}>
          <View style={[styles.setsLoggedPill, { backgroundColor: allDone ? colors.green + "22" : colors.muted }]}>
            <Text style={[styles.setsLoggedText, { color: allDone ? colors.green : colors.mutedForeground }]}>
              {completedSets}/{exercise.sets}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.mutedForeground}
            style={{ marginTop: 4 }}
          />
        </View>
      </TouchableOpacity>

      {/* Rest timer (non-blocking, shown when this ex just had a set logged) */}
      {showRest && (
        <RestTimerBar
          defaultSeconds={exercise.restSeconds ?? 60}
          onDismiss={onDismissRest}
        />
      )}

      {/* Expanded: inline set logging + education */}
      {isExpanded && (
        <View style={styles.expandedWrap}>
          {/* GIF/image if available */}
          {exercise.gifUrl ? (
            <Image
              source={{ uri: exercise.gifUrl }}
              style={styles.gifPreview}
              resizeMode="cover"
            />
          ) : null}

          {/* Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <View style={styles.instructionsWrap}>
              <Text style={[styles.instructionsTitle, { color: colors.mutedForeground }]}>
                HOW TO PERFORM
              </Text>
              {exercise.instructions.slice(0, 4).map((step, i) => (
                <View key={i} style={styles.instructionRow}>
                  <View style={[styles.instructionDot, { backgroundColor: accent }]} />
                  <Text style={[styles.instructionText, { color: colors.foreground }]}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Inline set logging */}
          <SetList
            sets={exercise.setsLogged}
            targetSets={exercise.sets}
            exerciseIdx={exerciseIdx}
            onLogSet={onLogSet}
            onAddSet={onAddSet}
            accentColor={accent}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgGlow: {
    position: "absolute",
    top: -100,
    left: -100,
    right: -100,
    height: 400,
    borderRadius: 200,
  },
  dashboardWrap: {
    zIndex: 10,
    elevation: 10,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 48,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  exNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  exNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  exInfo: { flex: 1 },
  exName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  exMeta: { flexDirection: "row", flexWrap: "wrap", gap: 5, alignItems: "center" },
  exMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  exTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  exPerfRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  exPerfText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  exRight: { alignItems: "flex-end", gap: 2 },
  setsLoggedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  setsLoggedText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  expandedWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  gifPreview: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
  },
  instructionsWrap: { marginBottom: 10 },
  instructionsTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  instructionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  instructionText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },
  completeRow: { marginTop: 8 },
  bigCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  bigCompleteBtnText: { fontSize: 17, fontFamily: "Inter_700Bold" },
});
