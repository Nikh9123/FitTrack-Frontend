import { JournalChartSkeleton } from "@/components/skeletons/JournalChartSkeleton";
import { AnimatedHistoryBar } from "@/components/progress/AnimatedHistoryBar";
import { MetricIllustration } from "@/components/progress/MetricIllustration";
import { InsightCard } from "@/components/ui/InsightCard";
import { useColors } from "@/hooks/useColors";
import type { HistoryDayBucket, HistoryInsightDto, HistoryPeriod } from "@/lib/progress-history-api";
import { Ionicons } from "@expo/vector-icons";
import { hapticSelection } from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { entranceFade } from "@/constants/animations";
import Animated from "react-native-reanimated";

type JournalMetric = "steps" | "calories" | "water" | "sleep" | "weight";

export type { JournalMetric };

const PERIODS: { key: HistoryPeriod; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
];

const METRICS: {
  key: JournalMetric;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: "primary" | "green" | "cyan" | "purple" | "yellow";
  emptyHint: string;
}[] = [
  { key: "steps", label: "Steps", icon: "footsteps", colorKey: "primary", emptyHint: "Sync steps or walk more to fill this chart." },
  { key: "calories", label: "Calories", icon: "flame", colorKey: "green", emptyHint: "Log meals to balance your daily intake." },
  { key: "water", label: "Water", icon: "water", colorKey: "cyan", emptyHint: "Track water glasses to stay hydrated." },
  { key: "sleep", label: "Sleep", icon: "moon", colorKey: "purple", emptyHint: "Log check-ins with sleep hours to see trends." },
  { key: "weight", label: "Weight", icon: "scale", colorKey: "yellow", emptyHint: "Log weight on Home or Progress to see your trend." },
];

function metricValue(bucket: HistoryDayBucket, metric: JournalMetric): number {
  switch (metric) {
    case "steps":
      return bucket.steps;
    case "calories":
      return bucket.caloriesConsumed;
    case "water":
      return bucket.waterGlasses;
    case "sleep":
      return bucket.sleepHours;
    case "weight":
      return bucket.weightKg ?? 0;
  }
}

