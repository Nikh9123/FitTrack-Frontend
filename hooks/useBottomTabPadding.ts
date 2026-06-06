import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Bottom inset so scroll content clears the absolute-positioned tab bar. */
export function useBottomTabPadding(extra = 24) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === "web" ? 84 : 72;
  return insets.bottom + tabBarHeight + extra;
}
