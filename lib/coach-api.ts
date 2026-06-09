import { getApiBaseUrl } from "@/lib/api";

export interface GoalEvaluation {
  type: string;
  target: number | null;
  current: number | null;
  unit: string;
  completionPct: number;
  estimatedWeeks: number | null;
  confidence: "high" | "medium" | "low";
  message: string;
}

export interface NextWeekGoals {
  steps: number;
  calories: number;
  proteinG: number;
  workouts: number;
  sleepHours: number;
  waterGlasses: number;
  notes: string[];
}

export interface WeightForecastDetail {
  days: number;
  weightKg: number | null;
  lowKg: number | null;
  highKg: number | null;
  changeKg: number | null;
}

export interface StrengthForecastItem {
  exercise: string;
  current: string;
  predicted: string;
  weeks: number;
  trend: "up" | "stable" | "down";
}

export interface TransformationTimelineNode {
  horizon: "now" | "week4" | "week8" | "week12" | "week24";
  label: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  activityScore: number;
  journeyStage: string;
}

export type TimelineAlignment = "on_track" | "at_risk" | "off_track" | "need_data";

export interface TimelineInsightCard {
  id: string;
  icon: string;
  title: string;
  body: string;
  highlight?: string;
}

export interface TimelineInsightLiveMetrics {
  currentWeightKg: number | null;
  bmrDaily: number;
  estimatedTdee: number;
  avgCaloriesConsumed: number;
  avgActivityBurn: number;
  avgWorkoutBurn: number;
  avgTotalExpenditure: number;
  avgNetEnergyBalance: number;
  avgCaloriesBurned: number;
  avgDailyDeficit: number;
  avgSteps: number;
  workoutsLast14Days: number;
  loggingConfidence: "high" | "medium" | "low";
  projectedWeightChange12wKg: number | null;
  projectedBodyFatChange12wPct: number | null;
}

export interface TimelineInsight {
  goalKey: string;
  goalLabel: string;
  alignment: TimelineAlignment;
  alignmentLabel: string;
  headline: string;
  summary: string;
  cards: TimelineInsightCard[];
  liveMetrics: TimelineInsightLiveMetrics;
  actionItems: string[];
}

export interface CoachForecasts {
  weight30: number | null;
  weight60: number | null;
  weight90: number | null;
  weightDetails: WeightForecastDetail[];
  strength: StrengthForecastItem[];
  confidence: "high" | "medium" | "low";
  avgDailyDeficit: number;
  disclaimer: string | null;
  transformationTimeline: TransformationTimelineNode[];
  timelineInsight: TimelineInsight | null;
}

export interface DailyActivityDay {
  date: string;
  dayLabel: string;
  steps: number;
  caloriesBurned: number;
  caloriesConsumed: number;
  waterGlasses: number;
  sleepHours: number;
  weightKg: number | null;
  workoutCompleted: boolean;
  activitiesLogged: string[];
}

export interface DataSourceConsidered {
  id: string;
  label: string;
  metrics: string[];
  description: string;
}

export interface WeeklyReview {
  weekKey: string;
  weekLabel: string;
  overallScore: number;
  summary: {
    weight: { current: number | null; change: number };
    steps: number;
    caloriesBurned: number;
    caloriesConsumed: number;
    workouts: string;
    waterGoalDays: string;
    sleepGoalDays: string;
    consistency: number;
    proteinAvgG: number;
  };
  aiSummary: string;
  progressAnalysis: {
    weight: string;
    activity: string;
    nutrition: string;
    recovery: string;
  };
  goalEvaluation: GoalEvaluation;
  nextWeekGoals: NextWeekGoals;
  drivers: { helped: string[]; holdingBack: string[] };
  coachInsights: string[];
  forecasts: CoachForecasts;
  achievementsUnlocked: Array<{
    id: string;
    name: string;
    points: number;
    rarity: string;
    earnedAt: string;
  }>;
  generatedAt: string;
  cached: boolean;
  narrativeSource: "groq" | "fallback";
  nextWeekFocus: string;
  dailyBreakdown: DailyActivityDay[];
  dataSourcesConsidered: DataSourceConsidered[];
  activeDaysCount: number;
  transformationTimeline: TransformationTimelineNode[];
  saved?: boolean;
  reportId?: string | null;
  savedAt?: string | null;
}

