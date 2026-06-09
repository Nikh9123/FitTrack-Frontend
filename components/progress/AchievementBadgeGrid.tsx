import { PulseGlow } from "@/components/progress/PulseGlow";
import { useColors } from "@/hooks/useColors";
import {
  getAchievementColor,
  getAchievementIcon,
  type AchievementProgressItem,
} from "@/lib/achievements-api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface AchievementBadgeItem {
  id: string;
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  unlocked: boolean;
  rarity?: string;
  progressPercent?: number;
  points?: number;
}

export function achievementToBadge(item: AchievementProgressItem): AchievementBadgeItem {
  return {
    id: item.id,
    name: item.name,
    label: item.name,
    icon: getAchievementIcon(item.category, item.type),
    color: getAchievementColor(item.rarity, item.category),
    unlocked: item.earned,
    rarity: item.rarity,
    progressPercent: item.progressPercent,
    points: item.points,
  };
}

function isRare(rarity?: string) {
  return rarity === "legendary" || rarity === "epic";
}

interface AchievementBadgeGridProps {
  badges: AchievementBadgeItem[];
  onBadgePress?: (badge: AchievementBadgeItem) => void;
  columns?: 3 | 4;
  showProgress?: boolean;
}

export function AchievementBadgeGrid({
  badges,
  onBadgePress,
  columns = 3,
  showProgress = true,
}: AchievementBadgeGridProps) {
  const colors = useColors();
  const width = columns === 4 ? "23%" : "30%";

  return (
    <View style={styles.grid}>
      {badges.map((badge) => {
        const rare = isRare(badge.rarity);
        const content = (
          <>
            <View style={styles.iconOuter}>
              {badge.unlocked && rare ? (
                <LinearGradient
                  colors={["#F59E0B", "#FDE68A", "#F59E0B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rareRing}
                />
              ) : null}
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: badge.unlocked ? badge.color + "18" : colors.muted,
                    borderColor: badge.unlocked
                      ? rare
                        ? "#F59E0BB8"
                        : badge.color + "55"
                      : colors.border,
                  },
                  badge.unlocked && !rare ? { shadowColor: badge.color, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } : null,
                ]}
              >
                <Ionicons
                  name={badge.unlocked ? badge.icon : "lock-closed"}
                  size={22}
                  color={badge.unlocked ? badge.color : colors.mutedForeground}
                />
              </View>
            </View>
            <Text
              style={[
                styles.label,
                { color: badge.unlocked ? colors.foreground : colors.mutedForeground },
              ]}
              numberOfLines={2}
            >
              {badge.label}
            </Text>
            {showProgress && !badge.unlocked && badge.progressPercent != null && badge.progressPercent > 0 ? (
              <Text style={[styles.progressHint, { color: colors.mutedForeground }]}>
                {badge.progressPercent}%
              </Text>
            ) : null}
            {badge.unlocked && badge.points ? (
              <Text style={[styles.points, { color: badge.color }]}>+{badge.points}</Text>
            ) : null}
          </>
        );

        const cardStyle = [
          styles.card,
          {
            width,
            backgroundColor: colors.card,
            opacity: badge.unlocked ? 1 : 0.4,
          },
        ];

        if (onBadgePress) {
          const inner = (
            <TouchableOpacity
              style={cardStyle}
              onPress={() => onBadgePress(badge)}
              activeOpacity={0.75}
            >
              {content}
            </TouchableOpacity>
          );
          return badge.unlocked ? (
            <PulseGlow key={badge.id} active color={rare ? "#F59E0B" : badge.color} style={{ width, borderRadius: 16 }}>
              {inner}
            </PulseGlow>
          ) : (
            <View key={badge.id}>{inner}</View>
          );
        }

        return (
          <View key={badge.id} style={cardStyle}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-start" },
  card: { borderRadius: 16, padding: 12, gap: 4, alignItems: "center", flexGrow: 1 },
  iconOuter: { alignItems: "center", justifyContent: "center" },
  rareRing: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    opacity: 0.85,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center", minHeight: 28 },
  progressHint: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  points: { fontSize: 9, fontFamily: "Inter_700Bold" },
});
