import type { GeminiAnalysis } from "./types";

export type ColorPalette = {
  yellow: string;
  green: string;
  orange: string;
  red: string;
  cyan: string;
};

const EMPTY_ANALYSIS_SECTION = {
  status: "—",
  description: "No analysis available for this section.",
  recommendation: "",
};

export const parseGeminiAnalysis = (value: unknown): GeminiAnalysis | null => {
  if (!value) return null;
  if (typeof value === "object") return value as GeminiAnalysis;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GeminiAnalysis;
    } catch (err) {
      console.warn("Failed to parse Gemini analysis string", err);
      return null;
    }
  }
  return null;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
}

/** True when stored analysis is missing, stub seed data, or lacks full Groq sections. */
export function needsInbodyAiAnalysis(value: unknown): boolean {
  const raw = parseGeminiAnalysis(value);
  if (!raw) return true;

  const tagged = raw as GeminiAnalysis & { __aiSource?: string };
  if (tagged.__aiSource === "fallback") return true;
  if (raw.overallSummary?.toLowerCase().includes("dummy inbody")) return true;

  const hasCoreSections =
    Boolean(raw.bodyFatAnalysis?.description?.trim()) &&
    Boolean(raw.muscleMassAnalysis?.description?.trim()) &&
    Boolean(raw.metabolismInsights?.description?.trim()) &&
    Boolean(raw.visceralFatAnalysis?.recommendation?.trim());

  return !hasCoreSections;
}

/** Ensures saved/partial InBody AI payloads always have arrays and nested objects. */
export function normalizeGeminiAnalysis(value: unknown): GeminiAnalysis | null {
  const raw = parseGeminiAnalysis(value);
  if (!raw) return null;

  const incomplete = needsInbodyAiAnalysis(raw);
  const workoutPlan =
    raw.workoutPlan && typeof raw.workoutPlan === "object" ? raw.workoutPlan : undefined;

  return {
    ...raw,
    overallSummary: raw.overallSummary ?? "Your InBody scan has been processed.",
    fitnessLevel: raw.fitnessLevel ?? "—",
    bodyFatAnalysis: incomplete
      ? (raw.bodyFatAnalysis ?? { status: "—", description: "", recommendation: "" })
      : { ...EMPTY_ANALYSIS_SECTION, ...raw.bodyFatAnalysis },
    muscleMassAnalysis: incomplete
      ? (raw.muscleMassAnalysis ?? { status: "—", description: "", recommendation: "" })
      : { ...EMPTY_ANALYSIS_SECTION, ...raw.muscleMassAnalysis },
    metabolismInsights: {
      bmr: raw.metabolismInsights?.bmr ?? "—",
      metabolicAge: raw.metabolismInsights?.metabolicAge ?? "—",
      description: raw.metabolismInsights?.description ?? "",
      recommendation: raw.metabolismInsights?.recommendation,
    },
    visceralFatAnalysis: {
      level: raw.visceralFatAnalysis?.level ?? "—",
      risk: raw.visceralFatAnalysis?.risk ?? "—",
      recommendation: raw.visceralFatAnalysis?.recommendation ?? "",
      whrImplication: raw.visceralFatAnalysis?.whrImplication,
    },
    strengths: asStringArray(raw.strengths),
    weaknesses: asStringArray(raw.weaknesses),
    healthRisks: asStringArray(raw.healthRisks),
    recommendations: asStringArray(raw.recommendations),
    goalSuggestions: asStringArray(raw.goalSuggestions),
    workoutPlan: {
      goal: workoutPlan?.goal ?? "",
      planType: workoutPlan?.planType ?? "",
      weeklySchedule: Array.isArray(workoutPlan?.weeklySchedule) ? workoutPlan.weeklySchedule : [],
      cardioRecommendation: workoutPlan?.cardioRecommendation ?? "",
    },
  };
}

export const getRating = (metric: string, value: number, colors: ColorPalette) => {
  if (metric === "bodyFat") {
    if (value < 10) return { label: "Very Low", color: colors.yellow };
    if (value < 15) return { label: "Low", color: colors.yellow };
    if (value < 22) return { label: "Optimal", color: colors.green };
    if (value < 28) return { label: "High", color: colors.orange };
    if (value < 35) return { label: "Very High", color: colors.red };
    return { label: "Severely High", color: colors.red };
  }
  if (metric === "bmi") {
    if (value < 18.5) return { label: "Under", color: colors.yellow };
    if (value < 25) return { label: "Normal", color: colors.green };
    if (value < 30) return { label: "Over", color: colors.orange };
    if (value < 35) return { label: "Obese", color: colors.red };
    return { label: "Severely Obese", color: colors.red };
  }
  if (metric === "visceralFat") {
    if (value <= 9) return { label: "Normal", color: colors.green };
    if (value <= 14) return { label: "High", color: colors.orange };
    return { label: "Very High", color: colors.red };
  }
  if (metric === "waistHipRatio") {
    if (value < 0.9) return { label: "Normal", color: colors.green };
    if (value < 1.0) return { label: "Moderate", color: colors.orange };
    return { label: "High Risk", color: colors.red };
  }
  if (metric === "obesityDegree") {
    if (value < 90) return { label: "Under", color: colors.yellow };
    if (value <= 110) return { label: "Normal", color: colors.green };
    if (value <= 130) return { label: "Overweight", color: colors.orange };
    return { label: "Obese", color: colors.red };
  }
  return { label: "Normal", color: colors.cyan };
};

export function safeNum(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export function formatControl(v: string | undefined): string {
  if (!v) return "--";
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  if (n === 0) return "0.0 kg";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)} kg`;
}
