import { useColors } from "@/hooks/useColors";
import type { DailyActivityDay } from "@/lib/coach-api";
import { hapticLight } from "@/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Colors = ReturnType<typeof useColors>;

export function CoachSection({
  title,
  subtitle,
  children,
  colors,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  colors: Colors;
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {title ? <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text> : null}
      {subtitle ? (
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

export function StatRow({ label, value, colors }: { label: string; value: string; colors: Colors }) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

export function BulletList({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: color }]} />
          <Text style={[styles.bulletText, { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function MetricPills({
  items,
  colors,
  accent,
}: {
  items: Array<{ label: string; value: string; icon?: keyof typeof Ionicons.glyphMap }>;
  colors: Colors;
  accent: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
      {items.map((item) => (
        <View key={item.label} style={[styles.pill, { backgroundColor: accent + "12", borderColor: accent + "30" }]}>
          {item.icon ? <Ionicons name={item.icon} size={14} color={accent} /> : null}
          <Text style={[styles.pillValue, { color: colors.foreground }]}>{item.value}</Text>
          <Text style={[styles.pillLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function DayActivityCarousel({
  days,
  colors,
  accent,
}: {
  days: DailyActivityDay[];
  colors: Colors;
  accent?: string;
}) {
  const accentColor = accent ?? colors.primary;

  const defaultDate = React.useMemo(() => {
    if (!days.length) return null;
    const withActivity = [...days].reverse().find((d) => d.activitiesLogged.length > 0);
    if (withActivity) return withActivity.date;
    const today = new Date().toISOString().slice(0, 10);
    return days.find((d) => d.date === today)?.date ?? days[0].date;
  }, [days]);

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!days.length) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate((prev) => {
      if (prev && days.some((d) => d.date === prev)) return prev;
      return defaultDate;
    });
  }, [days, defaultDate]);

  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  return (
    <View style={styles.dayCarouselWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayCarousel}>
        {days.map((day) => {
          const active = day.activitiesLogged.length > 0;
          const selected = day.date === selectedDate;
          return (
            <TouchableOpacity
              key={day.date}
              activeOpacity={0.75}
              onPress={() => {
                void hapticLight();
                setSelectedDate(day.date);
              }}
              style={[
                styles.dayCard,
                {
                  backgroundColor: selected
                    ? accentColor + "22"
                    : active
                      ? accentColor + "10"
                      : colors.background,
                  borderColor: selected ? accentColor : active ? accentColor + "35" : colors.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayShort,
                  { color: selected || active ? accentColor : colors.mutedForeground },
                ]}
              >
                {day.dayLabel.split(" ")[0]?.slice(0, 3) ?? day.dayLabel}
              </Text>
              <View
                style={[
                  styles.dayDot,
                  { backgroundColor: active || selected ? accentColor : colors.border },
                ]}
              />
              {day.workoutCompleted ? (
                <Ionicons name="barbell" size={12} color={accentColor} style={{ marginTop: 6 }} />
              ) : (
                <Text style={[styles.daySteps, { color: colors.mutedForeground }]}>
                  {day.steps > 0 ? `${Math.round(day.steps / 1000)}k` : "—"}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedDay ? <DayActivityDetail day={selectedDay} colors={colors} accent={accentColor} /> : null}
    </View>
  );
}

function DayActivityDetail({
  day,
  colors,
  accent,
}: {
  day: DailyActivityDay;
  colors: Colors;
  accent: string;
}) {
  const hasData = day.activitiesLogged.length > 0 || day.workoutCompleted;

  return (
    <View style={[styles.dayDetail, { backgroundColor: colors.card, borderColor: accent + "35" }]}>
      <View style={styles.dayDetailHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dayDetailTitle, { color: colors.foreground }]}>{day.dayLabel}</Text>
          <Text style={[styles.dayDetailDate, { color: colors.mutedForeground }]}>{day.date}</Text>
        </View>
        {day.workoutCompleted ? (
          <View style={[styles.dayDetailBadge, { backgroundColor: accent + "18" }]}>
            <Ionicons name="barbell" size={13} color={accent} />
            <Text style={[styles.dayDetailBadgeText, { color: accent }]}>Workout</Text>
          </View>
        ) : null}
      </View>

      {hasData ? (
        <>
          <View style={styles.dayDetailGrid}>
            <DayDetailMetric icon="footsteps" label="Steps" value={day.steps > 0 ? day.steps.toLocaleString() : "—"} colors={colors} accent={accent} />
            <DayDetailMetric icon="flame" label="Burned" value={day.caloriesBurned > 0 ? `${day.caloriesBurned} kcal` : "—"} colors={colors} accent={accent} />
            <DayDetailMetric icon="restaurant" label="Consumed" value={day.caloriesConsumed > 0 ? `${day.caloriesConsumed} kcal` : "—"} colors={colors} accent={accent} />
            <DayDetailMetric icon="water" label="Water" value={day.waterGlasses > 0 ? `${day.waterGlasses} glasses` : "—"} colors={colors} accent={accent} />
            <DayDetailMetric icon="moon" label="Sleep" value={day.sleepHours > 0 ? `${day.sleepHours}h` : "—"} colors={colors} accent={accent} />
            <DayDetailMetric icon="scale" label="Weight" value={day.weightKg != null ? `${day.weightKg} kg` : "—"} colors={colors} accent={accent} />
          </View>

          {day.activitiesLogged.length > 0 ? (
            <View style={styles.dayDetailTags}>
              <Text style={[styles.dayDetailTagsLabel, { color: colors.mutedForeground }]}>Logged</Text>
              <View style={styles.activityTagRow}>
                {day.activitiesLogged.map((tag) => (
                  <View key={tag} style={[styles.activityTag, { backgroundColor: accent + "14", borderColor: accent + "30" }]}>
                    <Text style={[styles.activityTagText, { color: colors.foreground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={[styles.dayDetailEmpty, { backgroundColor: colors.background }]}>
          <Ionicons name="calendar-outline" size={22} color={colors.mutedForeground} />
          <Text style={[styles.dayDetailEmptyText, { color: colors.mutedForeground }]}>
            No activity logged this day
          </Text>
        </View>
      )}
    </View>
  );
}

function DayDetailMetric({
  icon,
  label,
  value,
  colors,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: Colors;
  accent: string;
}) {
  return (
    <View style={[styles.dayDetailMetric, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={accent} />
      <Text style={[styles.dayDetailMetricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.dayDetailMetricValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function CollapsibleSection({
  title,
  children,
  colors,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  colors: Colors;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={[styles.collapsible, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        onPress={() => {
          void hapticLight();
          setOpen((v) => !v);
        }}
        style={styles.collapsibleHeader}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>{title}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </View>
  );
}

export function GoalProgressBar({
  pct,
  message,
  confidence,
  colors,
  estimatedWeeks,
}: {
  pct: number;
  message: string;
  confidence?: string;
  estimatedWeeks?: number | null;
  colors: Colors;
}) {
  return (
    <View style={styles.goalBlock}>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: colors.primary }]}
        />
      </View>
      <Text style={[styles.progressPct, { color: colors.primary }]}>
        {pct}%{confidence ? ` · ${confidence} confidence` : ""}
      </Text>
      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{message}</Text>
      {estimatedWeeks != null ? (
        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Est. {estimatedWeeks} weeks to goal</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  sectionHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 4 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  statLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  statValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right", flex: 1.2 },
  bulletList: { gap: 8 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  pillRow: { gap: 10, paddingVertical: 2 },
  pill: {
    minWidth: 96,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  pillValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pillLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dayCarousel: { gap: 10, paddingVertical: 4 },
  dayCarouselWrap: { gap: 12 },
  dayCard: {
    width: 64,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  dayShort: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  daySteps: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 6 },
  dayDetail: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  dayDetailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dayDetailTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  dayDetailDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  dayDetailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dayDetailBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dayDetailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayDetailMetric: {
    width: "31%",
    flexGrow: 1,
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  dayDetailMetricLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
  dayDetailMetricValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  dayDetailTags: { gap: 8 },
  dayDetailTagsLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  activityTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  activityTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  activityTagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dayDetailEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
    borderRadius: 14,
  },
  dayDetailEmptyText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  collapsible: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  collapsibleBody: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  goalBlock: { gap: 8 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressPct: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
