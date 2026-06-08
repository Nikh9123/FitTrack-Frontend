/** Central navigation map for dashboard → metric detail screens */
export const METRIC_ROUTES = {
  steps: "/metrics/steps",
  calories: "/metrics/calories",
  water: "/metrics/water",
  weight: "/metrics/weight",
  sleep: "/metrics/sleep",
  score: "/metrics/score",
  streak: "/metrics/streak",
  activity: "/metrics/activity",
  workout: "/(tabs)/workout",
  nutrition: (macro?: "protein" | "carbs" | "fat") =>
    macro ? `/metrics/nutrition?macro=${macro}` : "/metrics/nutrition",
} as const;
