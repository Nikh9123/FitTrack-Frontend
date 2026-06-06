import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { completeGoogleOAuth, parseOAuthTokensFromUrl } from "@/lib/google-oauth";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";

async function resolveCallbackUrl(routeUrl: string | null): Promise<string> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.href;
  }

  if (routeUrl && routeUrl.includes("access_token")) {
    return routeUrl;
  }

  const initial = await Linking.getInitialURL();
  if (initial) return initial;

  return routeUrl ?? "";
}

/** Handles Google OAuth redirects on web and Expo Go / dev-build deep links. */
export default function AuthCallbackScreen() {
  const colors = useColors();
  const { reloadSession } = useAuth();
  const routeUrl = Linking.useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      try {
        const callbackUrl = await resolveCallbackUrl(routeUrl);
        const { accessToken, refreshToken } = parseOAuthTokensFromUrl(callbackUrl);

        if (!accessToken) {
          throw new Error("No access token received from Google. Check Supabase redirect URLs match this app.");
        }

        await completeGoogleOAuth(accessToken, refreshToken);
        if (!cancelled) {
          await reloadSession();
          router.replace("/");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Google sign-in failed");
        }
      }
    }

    finishSignIn();
    return () => {
      cancelled = true;
    };
  }, [reloadSession, routeUrl]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
        padding: 24,
      }}
    >
      {error ? (
        <>
          <Text style={{ color: colors.error, fontSize: 16, textAlign: "center", marginBottom: 16 }}>
            {error}
          </Text>
          <Text
            onPress={() => router.replace("/(auth)/login")}
            style={{ color: colors.primary, fontSize: 16 }}
          >
            Back to sign in
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.mutedForeground, marginTop: 16 }}>Completing sign-in…</Text>
        </>
      )}
    </View>
  );
}
