import { getApiBaseUrl } from "@/lib/api";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface PlanExercise {
  id: string;
  exerciseId: string;
  name: string;
  bodyPart?: string;
  target?: string;
  primaryMuscle?: string | null;
  secondaryMuscles?: string[] | null;
  equipment?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  instructions?: string[];
  tips?: string | null;
  difficulty?: string;
  sets: number;
  repsRange: string;
  restSeconds: number;
  estimatedCaloriesPerSet?: number;
}

export interface WorkoutDayPlan {
  dayName: string;
  focus: string;
  isRest: boolean;
  isCardio: boolean;
  estimatedCalories: number;
  estimatedDuration: string;
  exercises: PlanExercise[];
  sections?: PlanSection[];
}

export interface PlanSection {
  id: string;
  title: string;
  durationMinutes: number;
  exercises: PlanExercise[];
}

export interface WorkoutPlanBundle {
  id: string;
  title: string;
  goal: string | null;
  category: string | null;
  estimatedCalories: number | null;
  estimatedDuration: string | null;
  days: WorkoutDayPlan[];
}

export interface PersonalRecordEntry {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxReps: number | null;
  bodyPart: string | null;
}

interface ApiPlanExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  dayName: string;
  sets: number | null;
  reps: string | null;
  calories: number | null;
  equipment: string | null;
  muscleGroup: string | null;
  tutorialUrl?: string | null;
  orderIndex?: number | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  youtubeUrl?: string | null;
  instructions?: string | null;
  tips?: string | null;
  bodyPart?: string | null;
  targetMuscle?: string | null;
  primaryMuscle?: string | null;
  secondaryMuscles?: string[] | null;
  difficulty?: string | null;
}

interface ApiCurrentPlan {
  id: string;
  title: string;
  category: string | null;
  goal: string | null;
  estimatedCalories: number | null;
  estimatedDuration: string | null;
  exercises: ApiPlanExercise[];
}

function parseInstructions(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split("\n").map((line) => line.trim()).filter(Boolean);
}

function parseEquipment(raw: string | null | undefined, fromArray?: string[] | null): string {
  if (raw?.trim()) return raw.trim();
  if (fromArray?.length) return fromArray[0];
  return "Body weight";
}

