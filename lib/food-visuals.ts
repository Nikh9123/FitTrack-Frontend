import type { Ionicons } from "@expo/vector-icons";

export interface FoodVisual {
  emoji: string;
  gradient: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORY_VISUALS: Record<string, FoodVisual> = {
  breakfast: { emoji: "🌅", gradient: ["#FFB347", "#FF6B35"], icon: "sunny" },
  rice_and_breads: { emoji: "🫓", gradient: ["#F4D03F", "#E67E22"], icon: "pizza" },
  biryani: { emoji: "🍛", gradient: ["#F39C12", "#D35400"], icon: "restaurant" },
  dal_legumes: { emoji: "🥣", gradient: ["#F9E79F", "#D4AC0D"], icon: "leaf" },
  veg_curry: { emoji: "🥘", gradient: ["#58D68D", "#27AE60"], icon: "nutrition" },
  non_veg: { emoji: "🍗", gradient: ["#EC7063", "#C0392B"], icon: "fish" },
  south_indian: { emoji: "🥞", gradient: ["#F5B041", "#CA6F1E"], icon: "cafe" },
  snacks: { emoji: "🥟", gradient: ["#BB8FCE", "#8E44AD"], icon: "fast-food" },
  sides: { emoji: "🥗", gradient: ["#82E0AA", "#1E8449"], icon: "leaf-outline" },
  beverages: { emoji: "🥤", gradient: ["#85C1E9", "#2874A6"], icon: "water" },
  fruits: { emoji: "🍎", gradient: ["#F1948A", "#E74C3C"], icon: "nutrition-outline" },
  sweets: { emoji: "🍬", gradient: ["#FADBD8", "#E91E63"], icon: "ice-cream" },
  supplements: { emoji: "💪", gradient: ["#AED6F1", "#2E86C1"], icon: "barbell" },
  custom: { emoji: "🍽️", gradient: ["#566573", "#2C3E50"], icon: "restaurant-outline" },
};

const KEYWORD_VISUALS: Array<{ match: RegExp; visual: FoodVisual }> = [
  { match: /poha|upma|idli|dosa|paratha|omelette|egg/i, visual: { emoji: "🍳", gradient: ["#FFD93D", "#FF6B35"], icon: "sunny" } },
  { match: /roti|chapati|naan|puri|bread/i, visual: { emoji: "🫓", gradient: ["#FFE0B2", "#FB8C00"], icon: "pizza" } },
  { match: /rice|biryani|pulao|khichdi/i, visual: { emoji: "🍚", gradient: ["#FFF9C4", "#F9A825"], icon: "restaurant" } },
  { match: /dal|rajma|chole|sambar|curry|paneer|aloo|gobi/i, visual: { emoji: "🥘", gradient: ["#C8E6C9", "#43A047"], icon: "leaf" } },
  { match: /chicken|fish|egg|mutton|prawn/i, visual: { emoji: "🍗", gradient: ["#FFCCBC", "#E64A19"], icon: "fish" } },
  { match: /protein|whey|paneer|egg|chicken breast/i, visual: { emoji: "💪", gradient: ["#90CAF9", "#1565C0"], icon: "barbell" } },
  { match: /banana|apple|mango|fruit/i, visual: { emoji: "🍌", gradient: ["#FFF176", "#FBC02D"], icon: "nutrition" } },
  { match: /chai|coffee|lassi|water|shake/i, visual: { emoji: "☕", gradient: ["#B3E5FC", "#0288D1"], icon: "cafe" } },
  { match: /samosa|pakora|bhel|puri|snack/i, visual: { emoji: "🥟", gradient: ["#E1BEE7", "#8E24AA"], icon: "fast-food" } },
];

export function getFoodVisual(name: string, category: string | null | undefined): FoodVisual {
  for (const { match, visual } of KEYWORD_VISUALS) {
    if (match.test(name)) return visual;
  }
  if (category && CATEGORY_VISUALS[category]) return CATEGORY_VISUALS[category];
  return CATEGORY_VISUALS.custom;
}

export function formatServingsLabel(servings: number, servingDescription?: string | null) {
  const unit = servingDescription?.trim() || "serving";
  if (servings === 1) return `1 × ${unit}`;
  return `${servings} × ${unit}`;
}
