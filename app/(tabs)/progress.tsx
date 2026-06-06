import { useFitness } from "@/context/FitnessContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useProgressAPI } from "@/hooks/useProgressAPI";
import { AnimatedFitnessScoreCard } from "@/components/progress/AnimatedFitnessScoreCard";
import { AnimatedStatCard } from "@/components/progress/AnimatedStatCard";
import { FitnessJournal } from "@/components/progress/FitnessJournal";
import { MetricIllustration } from "@/components/progress/MetricIllustration";
import { PulseGlow } from "@/components/progress/PulseGlow";
import { entranceFade } from "@/constants/animations";
import {
  fetchProgressHistory,
  fetchProgressInsights,
  type HistoryDayBucket,
  type HistoryInsightDto,
  type HistoryPeriod,
} from "@/lib/progress-history-api";
import {
  fetchWeightChange,
  filterTrendByPeriod,
  formatWeightChangeMessage,
  PERIOD_LABELS,
  type WeightChangeDto,
  type WeightChangePeriod,
} from "@/lib/progress-weight-api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 64;
const CHART_H = 140;

const ACHIEVEMENT_TYPE_ICON: Record<string, { icon: string; color: string }> = {
  workout_streak:     { icon: "flame",        color: "#FF6B35" },
  progress_milestone: { icon: "trending-down", color: "#22C55E" },
  workout_count:      { icon: "barbell",      color: "#3B82F6" },
  nutrition:          { icon: "nutrition",    color: "#F59E0B" },
  default:            { icon: "trophy",       color: "#8B5CF6" },
};

const ENERGY_LABELS = ["Very Low 😞", "Low 😔", "Moderate 😐", "High 😊", "Excellent 🔥"];

type Mode   = "weight" | "fat" | "muscle" | "calories";
type WeightChartSource = "inbody" | "scale";

// ─── AreaChart ────────────────────────────────────────────────────────────────

function AreaChart({ data, color, width, height }: { data: number[]; color: string; width: number; height: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 10;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2 - 10);
    return { x, y };
  });
  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `C${points[i-1].x+(p.x-points[i-1].x)/2},${points[i-1].y} ${points[i-1].x+(p.x-points[i-1].x)/2},${p.y} ${p.x},${p.y}`))
    .join(" ");
  const areaPath = `${linePath} L${points[points.length-1].x},${height-pad} L${points[0].x},${height-pad} Z`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </SvgGradient>
      </Defs>
      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path d={linePath} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 3} fill={color} />
      ))}
    </Svg>
  );
}

function AnimatedBar({ targetH, color, delay }: { targetH: number; color: string; delay: number }) {
  const h = useSharedValue(0);
  useEffect(() => { h.value = withDelay(delay, withSpring(targetH, { damping: 14 })); }, [targetH]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[{ width: "100%", borderRadius: 6, minHeight: 4 }, style, { backgroundColor: color }]} />;
}

// ─── Empty State Card ─────────────────────────────────────────────────────────

