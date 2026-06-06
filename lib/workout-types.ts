export interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface CompletedWorkout {
  id: string;
  dayName: string;
  focus: string;
  date: string;
  duration: number;
  calories: number;
  totalVolume: number;
  setsCount: number;
  exercises: Array<{
    name: string;
    setsLogged: SetLog[];
  }>;
}

export interface ActiveSession {
  dayName: string;
  focus: string;
  startedAt: string;
  workoutSessionId?: string;
  currentExerciseIdx: number;
  exercises: Array<{
    id: string;
    name: string;
    target: string;
    sets: number;
    repsRange: string;
    restSeconds: number;
    difficulty: string;
    setsLogged: SetLog[];
    completed: boolean;
  }>;
}
