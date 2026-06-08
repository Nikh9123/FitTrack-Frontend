import { Stack } from "expo-router";

export default function MetricsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 320,
      }}
    />
  );
}
