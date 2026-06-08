import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActiveSession, CompletedWorkout, SetLog } from "@/lib/workout-types";
import { logWorkoutSetApi, startWorkoutSessionApi } from "@/lib/workout-session-api";

export interface SessionExercise {
  id: string;
  name: string;
  target: string;
  sets: number;
  repsRange: string;
  restSeconds: number;
  difficulty: string;
  gifUrl?: string;
  instructions?: string[];
  bodyPart?: string;
  equipment?: string;
  estimatedCaloriesPerSet?: number;
  youtubeUrl?: string;
  setsLogged: SetLog[];
  completed: boolean;
}

interface UseActiveWorkoutSessionOptions {
  token: string | null;
  planId: string | null;
  personalRecords: Record<string, number>;
  onComplete: (result: CompletedWorkout, updatedPRs: Record<string, number>) => void;
}

const STORAGE_KEY = "@fittrack_active_session";

export function useActiveWorkoutSession({
  token,
  planId,
  personalRecords,
  onComplete,
}: UseActiveWorkoutSessionOptions) {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore session from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved: ActiveSession = JSON.parse(raw);
        setSession(saved);
        setRunning(true);
      })
      .catch(() => {});
  }, []);

  // Timer
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  const formattedTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const startSession = useCallback(
    async (day: { dayName: string; focus: string; exercises: any[] }) => {
      const exercises: SessionExercise[] = (day.exercises ?? []).map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        target: ex.target || ex.bodyPart || "General",
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        sets: ex.sets ?? 3,
        repsRange: ex.repsRange ?? "10–12",
        restSeconds: ex.restSeconds ?? 60,
        difficulty: ex.difficulty ?? "Beginner",
        gifUrl: ex.gifUrl,
        instructions: ex.instructions ?? [],
        estimatedCaloriesPerSet: ex.estimatedCaloriesPerSet ?? 12,
        youtubeUrl: ex.youtubeUrl ?? ex.tutorialYoutubeUrl ?? null,
        setsLogged: [{ reps: 0, weight: 0, completed: false }],
        completed: false,
      }));

      const newSession: ActiveSession = {
        dayName: day.dayName,
        focus: day.focus,
        startedAt: new Date().toISOString(),
        currentExerciseIdx: 0,
        exercises,
      };

      setSession(newSession);
      setRunning(true);
      setElapsedSeconds(0);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));

      if (token) {
        try {
          const serverSession = await startWorkoutSessionApi(token, planId);
          const withId = { ...newSession, workoutSessionId: serverSession.id };
          setSession(withId);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(withId));
        } catch {
          // started locally — sync will be retried on complete
        }
      }
    },
    [token, planId],
  );

  const logSet = useCallback(
    async (exerciseIdx: number, setIdx: number, weight: number, reps: number) => {
      setSession((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, exercises: prev.exercises.map((ex, i) => {
          if (i !== exerciseIdx) return ex;
          const logs = [...ex.setsLogged];
          while (logs.length <= setIdx) logs.push({ reps: 0, weight: 0, completed: false });
          logs[setIdx] = { weight, reps, completed: true };
          return { ...ex, setsLogged: logs };
        })};
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      if (token) {
        setSession((current) => {
          if (!current?.workoutSessionId) return current;
          const ex = current.exercises[exerciseIdx];
          logWorkoutSetApi(token, {
            workoutSessionId: current.workoutSessionId,
            exerciseId: ex.id,
            exerciseName: ex.name,
            weight,
            reps,
            setsCompleted: setIdx + 1,
          }).catch(() => {});
          return current;
        });
      }
    },
    [token],
  );

  const addSet = useCallback((exerciseIdx: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, exercises: prev.exercises.map((ex, i) => {
        if (i !== exerciseIdx) return ex;
        const last = ex.setsLogged[ex.setsLogged.length - 1];
        const newSet: SetLog = last?.completed
          ? { weight: last.weight, reps: last.reps, completed: false }
          : { reps: 0, weight: 0, completed: false };
        return { ...ex, setsLogged: [...ex.setsLogged, newSet] };
      })};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const markExerciseDone = useCallback((exerciseIdx: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, exercises: prev.exercises.map((ex, i) =>
        i === exerciseIdx ? { ...ex, completed: true } : ex,
      )};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const discardSession = useCallback(async () => {
    setSession(null);
    setRunning(false);
    setElapsedSeconds(0);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const completeSession = useCallback(async () => {
    if (!session) return;
    setRunning(false);

    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    let totalVolume = 0;
    let completedSetsCount = 0;

    const exercises = session.exercises.map((ex) => {
      const doneSets = ex.setsLogged.filter((s) => s.completed && s.reps > 0);
      doneSets.forEach((s) => {
        totalVolume += s.weight * s.reps;
        completedSetsCount++;
      });
      return { name: ex.name, setsLogged: doneSets };
    });

    const calories = Math.round(completedSetsCount * 12 + durationMinutes * 4.5);

    const result: CompletedWorkout = {
      id: Date.now().toString(),
      dayName: session.dayName,
      focus: session.focus,
      date: new Date().toISOString().split("T")[0],
      duration: durationMinutes,
      calories,
      totalVolume,
      setsCount: completedSetsCount,
      exercises,
    };

    // Compute updated PRs
    const updatedPRs = { ...personalRecords };
    session.exercises.forEach((ex) => {
      let max = 0;
      ex.setsLogged.forEach((s) => { if (s.completed && s.weight > max) max = s.weight; });
      if (max > 0 && max > (updatedPRs[ex.name] ?? 0)) updatedPRs[ex.name] = max;
    });

    await AsyncStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setElapsedSeconds(0);

    onComplete(result, updatedPRs);
  }, [session, elapsedSeconds, personalRecords, onComplete]);

  // Derived stats
  const completedExercises = session?.exercises.filter((e) => e.completed).length ?? 0;
  const totalExercises = session?.exercises.length ?? 0;
  const progressPct = totalExercises > 0 ? completedExercises / totalExercises : 0;
  const completedSetsCount =
    session?.exercises.reduce(
      (n, ex) => n + ex.setsLogged.filter((s) => s.completed && s.reps > 0).length,
      0,
    ) ?? 0;
  const totalVolume =
    session?.exercises.reduce((vol, ex) => {
      return (
        vol +
        ex.setsLogged
          .filter((s) => s.completed)
          .reduce((v, s) => v + s.weight * s.reps, 0)
      );
    }, 0) ?? 0;
  const activeCalories = Math.round(
    completedSetsCount * 12 + Math.floor(elapsedSeconds / 60) * 4.5,
  );

  return {
    session,
    running,
    elapsedSeconds,
    formattedTime,
    startSession,
    logSet,
    addSet,
    markExerciseDone,
    discardSession,
    completeSession,
    // stats
    completedExercises,
    totalExercises,
    progressPct,
    totalVolume,
    activeCalories,
  };
}
