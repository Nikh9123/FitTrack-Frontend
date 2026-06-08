export { estimateCalorieBreakdown, estimateWaterGoalMl, stepsCaloriesBurned } from "./calories";
export {
  buildCaloriesExplanation,
  buildScoreExplanation,
  buildSleepExplanation,
  buildStepsExplanation,
  buildWaterExplanation,
  buildWeightExplanation,
} from "./explanations";
export { buildCalorieInsights, buildCoachTips, buildSleepInsights, buildStepsInsights, buildWaterInsights } from "./insights";
export { METRIC_ROUTES } from "./routes";
export { computeDailyScore, computeDetailedDailyScore, scoreImprovementHints } from "./score";
export type { CalorieBreakdown } from "./calories";
export type { CoachTip, MetricExplanation, MetricPeriod } from "./types";
