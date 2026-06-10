import { AchievementBadgeGrid, achievementToBadge } from "@/components/progress/AchievementBadgeGrid";
import { APP_NAME } from "@/constants/branding";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { useAchievements } from "@/hooks/useAchievements";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { ScreenEntrance } from "@/components/ui/ScreenEntrance";
import {
  advanceDevDayForTesting,
  getDailyRefreshDebugInfo,
  resetDevDateOverride,
} from "@/lib/daily-refresh";
import { hapticSelection, hapticSuccess, hapticWarning } from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AboutVeeraSheet } from "@/components/profile/AboutVeeraSheet";
import { EditProfileSheet } from "@/components/profile/EditProfileSheet";
import { HelpSupportSheet } from "@/components/profile/HelpSupportSheet";
import { PrivacySecuritySheet } from "@/components/profile/PrivacySecuritySheet";
import { ReminderSettingsSheet } from "@/components/profile/ReminderSettingsSheet";
import { UpgradeMembershipSheet } from "@/components/profile/UpgradeMembershipSheet";
import { loadLocalAvatarUri } from "@/lib/local-avatar";
import { Image } from "expo-image";

const ACHIEVEMENTS_STATIC_FALLBACK = [
  { icon: "flame" as const, label: "12-Day\nStreak", color: "#FF6B35" },
  { icon: "barbell" as const, label: "50\nWorkouts", color: "#3B82F6" },
  { icon: "trophy" as const, label: "10 kg\nLost", color: "#F59E0B" },
  { icon: "star" as const, label: "Top\nMember", color: "#8B5CF6" },
];

