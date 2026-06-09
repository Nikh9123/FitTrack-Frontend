import { FadeInDown, FadeInRight } from "react-native-reanimated";

/** Shared motion tokens — use everywhere for consistent feel */
export const MOTION = {
  springBar: { damping: 15, stiffness: 95, mass: 0.8 },
  springSoft: { damping: 18, stiffness: 120 },
  timingRing: { duration: 900 },
  timingFast: { duration: 350 },
  timingScreen: { duration: 340 },
  timingScore: { duration: 600 },
  staggerBarMs: 45,
  staggerCardMs: 55,
} as const;

export function entranceFade(index = 0) {
  return FadeInDown.delay(index * MOTION.staggerCardMs)
    .duration(MOTION.timingFast.duration)
    .springify()
    .damping(MOTION.springSoft.damping);
}

/** Full-screen / tab content entrance */
export function screenEntrance(index = 0) {
  return FadeInDown.delay(index * 40)
    .duration(MOTION.timingScreen.duration)
    .springify()
    .damping(22)
    .stiffness(140);
}

/** Stack push (detail screens) */
export function stackPushEntrance() {
  return FadeInRight.duration(MOTION.timingScreen.duration).springify().damping(20);
}
