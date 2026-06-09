import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AchievementUnlockProvider } from "@/context/AchievementUnlockContext";
import { AuthProvider } from "@/context/AuthContext";
import { FitnessProvider } from "@/context/FitnessContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { initRemindersOnLaunch } from "@/lib/reminders";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

function ReminderBootstrap() {
  useEffect(() => {
    void initRemindersOnLaunch();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === "string") {
        router.push(route as any);
      }
    });

    return () => sub.remove();
  }, []);

  return null;
}

const queryClient = new QueryClient();

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 320,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="auth/callback" options={{ animation: "fade" }} />
      <Stack.Screen name="(auth)" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="(tabs)" options={{ animation: "fade_from_bottom", animationDuration: 280 }} />
      <Stack.Screen
        name="analytics"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="inbody/index"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="workout/weekly-plan"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="diet/my-plan"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="coach/journey"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="coach/weekly-review"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="coach/monthly-report"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
      <Stack.Screen
        name="metrics"
        options={{ animation: "slide_from_right", headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AchievementUnlockProvider>
                <FitnessProvider>
                  <ReminderBootstrap />
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <KeyboardProvider>
                      <RootLayoutNav />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </FitnessProvider>
              </AchievementUnlockProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
