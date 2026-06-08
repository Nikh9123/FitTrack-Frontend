import { Platform } from "react-native";
import colors, { type ThemeTokens } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

function makeShadows(isDark: boolean) {
  if (Platform.OS === "web") {
    return {
      soft: { boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.06)" } as any,
      medium: { boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.35)" : "0 4px 16px rgba(0,0,0,0.10)" } as any,
      strong: { boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.45)" : "0 8px 24px rgba(0,0,0,0.14)" } as any,
    };
  }
  return colors.shadow;
}

export function useColors(): ThemeTokens {
  const { colorScheme, isDark } = useTheme();
  const palette = colorScheme === "light" ? colors.light : colors.dark;
  return {
    ...palette,
    radius: colors.radius,
    radiusSmall: colors.radiusSmall,
    radiusLarge: colors.radiusLarge,
    radiusFull: colors.radiusFull,
    spacing: colors.spacing,
    shadow: makeShadows(isDark),
    typography: colors.typography,
  };
}
