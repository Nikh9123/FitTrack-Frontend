import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/lib/api";
import type { User } from "@/context/AuthContext";
import { STORAGE_KEYS } from "@/constants/branding";

const API_TOKEN_KEY = STORAGE_KEYS.token;
const API_USER_KEY = STORAGE_KEYS.user;

export { getGoogleOAuthRedirectUrl } from "@/lib/oauth-redirect";

async function requestJson<T>(path: string, init: RequestInit = {}) {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null
        ? (body as { error?: string; message?: string }).error ||
          (body as { error?: string; message?: string }).message
        : typeof body === "string"
          ? body
          : response.statusText;
    throw new Error(message || "Request failed");
  }

  return body as T;
}

export async function fetchGoogleOAuthUrl(redirectTo: string): Promise<string> {
  const { url } = await requestJson<{ url: string }>("/auth/google/url", {
    method: "POST",
    body: JSON.stringify({ redirectTo }),
  });
  return url;
}

export async function completeGoogleOAuth(accessToken: string, refreshToken: string | null) {
  const response = await requestJson<{ token: string; user: User }>("/auth/google/callback", {
    method: "POST",
    body: JSON.stringify({ accessToken, refreshToken }),
  });

  await AsyncStorage.multiSet([
    [API_USER_KEY, JSON.stringify(response.user)],
    [API_TOKEN_KEY, response.token],
  ]);

  return response;
}

export function parseOAuthTokensFromUrl(callbackUrl: string) {
  const fragment = callbackUrl.split("#")[1] ?? "";
  const query = callbackUrl.split("?")[1]?.split("#")[0] ?? "";
  const params = new URLSearchParams(fragment || query);
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
  };
}

export { API_TOKEN_KEY, API_USER_KEY };
