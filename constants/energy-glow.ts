/** Consistent energy glow language across rings, charts, badges, and scores */

export type EnergyDomain = "activity" | "recovery" | "hydration" | "nutrition" | "intensity";

export const ENERGY_GLOW = {
  activity: { primary: "#FF6B2C", secondary: "#FF9A5A", glowOpacity: 0.15 },
  recovery: { primary: "#8B5CF6", secondary: "#B794F6", glowOpacity: 0.14 },
  hydration: { primary: "#3B82F6", secondary: "#60A5FA", glowOpacity: 0.14 },
  nutrition: { primary: "#10B981", secondary: "#6EE7B7", glowOpacity: 0.14 },
  intensity: { primary: "#EF4444", secondary: "#F87171", glowOpacity: 0.12 },
} as const;

export function energyFromColor(color: string): (typeof ENERGY_GLOW)[EnergyDomain] {
  const c = color.toLowerCase();
  if (c.includes("8b5") || c.includes("purple") || c.includes("a855")) return ENERGY_GLOW.recovery;
  if (c.includes("3b82") || c.includes("06b6") || c.includes("cyan")) return ENERGY_GLOW.hydration;
  if (c.includes("10b9") || c.includes("22c5") || c.includes("green")) return ENERGY_GLOW.nutrition;
  if (c.includes("ef44") || c.includes("red")) return ENERGY_GLOW.intensity;
  return ENERGY_GLOW.activity;
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0");
  if (hex.length === 7) return `${hex}${a}`;
  if (hex.length === 9) return `${hex.slice(0, 7)}${a}`;
  return hex;
}
