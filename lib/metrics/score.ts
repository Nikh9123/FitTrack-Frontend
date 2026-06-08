export interface ScoreInput {
  steps: number;
  stepGoal: number;
  calories: number;
  calorieGoal: number;
  water: number;
  waterGoal: number;
  caloriesBurned: number;
  sleepHours: number;
  sleepGoal?: number;
}

export interface ScoreComponent {
  key: string;
  label: string;
  weightLabel: string;
  maxPoints: number;
  earnedPoints: number;
  current: number;
  goal: number;
  pct: number;
}

export interface DetailedDailyScore {
  total: number;
  components: ScoreComponent[];
}

const BURN_CAP = 400;

export function computeDetailedDailyScore(input: ScoreInput): DetailedDailyScore {
  const sleepGoal = input.sleepGoal ?? 8;
  const stepPct = Math.min(input.steps / input.stepGoal, 1);
  const calPct = Math.min(input.calories / input.calorieGoal, 1);
  const waterPct = Math.min(input.water / input.waterGoal, 1);
  const burnPct = Math.min(input.caloriesBurned / BURN_CAP, 1);
  const sleepPct = input.sleepHours > 0 ? Math.min(input.sleepHours / sleepGoal, 1) : 0;

  const components: ScoreComponent[] = [
    {
      key: "steps",
      label: "Steps",
      weightLabel: "25%",
      maxPoints: 25,
      earnedPoints: Math.round(stepPct * 25),
      current: input.steps,
      goal: input.stepGoal,
      pct: stepPct,
    },
    {
      key: "calories",
      label: "Nutrition",
      weightLabel: "20%",
      maxPoints: 20,
      earnedPoints: Math.round(calPct * 20),
      current: input.calories,
      goal: input.calorieGoal,
      pct: calPct,
    },
    {
      key: "water",
      label: "Water",
      weightLabel: "20%",
      maxPoints: 20,
      earnedPoints: Math.round(waterPct * 20),
      current: input.water,
      goal: input.waterGoal,
      pct: waterPct,
    },
    {
      key: "activity",
      label: "Activity burn",
      weightLabel: "15%",
      maxPoints: 15,
      earnedPoints: Math.round(burnPct * 15),
      current: input.caloriesBurned,
      goal: BURN_CAP,
      pct: burnPct,
    },
    {
      key: "sleep",
      label: "Sleep",
      weightLabel: "20%",
      maxPoints: 20,
      earnedPoints: Math.round(sleepPct * 20),
      current: input.sleepHours,
      goal: sleepGoal,
      pct: sleepPct,
    },
  ];

  const total = components.reduce((s, c) => s + c.earnedPoints, 0);
  return { total, components };
}

export function computeDailyScore(input: ScoreInput): number {
  return computeDetailedDailyScore(input).total;
}

/** Points user could gain by completing a weak area today */
export function scoreImprovementHints(input: ScoreInput): string[] {
  const { components } = computeDetailedDailyScore(input);
  const hints: string[] = [];
  for (const c of components) {
    const remaining = c.maxPoints - c.earnedPoints;
    if (remaining <= 0) continue;
    if (c.key === "steps") {
      const need = Math.max(0, input.stepGoal - input.steps);
      if (need > 0) hints.push(`Walking ${need.toLocaleString()} more steps could add up to ${remaining} points.`);
    } else if (c.key === "water") {
      const need = Math.max(0, input.waterGoal - input.water);
      if (need > 0) hints.push(`Drinking ${need} more glass${need === 1 ? "" : "es"} of water could add up to ${remaining} points.`);
    } else if (c.key === "sleep" && input.sleepHours === 0) {
      hints.push(`Logging tonight's sleep could add up to ${remaining} points.`);
    } else if (c.key === "calories") {
      hints.push(`Hitting your calorie target could add up to ${remaining} nutrition points.`);
    } else if (c.key === "activity") {
      hints.push(`A short workout could add up to ${remaining} activity points.`);
    }
  }
  return hints.slice(0, 3);
}
