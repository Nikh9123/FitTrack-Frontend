import Constants from "expo-constants";

/** Production web app origin (also used for OAuth redirect allow-list). */
export const PRODUCTION_APP_ORIGIN = "https://veera.ashirvad.work";

/** Production API base URL (no trailing slash). */
export const PRODUCTION_API_ORIGIN = "https://veera.ashirvad.work/api";

/**
 * App origin used for OAuth callbacks and deep links on web.
 * Prefers the current browser origin, then env, then production default.
 */
export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  const fromEnv = process.env.EXPO_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const fromExtra = Constants.expoConfig?.extra?.appUrl;
  if (typeof fromExtra === "string" && fromExtra.trim()) {
    return fromExtra.replace(/\/$/, "");
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) {
    const host = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  if (process.env.NODE_ENV !== "development") {
    return PRODUCTION_APP_ORIGIN;
  }

  return PRODUCTION_APP_ORIGIN;
}

export function getOAuthCallbackPath(): string {
  return "/auth/callback";
}

export function getGoogleOAuthRedirectUrlForWeb(): string {
  return `${getAppOrigin()}${getOAuthCallbackPath()}`;
}
