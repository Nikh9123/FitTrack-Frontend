import { useAuth } from "@/context/AuthContext";
import {
  evaluateAchievementsApi,
  fetchAchievementJourney,
  fetchAchievements,
  type AchievementProgressItem,
  type JourneyStage,
} from "@/lib/achievements-api";
import { useCallback, useState } from "react";

export function useAchievements() {
  const { token } = useAuth();
  const [achievements, setAchievements] = useState<AchievementProgressItem[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [earnedCount, setEarnedCount] = useState(0);
  const [journeyStages, setJourneyStages] = useState<JourneyStage[]>([]);
  const [currentStage, setCurrentStage] = useState<JourneyStage | null>(null);
  const [equippedTitle, setEquippedTitle] = useState<string | null>(null);
  const [pointsToNext, setPointsToNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [achData, journey] = await Promise.all([
        fetchAchievements(token),
        fetchAchievementJourney(token),
      ]);
      setAchievements(achData.achievements);
      setTotalPoints(achData.totalPoints);
      setEarnedCount(achData.earnedCount);
      setJourneyStages(journey.stages);
      setCurrentStage(journey.currentStage);
      setEquippedTitle(journey.equippedTitle);
      setPointsToNext(journey.pointsToNext);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const evaluate = useCallback(
    async (trigger: string = "manual") => {
      if (!token) return [];
      return evaluateAchievementsApi(token, trigger);
    },
    [token],
  );

  return {
    achievements,
    totalPoints,
    earnedCount,
    journeyStages,
    currentStage,
    equippedTitle,
    pointsToNext,
    loading,
    refresh,
    evaluate,
  };
}
