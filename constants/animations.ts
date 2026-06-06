import { FadeInDown } from "react-native-reanimated";

/** Shared motion tokens — use everywhere for consistent feel */
export const MOTION = {
  springBar: { damping: 15, stiffness: 95, mass: 0.8 },
  springSoft: { damping: 18, stiffness: 120 },
  timingRing: { duration: 900 },
  timingFast: { duration: 350 },
  staggerBarMs: 45,
  staggerCardMs: 60,
} as const;

export function entranceFade(index = 0) {
  return FadeInDown.delay(index * MOTION.staggerCardMs)
    .duration(MOTION.timingFast.duration)
    .springify()
    .damping(MOTION.springSoft.damping);
}
