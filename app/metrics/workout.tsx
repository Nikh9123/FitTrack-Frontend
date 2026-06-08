import { Redirect } from "expo-router";

/** Legacy route — workout detail lives on the Workout tab */
export default function WorkoutMetricRedirect() {
  return <Redirect href="/(tabs)/workout" />;
}