const MENU_ITEMS = [
  { icon: "sparkles" as const, label: "AI Coach", sub: "Chat with your fitness coach", route: "/(tabs)/trainer" as const },
  { icon: "person-outline" as const, label: "Edit Profile", sub: "Update your info" },
  { icon: "notifications-outline" as const, label: "Notifications", sub: "Push & email alerts" },
  { icon: "shield-checkmark-outline" as const, label: "Privacy & Security", sub: "Data & permissions" },
  { icon: "diamond-outline" as const, label: "Upgrade Membership", sub: "Unlock premium features" },
  { icon: "help-circle-outline" as const, label: "Help & Support", sub: "FAQs and contact" },
  { icon: "information-circle-outline" as const, label: `About ${APP_NAME}`, sub: "Version 1.0.0" },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: "sunny" | "moon" | "phone-portrait-outline" }[] = [
  { mode: "light", label: "Day", icon: "sunny" },
  { mode: "dark", label: "Night", icon: "moon" },
  { mode: "system", label: "Auto", icon: "phone-portrait-outline" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshProfile } = useAuth();
  const { recentWorkouts, bmi, streak, todayLog, refreshDailyData, refreshActivity } = useFitness();
  const { achievements, currentStage, totalPoints, refresh: refreshAchievements } = useAchievements();
  const [refreshing, setRefreshing] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [devDateInfo, setDevDateInfo] = useState(getDailyRefreshDebugInfo);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  const reloadAvatar = useCallback(() => {
    void loadLocalAvatarUri().then(setLocalAvatarUri);
  }, []);

  useEffect(() => {
    refreshProfile().catch(() => {});
    void refreshAchievements();
    reloadAvatar();
  }, [reloadAvatar]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshProfile(); } catch {} finally { setRefreshing(false); }
  }, [refreshProfile]);

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) {
        logout().then(() => router.replace("/(auth)/login"));
      }
    } else {
      Alert.alert("Logout", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: async () => {
          void hapticWarning();
          await logout();
          router.replace("/(auth)/login");
        }},
      ]);
    }
  };

  const handleSimulateNextDay = async () => {
    advanceDevDayForTesting();
    setDevDateInfo(getDailyRefreshDebugInfo());
    await Promise.all([refreshActivity(), refreshDailyData()]);
    void hapticSuccess();
    Alert.alert(
      "Day advanced (dev)",
      `App now treats today as ${getDailyRefreshDebugInfo().weekday}, ${getDailyRefreshDebugInfo().effectiveDate}.\n\nGo to Home to verify rings, meals, and workout card reset.`,
    );
  };

  const handleResetDevDate = async () => {
    resetDevDateOverride();
    setDevDateInfo(getDailyRefreshDebugInfo());
    await Promise.all([refreshActivity(), refreshDailyData()]);
    void hapticSuccess();
    Alert.alert("Date reset", "Back to the real calendar date.");
  };

  return (
    <ScreenEntrance style={{ flex: 1 }}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Profile hero */}
        <View style={[styles.profileHero, { ...colors.shadow.medium }]}>
          <LinearGradient
            colors={colors.profileHeroGradient as [string, string, ...string[]]}
            style={styles.profileBg}
          >
            {/* Settings */}
            <TouchableOpacity style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={20} color={colors.onGradientMuted} />
            </TouchableOpacity>

            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {localAvatarUri ? (
                <Image source={{ uri: localAvatarUri }} style={[styles.avatar, { borderColor: colors.primary }]} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary + "30", borderColor: colors.primary }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.heroName, { color: colors.onGradient }]}>{user?.name ?? `${APP_NAME} User`}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-outline" size={13} color={colors.onGradientMuted} />
              <Text style={[styles.heroMeta, { color: colors.onGradientMuted }]}>{user?.region ?? "Tokyo, Japan"}</Text>
              <Text style={[styles.heroDot, { color: colors.onGradientMuted }]}>·</Text>
              <Text style={[styles.heroMeta, { color: colors.onGradientMuted }]}>
                {user?.membershipTier === "premium" ? "Premium Member" : user?.role === "trainer" ? "Trainer" : "Basic Member"}
              </Text>
            </View>

            {/* Stats row */}
            <View style={[styles.heroStats, { backgroundColor: colors.heroStatsBg }]}>
              <HeroStat value={`${recentWorkouts.length}`} label="Workouts" />
              <View style={[styles.heroStatDivider, { backgroundColor: colors.heroStatsDivider }]} />
              <HeroStat value={`${streak}d`} label="Streak" />
              <View style={[styles.heroStatDivider, { backgroundColor: colors.heroStatsDivider }]} />
              <HeroStat value={`${bmi}`} label="BMI" />
              <View style={[styles.heroStatDivider, { backgroundColor: colors.heroStatsDivider }]} />
              <HeroStat value={`${user?.weightKg ?? todayLog.weight ?? "--"} kg`} label="Weight" />
            </View>
          </LinearGradient>
        </View>

        {/* Score card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <View style={styles.scoreHeader}>
            <View style={[styles.scoreIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="analytics" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scoreTitle, { color: colors.foreground }]}>Fitness Score</Text>
              <Text style={[styles.scoreSub, { color: colors.mutedForeground }]}>Based on your activity</Text>
            </View>
            <TouchableOpacity style={[styles.weeklyBtn, { backgroundColor: colors.muted }]}>
              <Text style={[styles.weeklyText, { color: colors.mutedForeground }]}>Weekly</Text>
              <Ionicons name="chevron-down" size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={styles.scoreBarRow}>
            <View style={[styles.scoreBarTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.scoreBarFill, { backgroundColor: colors.primary, width: "73%" }]} />
            </View>
            <Text style={[styles.scoreNum, { color: colors.primary }]}>73</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Good — Keep pushing to reach 80!</Text>
        </View>

        {/* Achievements */}
        <View style={styles.achieveHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Achievements</Text>
          <TouchableOpacity onPress={() => router.push("/coach/journey")}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>See all</Text>
          </TouchableOpacity>
        </View>
        {currentStage ? (
          <Text style={[styles.scoreSub, { color: colors.mutedForeground, marginBottom: 8 }]}>
            {currentStage.name} · {totalPoints} pts
          </Text>
        ) : null}
        {achievements.filter((a) => a.earned).length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achieveList}>
            {achievements
              .filter((a) => a.earned)
              .slice(0, 8)
              .map((a) => {
                const badge = achievementToBadge(a);
                return (
                  <View key={a.id} style={[styles.achieveCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
                    <View style={[styles.achieveIcon, { backgroundColor: badge.color + "18" }]}>
                      <Ionicons name={badge.icon} size={22} color={badge.color} />
                    </View>
                    <Text style={[styles.achieveLabel, { color: colors.foreground }]} numberOfLines={2}>
                      {badge.label}
                    </Text>
                  </View>
                );
              })}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achieveList}>
            {ACHIEVEMENTS_STATIC_FALLBACK.map((a) => (
              <View key={a.label} style={[styles.achieveCard, { backgroundColor: colors.card, ...colors.shadow.soft, opacity: 0.45 }]}>
                <View style={[styles.achieveIcon, { backgroundColor: a.color + "18" }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={[styles.achieveLabel, { color: colors.mutedForeground }]}>{a.label}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Body stats */}
        <View style={[styles.bodyCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <Text style={[styles.bodyCardTitle, { color: colors.foreground }]}>Body Stats</Text>
          <View style={styles.bodyGrid}>
            <BodyStat icon="body" label="BMI" value={`${bmi}`} color={colors.primary} />
            <BodyStat icon="fitness" label="Goal" value={user?.fitnessGoal ?? "Fat Loss"} color={colors.green} />
            <BodyStat icon="calendar" label="Member Since" value={user?.memberSince ?? "2024"} color={colors.cyan} />
            <BodyStat icon="location" label="Region" value={user?.region ?? "Tokyo"} color={colors.purple} />
          </View>
        </View>

        {/* Appearance */}
        <View style={[styles.themeCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <Text style={[styles.themeTitle, { color: colors.foreground }]}>Appearance</Text>
          <Text style={[styles.themeSub, { color: colors.mutedForeground }]}>
            Choose day or night theme across the app
          </Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const active = mode === option.mode;
              return (
                <TouchableOpacity
                  key={option.mode}
                  onPress={() => {
                    void hapticSelection();
                    setMode(option.mode);
                  }}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.muted,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={active ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.themeBtnText,
                      { color: active ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Menu */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => {
                void hapticSelection();
                if ("route" in item && item.route) {
                  router.push(item.route);
                  return;
                }
                if (item.label === "Edit Profile") setEditProfileOpen(true);
                else if (item.label === "Notifications") setRemindersOpen(true);
                else if (item.label === "Privacy & Security") setPrivacyOpen(true);
                else if (item.label === "Upgrade Membership") setUpgradeOpen(true);
                else if (item.label === "Help & Support") setHelpOpen(true);
                else if (item.label.startsWith("About ")) setAboutOpen(true);
              }}
              style={[styles.menuItem, idx < MENU_ITEMS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: colors.muted }]}>
                <Ionicons name={item.icon} size={18} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        {__DEV__ ? (
          <View style={[styles.devCard, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
            <View style={styles.devHeader}>
              <Ionicons name="flask-outline" size={18} color={colors.primary} />
              <Text style={[styles.devTitle, { color: colors.foreground }]}>Daily Refresh Test</Text>
            </View>
            <Text style={[styles.devSub, { color: colors.mutedForeground }]}>
              Effective date: {devDateInfo.effectiveDate} ({devDateInfo.weekday})
              {devDateInfo.offsetDays > 0 ? ` · +${devDateInfo.offsetDays}d offset` : ""}
            </Text>
            <Text style={[styles.devSub, { color: colors.mutedForeground }]}>
              Logged today: {todayLog.calories} kcal · {todayLog.water} water · {todayLog.meals.length} meals
            </Text>
            <View style={styles.devRow}>
              <TouchableOpacity
                onPress={() => void handleSimulateNextDay()}
                style={[styles.devBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.devBtnText}>Simulate Next Day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleResetDevDate()}
                style={[styles.devBtn, { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={[styles.devBtnText, { color: colors.foreground }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.red} />
          <Text style={[styles.logoutText, { color: colors.red }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
      <ReminderSettingsSheet visible={remindersOpen} onClose={() => setRemindersOpen(false)} />
      <EditProfileSheet visible={editProfileOpen} onClose={() => setEditProfileOpen(false)} onSaved={reloadAvatar} />
      <PrivacySecuritySheet visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <HelpSupportSheet visible={helpOpen} onClose={() => setHelpOpen(false)} />
      <AboutVeeraSheet visible={aboutOpen} onClose={() => setAboutOpen(false)} />
      <UpgradeMembershipSheet visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </View>
    </ScreenEntrance>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.heroStatItem}>
      <Text style={[styles.heroStatVal, { color: colors.onGradient }]}>{value}</Text>
      <Text style={[styles.heroStatLabel, { color: colors.onGradientMuted }]}>{label}</Text>
    </View>
  );
}

function BodyStat({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.bodyStat, { backgroundColor: colors.background }]}>
      <View style={[styles.bodyStatIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.bodyStatVal, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.bodyStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },

  profileHero: { borderRadius: 20, overflow: "hidden" },
  profileBg: { padding: 20, paddingBottom: 24 },
  settingsBtn: { alignSelf: "flex-end" },
  avatarWrap: { alignItems: "center", marginVertical: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "center", marginTop: 4, marginBottom: 18 },
  heroMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  heroDot: { fontSize: 12 },
  heroStats: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14 },
  heroStatItem: { flex: 1, alignItems: "center", gap: 2 },
  heroStatVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  heroStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  heroStatDivider: { width: 0.5, height: 32 },

  scoreCard: { borderRadius: 16, padding: 16, gap: 10 },
  scoreHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  scoreTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scoreSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  weeklyBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  weeklyText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scoreBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreNum: { fontSize: 20, fontFamily: "Inter_700Bold", width: 36, textAlign: "right" },
  scoreLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: -4 },
  achieveHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  achieveList: { gap: 10, paddingRight: 16 },
  achieveCard: { width: 100, borderRadius: 16, padding: 14, alignItems: "center", gap: 8 },
  achieveIcon: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  achieveLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },

  bodyCard: { borderRadius: 16, padding: 16, gap: 12 },
  bodyCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  bodyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bodyStat: { width: "47%", flexGrow: 1, borderRadius: 12, padding: 12, gap: 4 },
  bodyStatIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bodyStatVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bodyStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  themeCard: { borderRadius: 16, padding: 16, gap: 10 },
  themeTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  themeSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  themeRow: { flexDirection: "row", gap: 8 },
  themeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  menuCard: { borderRadius: 16, padding: 4 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  menuSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  devCard: { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1 },
  devHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  devTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  devSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  devRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  devBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  devBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
