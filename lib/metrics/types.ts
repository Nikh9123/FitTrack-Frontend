export type MetricPeriod = "today" | "week" | "month" | "year";

export type MetricKind =
  | "steps"
  | "calories"
  | "water"
  | "weight"
  | "sleep"
  | "score"
  | "streak"
  | "activity"
  | "nutrition"
  | "workout";

export interface WhyBlock {
  title: string;
  body: string;
}

export interface CalcRow {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface MetricExplanation {
  headline: string;
  whatItMeans: string;
  whyItMatters: string;
  howCalculated: string;
  influences: string[];
  improveTips: string[];
  tooLow?: string;
  tooHigh?: string;
  calculationRows?: CalcRow[];
  personalizedNote?: string;
}

export interface CoachTip {
  message: string;
  icon?: string;
}