function formatFullDate(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatMetricDisplay(bucket: HistoryDayBucket, metric: JournalMetric): string {
  switch (metric) {
    case "steps":
      return bucket.steps > 0 ? `${bucket.steps.toLocaleString()} steps` : "No steps logged";
    case "calories":
      return bucket.caloriesConsumed > 0
        ? `${Math.round(bucket.caloriesConsumed).toLocaleString()} kcal eaten`
        : "No meals logged";
    case "water":
      return bucket.waterGlasses > 0
        ? `${bucket.waterGlasses} glass${bucket.waterGlasses === 1 ? "" : "es"} (${bucket.waterMl} ml)`
        : "No water logged";
    case "sleep":
      return bucket.sleepHours > 0 ? `${bucket.sleepHours}h sleep` : "No sleep logged";
    case "weight":
      return bucket.weightKg != null ? `${bucket.weightKg.toFixed(1)} kg` : "No weight logged";
  }
}

function formatBarValue(bucket: HistoryDayBucket, metric: JournalMetric): string {
  switch (metric) {
    case "steps":
      return bucket.steps >= 1000 ? `${(bucket.steps / 1000).toFixed(1)}k` : String(bucket.steps);
    case "calories":
      return bucket.caloriesConsumed >= 1000
        ? `${(bucket.caloriesConsumed / 1000).toFixed(1)}k`
        : bucket.caloriesConsumed > 0
          ? String(Math.round(bucket.caloriesConsumed))
          : "—";
    case "water":
      return bucket.waterGlasses > 0 ? String(bucket.waterGlasses) : "—";
    case "sleep":
      return bucket.sleepHours > 0 ? `${bucket.sleepHours}h` : "—";
    case "weight":
      return bucket.weightKg != null ? bucket.weightKg.toFixed(1) : "—";
  }
}

function hasMetricData(bucket: HistoryDayBucket, metric: JournalMetric): boolean {
  switch (metric) {
    case "steps":
      return bucket.steps > 0;
    case "calories":
      return bucket.caloriesConsumed > 0;
    case "water":
      return bucket.waterGlasses > 0;
    case "sleep":
      return bucket.sleepHours > 0;
    case "weight":
      return bucket.weightKg != null;
  }
}

function insightMatchesMetric(ins: HistoryInsightDto, metric: JournalMetric): boolean {
  if (ins.metric === "general" || ins.id === "start") return false;
  switch (metric) {
    case "steps":
      return ins.metric === "steps" || ins.id === "steps";
    case "calories":
      return ins.metric === "calories" || ins.metric === "nutrition" || ins.id === "calories";
    case "water":
      return ins.metric === "water" || ins.metric === "hydration" || ins.id === "water";
    case "sleep":
      return ins.metric === "sleep" || ins.id === "sleep";
    case "weight":
      return ins.metric === "weight" || ins.id === "weight";
  }
}

const METRIC_FALLBACK_TIPS: Record<JournalMetric, string> = {
  steps: "Keep syncing steps to compare this period with the last one.",
  calories: "Log meals daily to see how your intake shifts over time.",
  water: "Track water glasses to spot hydration trends week over week.",
  sleep: "Log check-ins with sleep hours to unlock recovery insights.",
  weight: "Log weight regularly to see how your trend compares across periods.",
};

interface FitnessJournalProps {
  period: HistoryPeriod;
  onPeriodChange: (p: HistoryPeriod) => void;
  metric: JournalMetric;
  onMetricChange: (m: JournalMetric) => void;
  buckets: HistoryDayBucket[];
  insights: HistoryInsightDto[];
  loading?: boolean;
  lastSyncedAt?: string | null;
}

export function FitnessJournal({
  period,
  onPeriodChange,
  metric,
  onMetricChange,
  buckets,
  insights,
  loading,
  lastSyncedAt,
}: FitnessJournalProps) {
  const colors = useColors();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeMeta = METRICS.find((m) => m.key === metric)!;
  const color = colors[activeMeta.colorKey];

  useEffect(() => {
    setSelectedDate(null);
  }, [metric, period, buckets]);

  const displayBuckets = buckets.length > 14 ? buckets.slice(-14) : buckets;
  const displayValues = displayBuckets.map((b) => metricValue(b, metric));
  const displayMax = Math.max(...displayValues, 1);
  const isEmpty =
    !loading &&
    (metric === "weight"
      ? displayBuckets.every((b) => b.weightKg == null)
      : displayValues.every((v) => v === 0));
  const chartAnimKey = loading
    ? `${metric}-${period}-loading`
    : `${metric}-${period}-${displayValues.join(",")}`;

  const metricInsights = insights.filter((ins) => insightMatchesMetric(ins, metric));
  const selectedBucket = selectedDate ? displayBuckets.find((b) => b.date === selectedDate) : null;
  const periodAverage = useMemo(() => {
    const vals = displayBuckets
      .map((b) => (metric === "weight" ? b.weightKg ?? 0 : metricValue(b, metric)))
      .filter((v) => v > 0);
    if (!vals.length) return 0;
    return vals.reduce((sum, v) => sum + v, 0) / vals.length;
  }, [displayBuckets, metric]);

  return (
    <Animated.View entering={entranceFade(2)} style={styles.outer}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient
          colors={[color + "12", colors.purple + "06", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={[styles.titleIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="journal-outline" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>Fitness Journal</Text>
              {metric === "steps" && lastSyncedAt && (
                <Text style={[styles.syncHint, { color: colors.mutedForeground }]}>
                  Synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => {
                  void hapticSelection();
                  onPeriodChange(p.key);
                }}
                style={[
                  styles.periodBtn,
                  { backgroundColor: period === p.key ? colors.primary : colors.muted },
                ]}
              >
                <Text style={[styles.periodText, { color: period === p.key ? "#fff" : colors.mutedForeground }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.metricRow}>
          {METRICS.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => {
                void hapticSelection();
                onMetricChange(m.key);
              }}
              style={[
                styles.metricChip,
                {
                  borderColor: metric === m.key ? colors[m.colorKey] : colors.border,
                  backgroundColor: metric === m.key ? colors[m.colorKey] + "18" : colors.muted,
                },
              ]}
            >
              <Ionicons
                name={m.icon}
                size={14}
                color={metric === m.key ? colors[m.colorKey] : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.metricLabel,
                  { color: metric === m.key ? colors[m.colorKey] : colors.mutedForeground },
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <JournalChartSkeleton />
        ) : (
          <View key={chartAnimKey} style={styles.chartArea}>
            {isEmpty ? (
              <View style={styles.emptyScene}>
                <MetricIllustration metric={metric} color={color} animKey={chartAnimKey} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No {activeMeta.label.toLowerCase()} data for this period yet
                </Text>
                <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>{activeMeta.emptyHint}</Text>
              </View>
            ) : (
              <>
                <View style={styles.barsRow}>
                  {displayValues.map((v, i) => {
                    const bucket = displayBuckets[i];
                    const dayLabel = bucket.date.slice(5);
                    const hasWeight = metric === "weight" && bucket.weightKg != null;
                    const barValue = metric === "weight" ? (bucket.weightKg ?? 0) : v;
                    const isSelected = selectedDate === bucket.date;
                    const showValue = isSelected || (metric === "weight" && hasWeight);
                    const hasData = hasMetricData(bucket, metric);

                    return (
                      <Pressable
                        key={`${bucket.date}-${chartAnimKey}`}
                        onPress={() => {
                          void hapticSelection();
                          setSelectedDate((prev) => (prev === bucket.date ? null : bucket.date));
                        }}
                        style={({ pressed }) => [
                          styles.barColWrap,
                          isSelected && { backgroundColor: color + "14", borderRadius: 10 },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <View style={styles.barStack}>
                          {showValue ? (
                            <Text
                              style={[styles.barValue, { color: isSelected ? color : colors.mutedForeground }]}
                              numberOfLines={1}
                            >
                              {formatBarValue(bucket, metric)}
                            </Text>
                          ) : (
                            <View style={styles.barValueSpacer} />
                          )}
                          {metric === "weight" && !hasWeight ? (
                            <View
                              style={[
                                styles.barEmptyTrack,
                                { backgroundColor: colors.border },
                                isSelected && { borderWidth: 1, borderColor: color },
                              ]}
                            />
                          ) : (
                            <AnimatedHistoryBar
                              value={barValue}
                              max={displayMax}
                              color={color}
                              index={i}
                              trackColor={colors.border}
                              animKey={chartAnimKey}
                              highlighted={isSelected}
                              dimmed={!hasData && !isSelected}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.barLabel,
                            { color: isSelected ? color : colors.mutedForeground },
                            isSelected && { fontFamily: "Inter_700Bold" },
                          ]}
                          numberOfLines={1}
                        >
                          {dayLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {selectedBucket ? (
                  <View style={[styles.selectedDetail, { backgroundColor: color + "12", borderColor: color + "40" }]}>
                    <Text style={[styles.selectedDate, { color: colors.foreground }]}>
                      {formatFullDate(selectedBucket.date)}
                    </Text>
                    <Text style={[styles.selectedValue, { color }]}>
                      {formatMetricDisplay(selectedBucket, metric)}
                    </Text>
                    {periodAverage > 0 ? (
                      <Text style={[styles.selectedSub, { color: colors.mutedForeground }]}>
                        {(() => {
                          const current =
                            metric === "weight"
                              ? selectedBucket.weightKg ?? 0
                              : metricValue(selectedBucket, metric);
                          const diff = current - periodAverage;
                          const pct = periodAverage > 0 ? (diff / periodAverage) * 100 : 0;
                          const sign = diff >= 0 ? "+" : "";
                          return `${sign}${Math.round(diff)} vs avg · ${sign}${pct.toFixed(0)}% trend`;
                        })()}
                      </Text>
                    ) : null}
                    {metric === "calories" && selectedBucket.proteinG > 0 ? (
                      <Text style={[styles.selectedSub, { color: colors.mutedForeground }]}>
                        {Math.round(selectedBucket.proteinG)}g protein
                      </Text>
                    ) : null}
                    {metric === "steps" && selectedBucket.caloriesBurned > 0 ? (
                      <Text style={[styles.selectedSub, { color: colors.mutedForeground }]}>
                        {Math.round(selectedBucket.caloriesBurned).toLocaleString()} kcal burned
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
                    Tap a bar to see that day's logged data
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {metricInsights.length > 0 ? (
          <View style={styles.insightsBlock}>
            {metricInsights.slice(0, 2).map((ins) => (
              <InsightCard
                key={`${ins.id}-${metric}-${chartAnimKey}`}
                message={ins.message}
                trend={ins.trend}
              />
            ))}
          </View>
        ) : (
          <InsightCard
            message={METRIC_FALLBACK_TIPS[metric]}
            variant="tip"
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { overflow: "hidden" },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14, overflow: "hidden" },
  headerRow: { gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  syncHint: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  periodRow: { flexDirection: "row", gap: 6 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  periodText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  chartArea: { gap: 10 },
  emptyScene: { alignItems: "center", gap: 6, paddingVertical: 4 },
  emptyTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17, paddingHorizontal: 12 },
  barsRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 3, paddingTop: 4 },
  barColWrap: { flex: 1, alignItems: "center", gap: 6, minWidth: 0, maxWidth: 36, paddingVertical: 4, paddingHorizontal: 2 },
  barStack: { alignItems: "center", width: "100%" },
  barValue: { fontSize: 8, fontFamily: "Inter_700Bold", height: 10, marginBottom: 2 },
  barValueSpacer: { height: 10, marginBottom: 2 },
  barEmptyTrack: { height: 88, width: "80%", borderRadius: 6, opacity: 0.35 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 2 },
  tapHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 2 },
  selectedDetail: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 2,
  },
  selectedDate: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  selectedValue: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  selectedSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  insightsBlock: { gap: 8 },
});
