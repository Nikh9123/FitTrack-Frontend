import { getApiBaseUrl } from "@/lib/api";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export interface AchievementProgressItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  points: number;
  criteria: {
    metric: string;
    threshold: number;
    category?: string;
    rarity?: AchievementRarity;
    titleUnlock?: string;
  };
  rarity: AchievementRarity;
  category: string;
  titleUnlock: string | null;
  earned: boolean;
  earnedAt: string | null;
  currentValue: number;
  threshold: number;
  progressPercent: number;
}

export interface UnlockedAchievement {
  id: string;
  achievementId: string;
  name: string;
  description: string | null;
  points: number;
  rarity: string;
  category: string;
  titleUnlock: string | null;
  earnedAt: string;
}

export interface AchievementsResponse {
  achievements: AchievementProgressItem[];
  totalPoints: number;
  earnedCount: number;
}

export interface JourneyStage {
  id: string;
  name: string;
  minPoints: number;
  description: string;
  unlocked: boolean;
  current: boolean;
}

export interface JourneyResponse {
  journey: {
    stages: JourneyStage[];
    currentStage: JourneyStage;
    nextStage: JourneyStage | null;
    totalPoints: number;
    pointsToNext: number | null;
    earnedTitles: string[];
    equippedTitle: string | null;
  };
}

export async function fetchAchievements(token: string): Promise<AchievementsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/achievements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Achievements fetch failed (${res.status})`);
  }
  return res.json() as Promise<AchievementsResponse>;
}

export async function fetchAchievementJourney(token: string): Promise<JourneyResponse["journey"]> {
  const res = await fetch(`${getApiBaseUrl()}/achievements/journey`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Journey fetch failed (${res.status})`);
  }
  const data = (await res.json()) as JourneyResponse;
  return data.journey;
}

export async function evaluateAchievementsApi(
  token: string,
  trigger: string = "manual",
): Promise<UnlockedAchievement[]> {
  const res = await fetch(`${getApiBaseUrl()}/achievements/evaluate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trigger }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Evaluate failed (${res.status})`);
  }
  const data = (await res.json()) as { newlyUnlocked: UnlockedAchievement[] };
  return data.newlyUnlocked ?? [];
}

export const RARITY_COLORS: Record<string, string> = {
  common: "#94A3B8",
  rare: "#3B82F6",
  epic: "#8B5CF6",
  legendary: "#F59E0B",
  mythic: "#EF4444",
};

export const CATEGORY_ICONS: Record<string, keyof typeof import("@expo/vector-icons").Ionicons.glyphMap> = {
  workout: "barbell",
  steps: "footsteps",
  weight: "trending-down",
  streak: "flame",
  hydration: "water",
  sleep: "moon",
  strength: "fitness",
  checkin: "pulse",
  default: "trophy",
};

export function getAchievementIcon(category: string, type?: string): keyof typeof import("@expo/vector-icons").Ionicons.glyphMap {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS[type ?? ""] ?? CATEGORY_ICONS.default;
}

export function getAchievementColor(rarity: string, category: string): string {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS.common;
}