export interface MonthlyReport {
  monthKey: string;
  monthLabel: string;
  overallScore: number;
  aiSummary: string;
  summary: {
    totalWorkouts: number;
    totalSteps: number;
    totalVolumeKg: number | null;
    weightChange: number;
    bestWeekScore: number | null;
    currentWeightKg: number | null;
  };
  progressAnalysis: {
    weight: string;
    activity: string;
    nutrition: string;
    recovery: string;
  };
  coachInsights: string[];
  goalEvaluation: GoalEvaluation;
  nextMonthGoals: NextWeekGoals;
  achievementsUnlocked: Array<{
    id: string;
    name: string;
    points: number;
    rarity: string;
    earnedAt: string;
  }>;
  forecasts: CoachForecasts;
  transformationTimeline: TransformationTimelineNode[];
  personalRecords: Array<{ exercise: string; current: string; predicted: string; weeks: number }>;
  generatedAt: string;
  cached: boolean;
  narrativeSource: "groq" | "fallback";
  nextMonthFocus: string;
  saved?: boolean;
  reportId?: string | null;
  savedAt?: string | null;
}

export interface SavedCoachReportSummary {
  reportId: string;
  type: "coach_weekly_review" | "coach_monthly_review";
  periodKey: string;
  periodLabel: string;
  overallScore: number;
  savedAt: string;
}

export type DailyDigestCategory = "nutrition" | "activity" | "recovery" | "consistency" | "general";

export interface DailyDigest {
  dateKey: string;
  dateLabel: string;
  tip: string;
  focusAction: string;
  category: DailyDigestCategory;
  yesterday: {
    dateLabel: string;
    steps: number;
    caloriesConsumed: number;
    caloriesBurned: number;
    workoutCompleted: boolean;
    sleepHours: number;
    waterGlasses: number;
  };
  streakDays: number;
  fitnessGoal: string | null;
  generatedAt: string;
  cached: boolean;
  narrativeSource: "groq" | "fallback";
  saved?: boolean;
  reportId?: string | null;
  savedAt?: string | null;
}

async function authFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchWeeklyReview(token: string, week?: string): Promise<WeeklyReview> {
  const qs = week ? `?week=${encodeURIComponent(week)}` : "";
  return authFetch(`/coach/weekly-review${qs}`, token) as Promise<WeeklyReview>;
}

export async function regenerateWeeklyReview(token: string, week?: string): Promise<WeeklyReview> {
  return authFetch("/coach/weekly-review/generate", token, {
    method: "POST",
    body: JSON.stringify(week ? { week } : {}),
  }) as Promise<WeeklyReview>;
}

export async function fetchMonthlyReport(token: string, month?: string): Promise<MonthlyReport> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : "";
  return authFetch(`/coach/monthly-report${qs}`, token) as Promise<MonthlyReport>;
}

export async function regenerateMonthlyReport(token: string, month?: string): Promise<MonthlyReport> {
  return authFetch("/coach/monthly-report/generate", token, {
    method: "POST",
    body: JSON.stringify(month ? { month } : {}),
  }) as Promise<MonthlyReport>;
}

export async function fetchSavedCoachReports(token: string, limit = 12): Promise<SavedCoachReportSummary[]> {
  const data = (await authFetch(`/coach/reports?limit=${limit}`, token)) as { reports: SavedCoachReportSummary[] };
  return data.reports;
}

export async function fetchDailyDigest(token: string, options?: { date?: string; refresh?: boolean }): Promise<DailyDigest> {
  const params = new URLSearchParams();
  if (options?.date) params.set("date", options.date);
  if (options?.refresh) params.set("refresh", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  return authFetch(`/coach/daily-digest${qs}`, token) as Promise<DailyDigest>;
}

export function isWeeklyReviewNew(review: WeeklyReview): boolean {
  const day = new Date().getDay();
  const isWeekendWindow = day === 0 || day === 1;
  return isWeekendWindow && !review.cached;
}

export function emptyForecasts(): CoachForecasts {
  return {
    weight30: null,
    weight60: null,
    weight90: null,
    weightDetails: [],
    strength: [],
    confidence: "low",
    avgDailyDeficit: 0,
    disclaimer: null,
    transformationTimeline: [],
    timelineInsight: null,
  };
}
