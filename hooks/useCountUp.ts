import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

export function useCountUp(target: number, duration = 600, decimals = 0): number {
  const reduceMotion = useReducedMotion();
  const safeTarget = Number.isFinite(target) ? target : 0;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 600;
  const [value, setValue] = useState(reduceMotion ? safeTarget : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(safeTarget);
      return;
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / safeDuration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = safeTarget * eased;
      setValue(decimals > 0 ? parseFloat(next.toFixed(decimals)) : Math.round(next));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safeTarget, safeDuration, decimals, reduceMotion]);

  return value;
}
