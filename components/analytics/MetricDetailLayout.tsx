import { ScreenEntrance } from "@/components/ui/ScreenEntrance";
import { useColors } from "@/hooks/useColors";
import { hapticLight } from "@/lib/haptics";
import type { MetricPeriod } from "@/lib/metrics/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PeriodSelector } from "./PeriodSelector";

interface MetricDetailLayoutProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  period: MetricPeriod;
  onPeriodChange: (p: MetricPeriod) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  hero?: React.ReactNode;
  children: React.ReactNode;
}

export function MetricDetailLayout({
  title,
  subtitle,
  icon,
  iconColor,
  period,
  onPeriodChange,
  loading,
  refreshing,
  onRefresh,
  hero,
  children,
}: MetricDetailLayoutProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScreenEntrance style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            void hapticLight();
            router.back();
          }}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={[styles.iconWrap, { backgroundColor: (iconColor ?? colors.primary) + "18" }]}>
          <Ionicons name={icon} size={22} color={iconColor ?? colors.primary} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
      >
        <PeriodSelector value={period} onChange={onPeriodChange} />
        {hero}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          children
        )}
      </ScrollView>
    </ScreenEntrance>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16, gap: 16, paddingTop: 8 },
  loader: { paddingVertical: 48, alignItems: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
});
