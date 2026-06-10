import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/lib/api";
import { migrateAuthStorage } from "@/lib/storage-migrate";
import {
  API_TOKEN_KEY,
  API_USER_KEY,
  completeGoogleOAuth,
  fetchGoogleOAuthUrl,
  getGoogleOAuthRedirectUrl,
  parseOAuthTokensFromUrl,
} from "@/lib/google-oauth";

// Required for OAuth on iOS/Android
WebBrowser.maybeCompleteAuthSession();

export type UserRole = "member" | "trainer" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  phone: string;
  role: UserRole;
  avatar?: string | null;
  onboardingCompleted: boolean;
  fitnessGoal?: string | null;
  heightCm?: string | null;
  weightKg?: string | null;
  bmi?: string | null;
  region?: string | null;
  membershipTier?: "free" | "pending" | "premium";
  memberSince: string;
  gymName?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, role?: UserRole) => Promise<void>;
  loginWithPhone: (phone: string, otp: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  /** Persist profile fields to the server and refresh local user state. */
  updateProfile: (payload: {
    firstName?: string;
    lastName?: string | null;
    region?: string | null;
  }) => Promise<void>;
  /** Fetch the latest profile from the server and update local state. */
  refreshProfile: () => Promise<void>;
  /** Reload auth state from device storage (e.g. after web OAuth callback). */
  reloadSession: () => Promise<void>;
  /** Local-only role swap for demo / dev purposes. */
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Fetch helper ─────────────────────────────────────────────────────────────
async function requestJson<T>(path: string, init: RequestInit = {}, token?: string | null) {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      await migrateAuthStorage();
      const [storedToken, storedUser] = await AsyncStorage.multiGet([API_TOKEN_KEY, API_USER_KEY]);
      const savedToken = storedToken?.[1];
      const userValue = storedUser?.[1];

      if (savedToken && userValue) {
        setToken(savedToken);
        setUser(JSON.parse(userValue));
      } else {
        await AsyncStorage.multiRemove([API_TOKEN_KEY, API_USER_KEY]);
        setUser(null);
        setToken(null);
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const persistAuth = async (userData: User, authToken: string) => {
    await AsyncStorage.multiSet([
      [API_USER_KEY, JSON.stringify(userData)],
      [API_TOKEN_KEY, authToken],
    ]);
    setToken(authToken);
    setUser(userData);
  };

  // ─── Register ───────────────────────────────────────────────────────────────
  const register = async (email: string, username: string, password: string, role: UserRole = "member") => {
    const response = await requestJson<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password, role }),
    });
    await persistAuth(response.user, response.token);
  };

  // ─── Email Login ─────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const response = await requestJson<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await persistAuth(response.user, response.token);
  };

  // ─── Phone Login ─────────────────────────────────────────────────────────────
  const loginWithPhone = async (phone: string, otp: string) => {
    const response = await requestJson<{ token: string; user: User }>("/auth/login-phone", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    });
    await persistAuth(response.user, response.token);
  };

  // ─── Google OAuth ─────────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    const redirectUrl = getGoogleOAuthRedirectUrl();

    if (Platform.OS === "android") {
      await WebBrowser.warmUpAsync();
    }

    let url: string;
    try {
      url = await fetchGoogleOAuthUrl(redirectUrl);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not reach the auth server";
      throw new Error(
        `${message}. On a phone, ensure the backend is running and reachable at ${getApiBaseUrl()}.`,
      );
    }

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = url;
      return;
    }

    try {
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl, {
        showInRecents: true,
      });

      if (result.type !== "success") {
        throw new Error("Google sign-in was cancelled");
      }

      const { accessToken, refreshToken } = parseOAuthTokensFromUrl(result.url);

      if (!accessToken) {
        throw new Error(
          "No access token received. Add this redirect URL in Supabase: " + redirectUrl,
        );
      }

      const response = await completeGoogleOAuth(accessToken, refreshToken);
      await persistAuth(response.user, response.token);
    } finally {
      if (Platform.OS === "android") {
        await WebBrowser.coolDownAsync();
      }
    }
  };

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      if (token) {
        await requestJson("/auth/logout", { method: "POST" }, token);
      }
    } catch {
      // Best effort — always clear local state
    }
    await AsyncStorage.multiRemove([API_TOKEN_KEY, API_USER_KEY]);
    setUser(null);
    setToken(null);
  };

  const reloadSession = async () => {
    await loadUser();
  };

  // ─── Refresh profile from server ─────────────────────────────────────────────
  const refreshProfile = async () => {
    if (!token) return;
    const response = await requestJson<{ user: User }>("/auth/profile", {}, token);
    await AsyncStorage.setItem(API_USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
  };

  // ─── Switch role locally (demo only) ─────────────────────────────────────────
  const switchRole = (role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role };
    AsyncStorage.setItem(API_USER_KEY, JSON.stringify(updated)).catch(() => {});
    setUser(updated);
  };

  // ─── Update user locally ──────────────────────────────────────────────────────
  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(API_USER_KEY, JSON.stringify(updated));
    setUser(updated);
  };

  const updateProfile = async (payload: {
    firstName?: string;
    lastName?: string | null;
    region?: string | null;
  }) => {
    if (!token) throw new Error("Not authenticated");
    const response = await requestJson<{ user: User }>(
      "/auth/me",
      { method: "PATCH", body: JSON.stringify(payload) },
      token,
    );
    await AsyncStorage.setItem(API_USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithPhone,
        loginWithGoogle,
        logout,
        updateUser,
        updateProfile,
        refreshProfile,
        reloadSession,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}