function EmptyCard({
  icon, title, subtitle, ctaLabel, ctaIcon, onCta, colors,
}: {
  icon: string; title: string; subtitle: string;
  ctaLabel?: string; ctaIcon?: string; onCta?: () => void; colors: any;
}) {
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [float]);
  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  return (
    <Animated.View
      entering={entranceFade(3)}
      style={[emptyStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Animated.View style={[emptyStyles.iconWrap, { backgroundColor: colors.primary + "12" }, iconAnim]}>
        <Ionicons name={icon as any} size={26} color={colors.primary} />
      </Animated.View>
      <Text style={[emptyStyles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[emptyStyles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      {ctaLabel && onCta && (
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onCta(); }}
          style={[emptyStyles.cta, { backgroundColor: colors.primary }]}
        >
          {ctaIcon && <Ionicons name={ctaIcon as any} size={14} color="#fff" />}
          <Text style={emptyStyles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Check-in Modal ───────────────────────────────────────────────────────────

function CheckinModal({
  visible, onClose, onSubmit, hasCheckedIn, existingCheckin,
}: {
  visible: boolean; onClose: () => void; onSubmit: (d: any) => void;
  hasCheckedIn: boolean; existingCheckin: any;
}) {
  const colors = useColors();
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [soreness, setSoreness] = useState(2);
  const [recovery, setRecovery] = useState(3);

  useEffect(() => {
    if (existingCheckin) {
      if (existingCheckin.energyLevel) setEnergy(existingCheckin.energyLevel);
      if (existingCheckin.sleepHours) setSleep(Math.round(parseFloat(String(existingCheckin.sleepHours))));
      if (existingCheckin.soreness) setSoreness(existingCheckin.soreness);
      if (existingCheckin.recoveryScore) setRecovery(existingCheckin.recoveryScore);
    }
  }, [existingCheckin, visible]);

  const LEVEL_COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#22C55E", "#10B981"];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {hasCheckedIn ? "Today's Check-in ✓" : "Daily Check-in"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalQuestion, { color: colors.foreground }]}>⚡ How energetic do you feel?</Text>
          <View style={styles.levelRow}>
            {[1,2,3,4,5].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => { Haptics.selectionAsync(); setEnergy(v); }}
                style={[styles.levelBtn, { backgroundColor: energy === v ? LEVEL_COLORS[v-1] : colors.border + "60" }]}
              >
                <Text style={[styles.levelNum, { color: energy === v ? "#fff" : colors.mutedForeground }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.levelCaption, { color: colors.primary }]}>{ENERGY_LABELS[energy - 1]}</Text>

          <Text style={[styles.modalQuestion, { color: colors.foreground }]}>😴 Hours of sleep last night?</Text>
          <View style={styles.levelRow}>
            {[5,6,7,8,9].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => { Haptics.selectionAsync(); setSleep(v); }}
                style={[styles.levelBtn, { backgroundColor: sleep === v ? colors.primary : colors.border + "60" }]}
              >
                <Text style={[styles.levelNum, { color: sleep === v ? "#fff" : colors.mutedForeground }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.modalQuestion, { color: colors.foreground }]}>💪 Recovery level?</Text>
          <View style={styles.levelRow}>
            {[1,2,3,4,5].map(v => (
              <TouchableOpacity
                key={v}
                onPress={() => { Haptics.selectionAsync(); setRecovery(v); }}
                style={[styles.levelBtn, { backgroundColor: recovery === v ? "#22C55E" : colors.border + "60" }]}
              >
                <Text style={[styles.levelNum, { color: recovery === v ? "#fff" : colors.mutedForeground }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!hasCheckedIn && (
            <TouchableOpacity
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onSubmit({ energyLevel: energy, sleepHours: sleep, recoveryScore: recovery, soreness }); }}
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.submitText}>Save Check-in</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recentWorkouts, todayLog, bmi, weeklyCalories, refreshDailyData, lastSyncedAt } = useFitness();
  const { token } = useAuth();
  const { dashboard, aiInsights, loading, insightsLoading, logCheckin, fetchAIInsights, refreshDashboard } = useProgressAPI();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [chartMode, setChartMode] = useState<Mode>("weight");
  const [weightChartSource, setWeightChartSource] = useState<WeightChartSource>("inbody");
  const [period, setPeriod] = useState<WeightChangePeriod>("1w");
  const [weightChange, setWeightChange] = useState<WeightChangeDto | null>(null);
  const [checkinVisible, setCheckinVisible] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const [journalPeriod, setJournalPeriod] = useState<HistoryPeriod>("7d");
  const [journalMetric, setJournalMetric] = useState<"steps" | "calories" | "water" | "sleep" | "weight">("steps");
  const [journalBuckets, setJournalBuckets] = useState<HistoryDayBucket[]>([]);
  const [journalInsights, setJournalInsights] = useState<HistoryInsightDto[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [screenAnimKey, setScreenAnimKey] = useState(0);

  const loadJournal = useCallback(async () => {
    if (!token) return;
    setJournalLoading(true);
    try {
      const [history, insights] = await Promise.all([
        fetchProgressHistory(token, journalPeriod),
        fetchProgressInsights(token, journalPeriod),
      ]);
      setJournalBuckets(history.buckets);
      setJournalInsights(insights);
      setScreenAnimKey((k) => k + 1);
    } catch {
      setJournalBuckets([]);
      setJournalInsights([]);
    } finally {
      setJournalLoading(false);
    }
  }, [token, journalPeriod]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const inbodyWeightPoints = dashboard.inbodyWeightTrend ?? [];
  const manualWeightPoints = dashboard.manualWeightTrend ?? [];
  const hasInbodyWeightChart = inbodyWeightPoints.length >= 2;
  const hasManualWeightChart = manualWeightPoints.length >= 2;
  const hasWeightData = hasInbodyWeightChart || hasManualWeightChart;
  const hasInbodyData = dashboard.inbodyReports.length >= 1;
  const hasAchievements = dashboard.achievements.length > 0;
  const hasInsights = aiInsights.insights.length > 0;
  const hasAnyData = hasWeightData || hasInbodyData || dashboard.workoutStats.streak > 0;

  useFocusEffect(
    useCallback(() => {
      refreshDashboard();
    }, [refreshDashboard]),
  );

  useEffect(() => {
    if (weightChartSource === "inbody" && !hasInbodyWeightChart && hasManualWeightChart) {
      setWeightChartSource("scale");
    } else if (weightChartSource === "scale" && !hasManualWeightChart && hasInbodyWeightChart) {
      setWeightChartSource("inbody");
    }
  }, [hasInbodyWeightChart, hasManualWeightChart, weightChartSource]);

  const activeWeightTrend =
    weightChartSource === "inbody" ? inbodyWeightPoints : manualWeightPoints;

  const filteredWeightTrend = filterTrendByPeriod(activeWeightTrend, period);

  // ── Chart data (only real data, no demo fallback) ─────────────────────────
  const WEIGHT_DATA = hasWeightData && filteredWeightTrend.length >= 2
    ? filteredWeightTrend.map((x) => x.value)
    : [];
  const WEEKS = hasWeightData && filteredWeightTrend.length >= 2
    ? filteredWeightTrend.map((x) => x.week)
    : [];

  const loadWeightChange = useCallback(async () => {
    if (!token) return;
    try {
      const change = await fetchWeightChange(token, period, weightChartSource);
      setWeightChange(change);
    } catch {
      setWeightChange(null);
    }
  }, [token, period, weightChartSource]);

  useEffect(() => {
    if (chartMode === "weight") loadWeightChange();
  }, [chartMode, loadWeightChange]);

  const inbodyFat    = dashboard.inbodyReports.filter(r => r.bodyFat).map(r => parseFloat(r.bodyFat!)).reverse();
  const inbodyMuscle = dashboard.inbodyReports.filter(r => r.muscleMass).map(r => parseFloat(r.muscleMass!)).reverse();
  const FAT_DATA    = inbodyFat.length >= 2 ? inbodyFat : [];
  const MUSCLE_DATA = inbodyMuscle.length >= 2 ? inbodyMuscle : [];
  const CAL_DATA: number[] = weeklyCalories.some((c) => c > 0) ? weeklyCalories : [];

  // ── Transformation summary ────────────────────────────────────────────────
  const ts = dashboard.transformationSummary;

  // ── Achievements ──────────────────────────────────────────────────────────
  const achieveBadges = dashboard.achievements.map(a => {
    const typeMap = ACHIEVEMENT_TYPE_ICON[a.type ?? "default"] ?? ACHIEVEMENT_TYPE_ICON.default;
    return { ...a, icon: typeMap.icon as any, color: typeMap.color, unlocked: true };
  });

  const LOCKED_BADGES = [
    { icon: "star" as const, label: "Top Form", color: "#8B5CF6", unlocked: false },
    { icon: "medal" as const, label: "10 kg Lost", color: "#EF4444", unlocked: false },
  ];

  const allBadges = hasAchievements
    ? [...achieveBadges, ...LOCKED_BADGES].slice(0, 6)
    : [];

  const modeMap: Record<Mode, { data: number[]; color: string; label: string; unit: string }> = {
    weight:   { data: WEIGHT_DATA, color: colors.primary, label: "Weight",    unit: "kg"   },
    fat:      { data: FAT_DATA,    color: colors.purple,  label: "Body Fat",  unit: "%"    },
    muscle:   { data: MUSCLE_DATA, color: colors.green,   label: "Muscle",    unit: "kg"   },
    calories: { data: CAL_DATA,    color: colors.cyan,    label: "Calories",  unit: "kcal" },
  };

  const active       = modeMap[chartMode];
  const latestVal    =
    chartMode === "weight" && WEIGHT_DATA.length
      ? WEIGHT_DATA[WEIGHT_DATA.length - 1]
      : active.data.length
        ? active.data[active.data.length - 1]
        : null;
  const prevVal      = active.data.length ? active.data[0] : null;
  const diff         = latestVal != null && prevVal != null ? latestVal - prevVal : null;
  const diffStr      = diff != null ? `${diff >= 0 ? "+" : ""}${diff.toFixed(chartMode === "calories" ? 0 : 1)} ${active.unit}` : null;
  const weightChangeMsg = formatWeightChangeMessage(weightChange);
  const isWeightLost    = weightChange?.direction === "lost";
  const isWeightGained  = weightChange?.direction === "gained";
  const isGoodChange = chartMode === "weight"
    ? isWeightLost
    : diff != null && (chartMode === "fat" ? diff < 0 : diff > 0);
  const chartWeeks   = WEEKS.length ? WEEKS : active.data.map((_, i) => `W${i+1}`);

  const currentBmi    = dashboard.currentMetrics.bmi ?? bmi;
  const currentStreak = dashboard.workoutStats.streak;
  const hasCheckedIn  = !!dashboard.recentCheckin;

  const handleCheckin = async (data: any) => {
    await logCheckin(data);
    setCheckinVisible(false);
    await refreshDailyData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLoadInsights = async () => {
    setInsightsExpanded(true);
    await fetchAIInsights();
  };

  // ── Chart has data for current mode ──────────────────────────────────────
  const chartHasData =
    chartMode === "calories"
      ? CAL_DATA.length >= 2
      : chartMode === "weight"
        ? WEIGHT_DATA.length >= 2
        : active.data.length >= 2;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 110 }]}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Progress</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Your transformation journey</Text>
          </View>
          <View style={styles.headerRight}>
            {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
            {currentStreak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="flame" size={15} color={colors.primary} />
                <Text style={[styles.streakText, { color: colors.primary }]}>{currentStreak}d streak</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Onboarding banner when no data at all ── */}
        {!loading && !hasAnyData && (
          <View style={[styles.onboardCard, { backgroundColor: colors.card, borderColor: colors.primary + "30" }]}>
            <LinearGradient
              colors={[colors.primary + "08", colors.purple + "05"]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.onboardIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="analytics-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.onboardTitle, { color: colors.foreground }]}>No progress data yet.</Text>
            <Text style={[styles.onboardSub, { color: colors.mutedForeground }]}>
              Start tracking to unlock your personalised AI fitness dashboard.
            </Text>
            <View style={styles.onboardCtas}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/inbody"); }}
                style={[styles.onboardBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="scan-outline" size={14} color="#fff" />
                <Text style={styles.onboardBtnText}>Upload Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCheckinVisible(true); }}
                style={[styles.onboardBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary }]}
              >
                <Ionicons name="pulse-outline" size={14} color={colors.primary} />
                <Text style={[styles.onboardBtnText, { color: colors.primary }]}>Log Check-in</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Fitness Score Card ── */}
        <AnimatedFitnessScoreCard
          score={dashboard.fitnessScore.score}
          label={dashboard.fitnessScore.label}
          breakdown={dashboard.fitnessScore.breakdown}
          streakDays={currentStreak}
          colors={colors}
          animKey={`${screenAnimKey}-${dashboard.fitnessScore.score}`}
        />

        {/* ── Daily Check-in ── */}
        <PulseGlow active={!hasCheckedIn} color={hasCheckedIn ? colors.green : colors.primary} style={{ borderRadius: 16 }}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCheckinVisible(true); }}
            style={[styles.checkinBanner, {
              backgroundColor: hasCheckedIn ? colors.green + "12" : colors.primary + "12",
              borderColor: "transparent",
            }]}
          >
            <View style={[styles.checkinIcon, { backgroundColor: hasCheckedIn ? colors.green + "20" : colors.primary + "20" }]}>
              <Ionicons name={hasCheckedIn ? "checkmark-circle" : "pulse-outline"} size={20} color={hasCheckedIn ? colors.green : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkinTitle, { color: hasCheckedIn ? colors.green : colors.primary }]}>
                {hasCheckedIn ? "Check-in Complete ✓" : "Log Today's Check-in"}
              </Text>
              <Text style={[styles.checkinSub, { color: colors.mutedForeground }]}>
                {hasCheckedIn
                  ? `Energy: ${ENERGY_LABELS[(dashboard.recentCheckin?.energyLevel ?? 3) - 1]}`
                  : "Energy · Sleep · Recovery — 30 seconds"}
              </Text>
            </View>
            <Ionicons name={hasCheckedIn ? "eye-outline" : "chevron-forward"} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </PulseGlow>

        <FitnessJournal
          period={journalPeriod}
          onPeriodChange={setJournalPeriod}
          metric={journalMetric}
          onMetricChange={setJournalMetric}
          buckets={journalBuckets}
          insights={journalInsights}
          loading={journalLoading}
          lastSyncedAt={lastSyncedAt}
        />

        {/* ── Transformation Summary (only if has inbody data) ── */}
        {hasInbodyData ? (
          <Animated.View entering={entranceFade(4)} style={[styles.transformCard, { backgroundColor: colors.card, ...colors.shadow.medium }]}>
            <Text style={[styles.transformLabel, { color: colors.mutedForeground }]}>
              {(ts.weeks > 0 ? ts.weeks : 1)}-WEEK TRANSFORMATION
            </Text>
            <View style={styles.transformStats}>
              <TransformStat
                value={ts.weightLost != null ? ts.weightLost.toFixed(1) : "—"}
                unit={ts.weightLost != null ? "kg" : ""}
                label="Lost"
                color={colors.primary}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TransformStat
                value={ts.muscleGained != null ? ts.muscleGained.toFixed(1) : "—"}
                unit={ts.muscleGained != null ? "kg" : ""}
                label="Muscle"
                color={colors.green}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TransformStat
                value={ts.fatLost != null ? ts.fatLost.toFixed(1) : "—"}
                unit={ts.fatLost != null ? "%" : ""}
                label="Fat ↓"
                color={colors.purple}
              />
            </View>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              {ts.scans > 0 ? `${ts.scans} InBody scan${ts.scans > 1 ? "s" : ""} recorded · Keep going!` : "Upload more scans to track transformation"}
            </Text>
          </Animated.View>
        ) : (
          <EmptyCard
            icon="body-outline"
            title="No transformation data yet."
            subtitle="Upload your first InBody report to see body composition insights and track your transformation over time."
            ctaLabel="Upload Report"
            ctaIcon="scan-outline"
            onCta={() => router.push("/inbody")}
            colors={colors}
          />
        )}

        {/* ── Stats grid ── */}
        <View style={styles.statsGrid}>
          {[
            { label: "Workout Streak", value: currentStreak > 0 ? `${currentStreak}d` : "—", icon: "flame" as const, color: "#F59E0B", pulse: currentStreak > 0 },
            { label: "Current BMI", value: currentBmi ? `${currentBmi}` : "—", icon: "body" as const, color: colors.purple },
            { label: "InBody Scans", value: dashboard.inbodyReports.length > 0 ? `${dashboard.inbodyReports.length}` : "—", icon: "scan-outline" as const, color: colors.primary },
            { label: "Check-ins", value: hasCheckedIn ? "Today ✓" : "—", icon: "pulse-outline" as const, color: colors.green, pulse: !hasCheckedIn },
          ].map((s, i) => (
            <AnimatedStatCard
              key={s.label}
              label={s.label}
              value={s.value}
              icon={s.icon}
              color={s.color}
              colors={colors}
              index={i}
              pulse={"pulse" in s ? s.pulse : false}
            />
          ))}
        </View>

        {/* ── Area chart card ── */}
        <Animated.View entering={entranceFade(6)} style={[styles.chartCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <View style={styles.chartTop}>
            <View>
              {latestVal != null && chartHasData ? (
                <>
                  <Text style={[styles.chartCurrVal, { color: active.color }]}>
                    {latestVal.toFixed(chartMode === "calories" ? 0 : 1)} {active.unit}
                  </Text>
                  {chartMode === "weight" ? (
                    <View>
                      <View style={styles.chartDiffRow}>
                        {weightChange?.hasData && (
                          <Ionicons
                            name={isWeightLost ? "arrow-down" : isWeightGained ? "arrow-up" : "remove"}
                            size={12}
                            color={isWeightLost ? colors.green : isWeightGained ? "#F59E0B" : colors.mutedForeground}
                          />
                        )}
                        <Text
                          style={[
                            styles.chartDiff,
                            {
                              color: isWeightLost
                                ? colors.green
                                : isWeightGained
                                  ? "#F59E0B"
                                  : colors.mutedForeground,
                            },
                          ]}
                        >
                          {weightChangeMsg}
                        </Text>
                      </View>
                      {weightChange?.isEstimated && weightChange.disclaimer ? (
                        <Text style={[styles.chartDisclaimer, { color: colors.mutedForeground }]}>
                          {weightChange.disclaimer}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    diffStr && chartHasData && (
                      <View style={styles.chartDiffRow}>
                        <Ionicons
                          name={isGoodChange ? "arrow-down" : "arrow-up"}
                          size={12}
                          color={isGoodChange ? colors.green : colors.red}
                        />
                        <Text style={[styles.chartDiff, { color: isGoodChange ? colors.green : colors.red }]}>
                          {diffStr} from W1
                        </Text>
                      </View>
                    )
                  )}
                </>
              ) : (
                <Text style={[styles.chartCurrVal, { color: colors.mutedForeground, fontSize: 16 }]}>
                  No {active.label} data
                </Text>
              )}
            </View>
            <View style={styles.periodRow}>
              {(["1d", "1w", "1m", "all"] as WeightChangePeriod[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => { Haptics.selectionAsync(); setPeriod(p); }}
                  style={[styles.periodBtn, period === p && { backgroundColor: active.color }]}
                >
                  <Text style={[styles.periodText, { color: period === p ? "#fff" : colors.mutedForeground }]}>
                    {PERIOD_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.modeTabs}>
            {(Object.keys(modeMap) as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => { Haptics.selectionAsync(); setChartMode(m); }}
                style={[styles.modeTab, chartMode === m && { backgroundColor: modeMap[m].color + "18", borderColor: modeMap[m].color }]}
              >
                <Text style={[styles.modeTabText, { color: chartMode === m ? modeMap[m].color : colors.mutedForeground }]}>
                  {modeMap[m].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {chartMode === "weight" && (hasInbodyWeightChart || hasManualWeightChart) ? (
            <View style={styles.weightSourceRow}>
              {hasInbodyWeightChart ? (
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setWeightChartSource("inbody"); }}
                  style={[
                    styles.weightSourceChip,
                    {
                      borderColor: weightChartSource === "inbody" ? colors.purple : colors.border,
                      backgroundColor: weightChartSource === "inbody" ? colors.purple + "18" : colors.muted,
                    },
                  ]}
                >
                  <Ionicons
                    name="scan-outline"
                    size={14}
                    color={weightChartSource === "inbody" ? colors.purple : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.weightSourceText,
                      { color: weightChartSource === "inbody" ? colors.purple : colors.mutedForeground },
                    ]}
                  >
                    InBody report
                  </Text>
                </TouchableOpacity>
              ) : null}
              {hasManualWeightChart ? (
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setWeightChartSource("scale"); }}
                  style={[
                    styles.weightSourceChip,
                    {
                      borderColor: weightChartSource === "scale" ? colors.primary : colors.border,
                      backgroundColor: weightChartSource === "scale" ? colors.primary + "18" : colors.muted,
                    },
                  ]}
                >
                  <Ionicons
                    name="scale-outline"
                    size={14}
                    color={weightChartSource === "scale" ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.weightSourceText,
                      { color: weightChartSource === "scale" ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    Scale log
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {chartHasData ? (
            <>
              <AreaChart data={active.data} color={active.color} width={CHART_W} height={CHART_H} />
              <View style={styles.xLabels}>
                {chartWeeks.map((w, i) => (
                  <Text key={i} style={[styles.xLabel, { color: i === chartWeeks.length - 1 ? active.color : colors.mutedForeground }]}>{w}</Text>
                ))}
              </View>
            </>
          ) : (
            <View style={[styles.chartEmpty, { borderColor: colors.border }]}>
              {chartMode === "calories" ? (
                <MetricIllustration metric="calories" color={active.color} size={100} />
              ) : (
                <Ionicons name="stats-chart-outline" size={32} color={colors.mutedForeground} />
              )}
              <Text style={[styles.chartEmptyText, { color: colors.mutedForeground }]}>
                {chartMode === "weight"
                  ? weightChartSource === "inbody"
                    ? "Upload InBody reports to see scan-based weight trends."
                    : "Log your weight on Home or Progress to see scale trends."
                  : chartMode === "fat" || chartMode === "muscle"
                  ? "Upload InBody reports to unlock body composition charts."
                  : chartMode === "calories" && CAL_DATA.length >= 2
                  ? "Log meals daily to see your nutrition trend."
                  : "Nutrition tracking coming soon."}
              </Text>
              {(chartMode === "fat" || chartMode === "muscle") && (
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/inbody"); }}
                  style={[styles.chartEmptyBtn, { backgroundColor: colors.primary + "15" }]}
                >
                  <Text style={[styles.chartEmptyBtnText, { color: colors.primary }]}>Upload Report</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>

        {/* ── AI Insights ── */}
        <Animated.View entering={entranceFade(7)} style={[styles.aiInsightsCard, { backgroundColor: colors.card, ...colors.shadow.soft }]}>
          <LinearGradient
            colors={[colors.primary + "10", colors.purple + "06"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.aiHeader}>
            <View style={[styles.aiIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.aiTitle, { color: colors.foreground }]}>AI Insights</Text>
            <View style={{ flex: 1 }} />
            {insightsLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : insightsExpanded && hasInsights
                ? (
                  <TouchableOpacity
                    onPress={handleLoadInsights}
                    style={[styles.refreshBtn, { backgroundColor: colors.primary + "15" }]}
                  >
                    <Ionicons name="refresh" size={14} color={colors.primary} />
                    <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
                  </TouchableOpacity>
                )
                : !insightsExpanded
                  ? (
                    <TouchableOpacity
                      onPress={handleLoadInsights}
                      style={[styles.refreshBtn, { backgroundColor: colors.primary + "15" }]}
                    >
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                      <Text style={[styles.refreshText, { color: colors.primary }]}>Generate</Text>
                    </TouchableOpacity>
                  ) : null
            }
          </View>

          {insightsExpanded && hasInsights ? (
            <>
              {aiInsights.insights.map((insight, i) => (
                <View key={i} style={styles.insightRow}>
                  <View style={[styles.insightDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
                </View>
              ))}
              {aiInsights.weeklyGoal && (
                <View style={[styles.weeklyGoalPill, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                  <Ionicons name="flag-outline" size={12} color={colors.primary} />
                  <Text style={[styles.weeklyGoalText, { color: colors.primary }]}>{aiInsights.weeklyGoal}</Text>
                </View>
              )}
            </>
          ) : insightsExpanded && !hasInsights ? (
            <View style={styles.insightRow}>
              <Text style={[styles.insightText, { color: colors.mutedForeground }]}>
                Log workouts, check-ins, and weight to unlock AI-powered insights.
              </Text>
            </View>
          ) : (
            <Text style={[styles.insightText, { color: colors.mutedForeground }]}>
              Tap "Generate" to get personalised AI analysis of your progress.
            </Text>
          )}
        </Animated.View>

        {/* ── Achievements ── */}
        <Animated.Text entering={entranceFade(8)} style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Animated.Text>
        {hasAchievements ? (
          <View style={styles.achieveGrid}>
            {allBadges.map((badge: any) => (
              <View
                key={badge.id ?? badge.label ?? badge.name}
                style={[styles.achieveCard, { backgroundColor: colors.card, ...colors.shadow.soft, opacity: badge.unlocked ? 1 : 0.45 }]}
              >
                <View style={[styles.achieveIcon, { backgroundColor: badge.unlocked ? badge.color + "18" : colors.muted }]}>
                  <Ionicons name={badge.icon} size={20} color={badge.unlocked ? badge.color : colors.mutedForeground} />
                </View>
                <Text style={[styles.achieveLabel, { color: badge.unlocked ? colors.foreground : colors.mutedForeground }]} numberOfLines={2}>
                  {badge.label ?? badge.name}
                </Text>
                {!badge.unlocked && <Ionicons name="lock-closed" size={10} color={colors.mutedForeground} />}
              </View>
            ))}
          </View>
        ) : (
          <EmptyCard
            icon="trophy-outline"
            title="No achievements yet."
            subtitle="Complete workouts, log check-ins, and upload InBody reports to earn your first achievement."
            colors={colors}
          />
        )}

        {/* ── Upload CTA ── */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/inbody"); }}
          activeOpacity={0.88}
          style={{ borderRadius: 20, overflow: "hidden" }}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBanner}
          >
            <Ionicons name="scan-outline" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Upload Monthly Report</Text>
              <Text style={styles.ctaSub}>Track your transformation with AI</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Check-in Modal ── */}
      <CheckinModal
        visible={checkinVisible}
        onClose={() => setCheckinVisible(false)}
        onSubmit={handleCheckin}
        hasCheckedIn={hasCheckedIn}
        existingCheckin={dashboard.recentCheckin}
      />
    </View>
  );
}

function TransformStat({ value, unit, label, color }: { value: string; unit: string; label: string; color: string }) {
  return (
    <View style={styles.transformStat}>
      <Text style={[styles.transformVal, { color }]}>{value}<Text style={styles.transformUnit}>{unit}</Text></Text>
      <Text style={styles.transformStatLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const emptyStyles = StyleSheet.create({
  card: { borderRadius: 18, padding: 20, alignItems: "center", gap: 8, borderWidth: 1 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  cta: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  ctaText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  streakText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Onboarding card
  onboardCard: { borderRadius: 20, padding: 22, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1 },
  onboardIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  onboardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  onboardSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  onboardCtas: { flexDirection: "row", gap: 10, marginTop: 6 },
  onboardBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  onboardBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Fitness Score Card
  scoreCard: { borderRadius: 20, padding: 18, overflow: "hidden" },
  scoreCardInner: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreRingWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  scoreCenter: { position: "absolute", alignItems: "center" },
  scoreNum: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  scoreMax: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: -4 },
  scoreInfo: { flex: 1, gap: 4 },
  scoreLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  scoreLabel2: { fontSize: 18, fontFamily: "Inter_700Bold" },
  breakdownList: { gap: 5, marginTop: 4 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  breakdownKey: { fontSize: 10, fontFamily: "Inter_400Regular", width: 70 },
  breakdownBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  breakdownFill: { height: 4, borderRadius: 2 },
  breakdownPts: { fontSize: 10, fontFamily: "Inter_600SemiBold", width: 22, textAlign: "right" },

  // Check-in banner
  checkinBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  checkinIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  checkinTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  checkinSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalQuestion: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  levelRow: { flexDirection: "row", gap: 10 },
  levelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  levelNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  levelCaption: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", marginTop: -6 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 16, marginTop: 4 },
  submitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  // Transformation card
  transformCard: { borderRadius: 20, padding: 20, gap: 14 },
  transformLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  transformStats: { flexDirection: "row", alignItems: "center" },
  transformStat: { flex: 1, alignItems: "center", gap: 2 },
  transformVal: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  transformUnit: { fontSize: 14, fontFamily: "Inter_500Medium" },
  transformStatLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  divider: { width: 0.5, height: 50 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Stats grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "47%", borderRadius: 16, padding: 14, gap: 6, flexGrow: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Chart
  chartCard: { borderRadius: 20, padding: 18, gap: 14 },
  chartTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  chartCurrVal: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  chartDiffRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  chartDiff: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chartDisclaimer: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
    marginTop: 4,
    maxWidth: 220,
  },
  periodRow: { flexDirection: "row", gap: 4 },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: "#F3F4F6" },
  periodText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  modeTabs: { flexDirection: "row", gap: 6 },
  weightSourceRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  weightSourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  weightSourceText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  modeTab: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "#F0F0F2", alignItems: "center" },
  modeTabText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  xLabels: { flexDirection: "row", justifyContent: "space-between" },
  xLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  chartEmpty: { height: 120, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
  chartEmptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  chartEmptyBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  chartEmptyBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // AI Insights
  aiInsightsCard: { borderRadius: 20, padding: 18, gap: 12, overflow: "hidden" },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  aiTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  refreshText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  insightRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  insightDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  insightText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },
  weeklyGoalPill: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  weeklyGoalText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },

  // Achievements
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: -4 },
  achieveGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  achieveCard: { width: "30%", borderRadius: 16, padding: 12, gap: 4, alignItems: "center", flexGrow: 1 },
  achieveIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  achieveLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },

  ctaBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20 },
  ctaTitle: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ctaSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