function inferFocus(exercises: PlanExercise[], muscleGroup?: string | null): string {
  if (muscleGroup?.trim()) return muscleGroup.trim();
  if (exercises.length === 0) return "Rest";

  const strength = exercises.filter((e) => {
    const bp = (e.bodyPart ?? "").toLowerCase();
    return bp && bp !== "cardio" && bp !== "waist";
  });

  const cardioOnly =
    strength.length === 0 &&
    exercises.some((e) => (e.bodyPart ?? "").toLowerCase() === "cardio");

  if (cardioOnly) return "Cardio";
  if (strength.length === 0) {
    const first = exercises[0];
    return first.target ?? first.bodyPart ?? first.primaryMuscle ?? "Training";
  }

  const counts = new Map<string, number>();
  for (const e of strength) {
    const key = e.target ?? e.bodyPart ?? e.primaryMuscle ?? "Training";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Training";
}

function isDedicatedCardioDay(exercises: PlanExercise[]): boolean {
  const strength = exercises.filter((e) => {
    const bp = (e.bodyPart ?? "").toLowerCase();
    return bp && bp !== "cardio" && bp !== "waist";
  });
  return (
    strength.length === 0 &&
    exercises.some((e) => (e.bodyPart ?? "").toLowerCase() === "cardio")
  );
}

/** Overlay focus/sections/duration from onboarding JSON onto API-persisted days */
export function mergePlanDaysWithTemplate(
  apiDays: WorkoutDayPlan[],
  template: Partial<WorkoutDayPlan>[],
): WorkoutDayPlan[] {
  if (!template.length) return apiDays;

  return apiDays.map((apiDay, index) => {
    const tpl =
      template.find((d) => d.dayName === apiDay.dayName) ??
      template[index] ??
      null;
    if (!tpl) return apiDay;

    const exercises = apiDay.exercises.length > 0 ? apiDay.exercises : (tpl.exercises ?? []);
    const isRest = tpl.isRest ?? apiDay.isRest;
    const isCardio = tpl.isCardio ?? apiDay.isCardio ?? isDedicatedCardioDay(exercises);

    return {
      ...apiDay,
      focus: tpl.focus ?? apiDay.focus,
      isRest,
      isCardio,
      sections: tpl.sections ?? apiDay.sections,
      estimatedDuration: tpl.estimatedDuration ?? apiDay.estimatedDuration,
      estimatedCalories: tpl.estimatedCalories ?? apiDay.estimatedCalories,
      exercises,
    };
  });
}

function mapApiExercise(ex: ApiPlanExercise): PlanExercise {
  const sets = ex.sets ?? 3;
  const caloriesPerSet =
    ex.calories != null && sets > 0 ? Math.round(ex.calories / sets) : 12;

  return {
    id: ex.exerciseId || ex.id,
    exerciseId: ex.exerciseId || ex.id,
    name: ex.exerciseName,
    bodyPart: ex.bodyPart ?? ex.muscleGroup ?? undefined,
    target: ex.targetMuscle ?? ex.primaryMuscle ?? ex.muscleGroup ?? undefined,
    primaryMuscle: ex.primaryMuscle,
    secondaryMuscles: ex.secondaryMuscles,
    equipment: parseEquipment(ex.equipment),
    gifUrl: ex.gifUrl ?? undefined,
    imageUrl: ex.imageUrl ?? undefined,
    videoUrl: ex.videoUrl ?? ex.tutorialUrl ?? undefined,
    youtubeUrl: ex.youtubeUrl ?? undefined,
    instructions: parseInstructions(ex.instructions),
    tips: ex.tips,
    difficulty: ex.difficulty ?? "Intermediate",
    sets,
    repsRange: ex.reps ?? "10-12",
    restSeconds: 60,
    estimatedCaloriesPerSet: caloriesPerSet,
  };
}

export function mapApiPlanToWeekDays(plan: ApiCurrentPlan): WorkoutDayPlan[] {
  const byDay = new Map<string, PlanExercise[]>();

  for (const ex of plan.exercises ?? []) {
    const dayName = ex.dayName || "Monday";
    const mapped = mapApiExercise(ex);
    const list = byDay.get(dayName) ?? [];
    list.push(mapped);
    byDay.set(dayName, list);
  }

  return WEEKDAYS.map((dayName) => {
    const exercises = byDay.get(dayName) ?? [];
    const isRest = exercises.length === 0;
    const isCardio = isDedicatedCardioDay(exercises);
    const dayCalories = exercises.reduce(
      (sum, e) => sum + (e.estimatedCaloriesPerSet ?? 12) * (e.sets ?? 3),
      0,
    );

    return {
      dayName,
      focus: isRest ? "Rest" : inferFocus(exercises),
      isRest,
      isCardio,
      estimatedCalories: isRest ? 0 : dayCalories || plan.estimatedCalories || 300,
      estimatedDuration: isRest ? "—" : plan.estimatedDuration ?? "45-55 min",
      exercises,
    };
  });
}

export async function fetchWorkoutPlanBundle(token: string): Promise<WorkoutPlanBundle | null> {
  const res = await fetch(`${getApiBaseUrl()}/workouts/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load workout plan");
  if (!data.plan) return null;

  const plan = data.plan as ApiCurrentPlan;
  return {
    id: plan.id,
    title: plan.title,
    goal: plan.goal,
    category: plan.category,
    estimatedCalories: plan.estimatedCalories,
    estimatedDuration: plan.estimatedDuration,
    days: mapApiPlanToWeekDays(plan),
  };
}

export async function fetchPersonalRecords(token: string): Promise<{
  byExerciseName: Record<string, number>;
  records: PersonalRecordEntry[];
}> {
  const res = await fetch(`${getApiBaseUrl()}/workouts/personal-records`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load personal records");

  const records = (data.records ?? []) as Array<{
    exerciseId: string;
    exerciseName: string;
    maxWeight: string | number | null;
    maxReps: number | null;
    bodyPart: string | null;
  }>;

  const entries: PersonalRecordEntry[] = records.map((r) => ({
    exerciseId: r.exerciseId,
    exerciseName: r.exerciseName,
    maxWeight: parseFloat(String(r.maxWeight ?? 0)) || 0,
    maxReps: r.maxReps,
    bodyPart: r.bodyPart,
  }));

  const byExerciseName: Record<string, number> = {};
  for (const entry of entries) {
    byExerciseName[entry.exerciseName] = entry.maxWeight;
  }

  return { byExerciseName, records: entries };
}

export type WorkoutCategoryKey = "hiit" | "strength" | "focus" | "agility" | "mobility";

function safeLower(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

export function normalizeWorkoutDay(day: Partial<WorkoutDayPlan>, index = 0): WorkoutDayPlan {
  const dayName = day.dayName?.trim() || WEEKDAYS[index] || "Monday";
  const exercises = Array.isArray(day.exercises) ? day.exercises : [];
  const isRest = day.isRest != null ? Boolean(day.isRest) : exercises.length === 0;
  const isCardio = Boolean(day.isCardio) || exercises.some((e) => safeLower(e.bodyPart) === "cardio");
  const focus =
    day.focus?.trim() ||
    (isRest ? "Rest" : isCardio ? "Cardio" : inferFocus(exercises as PlanExercise[]));

  return {
    dayName,
    focus,
    isRest,
    isCardio,
    estimatedCalories: day.estimatedCalories ?? (isRest ? 0 : 300),
    estimatedDuration: day.estimatedDuration ?? (isRest ? "—" : "45-55 min"),
    exercises: exercises as PlanExercise[],
    sections: day.sections,
  };
}

export function dayMatchesCategory(day: WorkoutDayPlan, category: WorkoutCategoryKey): boolean {
  if (day.isRest) return false;
  const focus = safeLower(day.focus);
  switch (category) {
    case "hiit":
      return day.isCardio || focus.includes("cardio") || focus.includes("hiit");
    case "mobility":
      return focus.includes("mobility") || focus.includes("stretch") || focus.includes("yoga");
    case "agility":
      return day.isCardio || focus.includes("agility") || focus.includes("conditioning");
    case "focus":
      return focus.includes("upper") || focus.includes("push") || focus.includes("pull");
    case "strength":
    default:
      return !day.isCardio && !focus.includes("mobility") && !focus.includes("stretch");
  }
}

export function getTodayWorkoutDay(days: WorkoutDayPlan[]): WorkoutDayPlan | null {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return days.find((d) => d.dayName === today) ?? null;
}

export function getPlanActiveDays(days: WorkoutDayPlan[]): WorkoutDayPlan[] {
  return days.filter((d) => !d.isRest && (d.exercises?.length ?? 0) > 0);
}

export function filterWorkoutDays(
  days: WorkoutDayPlan[],
  searchText: string,
  category: WorkoutCategoryKey,
): WorkoutDayPlan[] {
  const query = searchText.trim().toLowerCase();
  const normalized = days.map((day, index) => normalizeWorkoutDay(day, index));
  const active = normalized.filter((d) => !d.isRest);

  const categoryFiltered =
    category === "strength"
      ? active.filter((d) => dayMatchesCategory(d, category) || !dayMatchesCategory(d, "hiit"))
      : active.filter((d) => dayMatchesCategory(d, category));

  if (!query) return categoryFiltered.length > 0 ? categoryFiltered : active;

  return categoryFiltered.filter((day) => {
    if (safeLower(day.dayName).includes(query)) return true;
    if (safeLower(day.focus).includes(query)) return true;
    return day.exercises.some(
      (ex) =>
        safeLower(ex.name).includes(query) ||
        safeLower(ex.bodyPart).includes(query) ||
        safeLower(ex.target).includes(query),
    );
  });
}

export type WorkoutPlanSource = "trainer" | "ai" | "none";

export interface WorkoutPlanContext {
  planSource: WorkoutPlanSource;
  hasTrainerAssigned: boolean;
  canGenerateWithAi: boolean;
  hasInBodyReport: boolean;
  latestInBodyReportId: string | null;
  fitnessGoal: string | null;
  workoutOnboardingCompleted: boolean;
  trainerName: string | null;
  catalogExerciseCount?: number;
}

export interface ProgressionSuggestion {
  type: string;
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
  exerciseName?: string;
  suggestedDelta?: string;
}

export async function fetchWorkoutPlanContext(token: string): Promise<WorkoutPlanContext> {
  const res = await fetch(`${getApiBaseUrl()}/workouts/plan-context`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load plan context");
  return {
    planSource: data.planSource ?? "none",
    hasTrainerAssigned: Boolean(data.hasTrainerAssigned),
    canGenerateWithAi: data.canGenerateWithAi !== false,
    hasInBodyReport: Boolean(data.hasInBodyReport),
    latestInBodyReportId: data.latestInBodyReportId ?? null,
    fitnessGoal: data.fitnessGoal ?? null,
    workoutOnboardingCompleted: Boolean(data.workoutOnboardingCompleted),
    trainerName: data.trainerName ?? null,
    catalogExerciseCount: data.catalogExerciseCount,
  };
}

export async function fetchProgressionSuggestions(token: string): Promise<ProgressionSuggestion[]> {
  const res = await fetch(`${getApiBaseUrl()}/workouts/progression-suggestions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load progression suggestions");
  return (data.suggestions ?? []) as ProgressionSuggestion[];
}

export async function searchExerciseCatalog(
  token: string,
  params: { q?: string; bodyPart?: string; equipment?: string; limit?: number; markPlan?: boolean },
): Promise<CatalogExerciseHit[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.bodyPart) qs.set("bodyPart", params.bodyPart);
  if (params.equipment) qs.set("equipment", params.equipment);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.markPlan) qs.set("markPlan", "true");
  const res = await fetch(`${getApiBaseUrl()}/exercises/search?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Exercise search failed");
  return (data.exercises ?? []) as CatalogExerciseHit[];
}

export interface CatalogExerciseHit {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  instructions: string[];
  inCurrentPlan?: boolean;
  youtubeUrl?: string;
  googleUrl?: string;
}

export async function fetchExercisesByCategory(
  token: string,
  category: WorkoutCategoryKey,
  limit = 12,
): Promise<CatalogExerciseHit[]> {
  const res = await fetch(
    `${getApiBaseUrl()}/exercises/by-category?category=${encodeURIComponent(category)}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load category exercises");
  return (data.exercises ?? []) as CatalogExerciseHit[];
}
