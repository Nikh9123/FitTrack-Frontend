/** Average step length in meters (≈762 mm). */
export const STEP_LENGTH_METERS = 0.762;

/** Approximate kcal burned per step. */
export const CALORIES_PER_STEP = 0.04;

/** Steps per minute assumed for moderate walking. */
export const WALKING_STEPS_PER_MINUTE = 110;

/** Steps per minute threshold above which we classify as running. */
export const RUNNING_CADENCE_THRESHOLD = 140;

export interface DerivedActivityMetrics {
  steps: number;
  walkingMinutes: number;
  runningMinutes: number;
  caloriesBurned: number;
  distanceMeters: number;
  distanceKm: number;
  activeMinutes: number;
}

export function deriveActivityMetrics(steps: number): DerivedActivityMetrics {
  const safeSteps = Math.max(0, Math.floor(steps));
  const activeMinutes = Math.min(1440, Math.floor(safeSteps / WALKING_STEPS_PER_MINUTE));
  const walkingMinutes = activeMinutes;
  const runningMinutes = 0;
  const caloriesBurned = Math.round(safeSteps * CALORIES_PER_STEP);
  const distanceMeters = Math.round(safeSteps * STEP_LENGTH_METERS);
  const distanceKm = Number((distanceMeters / 1000).toFixed(2));

  return {
    steps: safeSteps,
    walkingMinutes,
    runningMinutes,
    caloriesBurned,
    distanceMeters,
    distanceKm,
    activeMinutes,
  };
}

export function mergeCadenceIntoMetrics(
  steps: number,
  recentCadenceStepsPerMinute: number,
): DerivedActivityMetrics {
  const base = deriveActivityMetrics(steps);
  if (recentCadenceStepsPerMinute >= RUNNING_CADENCE_THRESHOLD) {
    const runningMinutes = Math.min(base.activeMinutes, Math.ceil(steps / recentCadenceStepsPerMinute));
    const walkingMinutes = Math.max(0, base.activeMinutes - runningMinutes);
    return { ...base, walkingMinutes, runningMinutes };
  }
  return base;
}
