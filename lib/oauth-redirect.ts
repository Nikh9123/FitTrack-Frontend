import { makeRedirectUri } from "expo-auth-session";
import { createURL } from "expo-linking";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getGoogleOAuthRedirectUrlForWeb } from "@/lib/app-url";

/**
 * OAuth redirect URI must match Supabase → Authentication → URL Configuration.
 *
 * - Expo Go: exp://YOUR_LAN_IP:8081/--/auth/callback (add exp://YOUR_LAN_IP:8081/** in Supabase)
 * - Dev/production build: veera://auth/callback
 * - Web: https://veera.ashirvad.work/auth/callback or http://localhost:8081/auth/callback
 */
export function getGoogleOAuthRedirectUrl(): string {
  if (Platform.OS === "web") {
    return getGoogleOAuthRedirectUrlForWeb();
  }

  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo) {
    return makeRedirectUri({
      path: "auth/callback",
    });
  }

  return createURL("auth/callback");
}

export function getGoogleOAuthRedirectHint(): string {
  if (Platform.OS === "web") {
    return getGoogleOAuthRedirectUrlForWeb();
  }
  return getGoogleOAuthRedirectUrl();
}
