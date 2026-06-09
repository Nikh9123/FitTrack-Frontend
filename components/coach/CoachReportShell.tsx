import { ScreenEntrance } from "@/components/ui/ScreenEntrance";
import { useColors } from "@/hooks/useColors";
import { hapticLight } from "@/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type CoachReportTab = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function formatSavedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CoachReportShell({
  title,
  subtitle,
  accentColor,
  secondaryAccent,
  saved,
  savedAt,
  loading,
  refreshing,
  onRefresh,
  onRegenerate,
  onShare,
  sharing,
  onBack,
  tabs,
  activeTab,
  onTabChange,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  secondaryAccent: string;
  saved?: boolean;
  savedAt?: string | null;
  loading?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onRegenerate: () => void;
  onShare?: () => void;
  sharing?: boolean;
  onBack: () => void;
  tabs: CoachReportTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;

  return (
    <ScreenEntrance style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 28 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={accentColor} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[accentColor + "18", secondaryAccent + "10", colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { borderColor: accentColor + "25" }]}
          >
            <TouchableOpacity onPress={onBack} style={styles.backRow}>
              <Ionicons name="chevron-back" size={22} color={colors.foreground} />
              <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
            </TouchableOpacity>

            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
                {saved ? (
                  <View style={[styles.savedBadge, { backgroundColor: accentColor + "15" }]}>
                    <Ionicons name="cloud-done" size={13} color={accentColor} />
                    <Text style={[styles.savedText, { color: accentColor }]}>
                      Saved to your account{savedAt ? ` · ${formatSavedAt(savedAt)}` : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.heroActions}>
                {onShare ? (
                  <TouchableOpacity
                    onPress={onShare}
                    disabled={sharing}
                    style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    {sharing ? (
                      <ActivityIndicator size="small" color={accentColor} />
                    ) : (
                      <Ionicons name="share-outline" size={18} color={accentColor} />
                    )}
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={onRegenerate}
                  style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <Ionicons name="refresh" size={18} color={accentColor} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={[styles.tabBarWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    void hapticLight();
                    onTabChange(tab.id);
                  }}
                  style={[
                    styles.tab,
                    active
                      ? { backgroundColor: accentColor + "15", borderColor: accentColor + "40" }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name={tab.icon} size={14} color={active ? accentColor : colors.mutedForeground} />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: active ? accentColor : colors.mutedForeground },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.content}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </ScreenEntrance>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 16 },
  heroWrap: { marginHorizontal: -4 },
  hero: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    overflow: "hidden",
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  heroActions: { flexDirection: "row", gap: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  savedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  iconBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tabBarWrap: { marginHorizontal: -20, paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  tabBar: { gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  content: { gap: 14 },
  footer: { gap: 10, marginTop: 4 },
});
