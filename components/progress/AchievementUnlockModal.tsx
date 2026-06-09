import { useCountUp } from "@/hooks/useCountUp";
import { useColors } from "@/hooks/useColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { RARITY_COLORS, type UnlockedAchievement } from "@/lib/achievements-api";
import { hapticSuccess } from "@/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface AchievementUnlockModalProps {
  achievement: UnlockedAchievement | null;
  visible: boolean;
  onClose: () => void;
}

export function AchievementUnlockModal({ achievement, visible, onClose }: AchievementUnlockModalProps) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0.85);
  const glow = useSharedValue(0.4);
  const burst = useSharedValue(0);

  const pointsTarget = achievement?.points ?? 0;
  const displayPoints = useCountUp(visible ? pointsTarget : 0, 1200);

  useEffect(() => {
    if (!visible || !achievement) return;
    void hapticSuccess();
    if (reduceMotion) {
      scale.value = 1;
      glow.value = 0.6;
      burst.value = 1;
      return;
    }
    scale.value = withSequence(withTiming(1.12, { duration: 320 }), withTiming(1, { duration: 220 }));
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0.35, { duration: 900 })),
      -1,
      true,
    );
    burst.value = 0;
    burst.value = withDelay(200, withTiming(1, { duration: 500 }));
  }, [visible, achievement, scale, glow, burst, reduceMotion]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.85 + burst.value * 0.35 }],
  }));

  const burstStyle = useAnimatedStyle(() => ({
    opacity: (1 - burst.value) * 0.5,
    transform: [{ scale: 0.6 + burst.value * 1.4 }],
  }));

  if (!achievement) return null;

  const rarityColor = RARITY_COLORS[achievement.rarity] ?? colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View style={[styles.cardWrap, cardStyle]}>
            <Animated.View style={[styles.glow, glowStyle, { backgroundColor: rarityColor }]} />
            <Animated.View style={[styles.burst, burstStyle, { borderColor: rarityColor }]} />
            <LinearGradient
              colors={[rarityColor + "30", colors.card, colors.card]}
              style={[styles.card, { borderColor: rarityColor + "66" }]}
            >
              <View style={[styles.rarityPill, { backgroundColor: rarityColor + "22" }]}>
                <Ionicons name="sparkles" size={12} color={rarityColor} />
                <Text style={[styles.rarityText, { color: rarityColor }]}>
                  {achievement.rarity.toUpperCase()} UNLOCKED
                </Text>
              </View>

              <View style={[styles.iconCircle, { backgroundColor: rarityColor + "20", borderColor: rarityColor }]}>
                <Ionicons name="trophy" size={36} color={rarityColor} />
              </View>

              <Text style={[styles.title, { color: colors.foreground }]}>{achievement.name}</Text>
              {achievement.description ? (
                <Text style={[styles.description, { color: colors.mutedForeground }]}>
                  {achievement.description}
                </Text>
              ) : null}

              <View style={styles.metaRow}>
                <Text style={[styles.points, { color: rarityColor }]}>+{displayPoints} pts</Text>
                {achievement.titleUnlock ? (
                  <Text style={[styles.titleUnlock, { color: colors.foreground }]}>
                    Title: {achievement.titleUnlock}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity style={[styles.btn, { backgroundColor: rarityColor }]} onPress={onClose}>
                <Text style={styles.btnText}>Awesome!</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  cardWrap: { width: "100%", maxWidth: 340, alignItems: "center" },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: "12%",
    alignSelf: "center",
  },
  burst: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    top: "8%",
    alignSelf: "center",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  rarityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rarityText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginTop: 4,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  description: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  metaRow: { alignItems: "center", gap: 4, marginTop: 4 },
  points: { fontSize: 13, fontFamily: "Inter_700Bold" },
  titleUnlock: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  btn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
