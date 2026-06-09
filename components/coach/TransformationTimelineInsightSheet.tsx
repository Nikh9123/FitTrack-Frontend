import { useColors } from "@/hooks/useColors";
import type { TimelineInsight, TimelineInsightCard } from "@/lib/coach-api";
import { hapticLight, hapticSelection } from "@/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function alignmentColors(
  alignment: TimelineInsight["alignment"],
  colors: ReturnType<typeof useColors>,
) {
  switch (alignment) {
    case "on_track":
      return { bg: colors.green + "18", fg: colors.green, icon: "checkmark-circle" as const };
    case "at_risk":
      return { bg: "#F59E0B18", fg: "#F59E0B", icon: "alert-circle" as const };
    case "off_track":
      return { bg: (colors.destructive ?? "#EF4444") + "18", fg: colors.destructive ?? "#EF4444", icon: "close-circle" as const };
    default:
      return { bg: colors.primary + "15", fg: colors.primary, icon: "help-circle" as const };
  }
}

function InsightCardView({
  card,
  colors,
  accent,
}: {
  card: TimelineInsightCard;
  colors: ReturnType<typeof useColors>;
  accent: string;
}) {
  const iconName = card.icon as keyof typeof Ionicons.glyphMap;
  return (
    <View style={[styles.cardPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.cardIconWrap, { backgroundColor: accent + "15" }]}>
        <Ionicons name={iconName} size={22} color={accent} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
      {card.highlight ? (
        <View style={[styles.highlightBox, { backgroundColor: accent + "12", borderColor: accent + "30" }]}>
          <Text style={[styles.highlightText, { color: accent }]}>{card.highlight}</Text>
        </View>
      ) : null}
      <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{card.body}</Text>
    </View>
  );
}

export function TransformationTimelineInsightSheet({
  visible,
  onClose,
  insight,
  accent,
}: {
  visible: boolean;
  onClose: () => void;
  insight: TimelineInsight | null;
  accent?: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const accentColor = accent ?? colors.primary;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (visible) setStep(0);
  }, [visible, insight?.headline]);

  if (!insight) return null;

  const align = alignmentColors(insight.alignment, colors);
  const cards = insight.cards;
  const totalSteps = cards.length;
  const currentCard = cards[step];

  const goNext = () => {
    void hapticSelection();
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };
  const goPrev = () => {
    void hapticSelection();
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <LinearGradient
            colors={[accentColor + "14", colors.card]}
            style={[styles.sheetHero, { borderBottomColor: colors.border }]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Timeline explained</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.alignBadge, { backgroundColor: align.bg }]}>
              <Ionicons name={align.icon} size={16} color={align.fg} />
              <Text style={[styles.alignText, { color: align.fg }]}>{insight.alignmentLabel}</Text>
            </View>
            <Text style={[styles.headline, { color: colors.foreground }]}>{insight.headline}</Text>
            <Text style={[styles.goalChip, { color: accentColor }]}>
              Goal: {insight.goalLabel} · Live · last 14 days
            </Text>
          </LinearGradient>

          <View style={styles.stepRow}>
            {cards.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => {
                  void hapticLight();
                  setStep(i);
                }}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: i === step ? accentColor : colors.border,
                    width: i === step ? 22 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardScrollContent} showsVerticalScrollIndicator={false}>
            {currentCard ? <InsightCardView card={currentCard} colors={colors} accent={accentColor} /> : null}

            <View style={[styles.metricsGrid, { borderColor: colors.border }]}>
              <Text style={[styles.metricsTitle, { color: colors.foreground }]}>Live metrics (last 14 days)</Text>
              {insight.liveMetrics.currentWeightKg != null ? (
                <Text style={[styles.metricsSub, { color: colors.mutedForeground }]}>
                  Current weight {insight.liveMetrics.currentWeightKg} kg · BMR {insight.liveMetrics.bmrDaily.toLocaleString()} kcal · TDEE est. {insight.liveMetrics.estimatedTdee.toLocaleString()} kcal
                </Text>
              ) : (
                <Text style={[styles.metricsSub, { color: colors.mutedForeground }]}>
                  BMR {insight.liveMetrics.bmrDaily.toLocaleString()} kcal · TDEE est. {insight.liveMetrics.estimatedTdee.toLocaleString()} kcal (Mifflin–St Jeor + activity level)
                </Text>
              )}
              <View style={styles.metricsRow}>
                <MetricChip label="Intake" value={`${insight.liveMetrics.avgCaloriesConsumed} kcal`} colors={colors} />
                <MetricChip label="Total out" value={`${insight.liveMetrics.avgTotalExpenditure} kcal`} colors={colors} />
              </View>
              <View style={styles.metricsRow}>
                <MetricChip label="BMR base" value={`${insight.liveMetrics.bmrDaily} kcal`} colors={colors} />
                <MetricChip label="Activity" value={`${insight.liveMetrics.avgActivityBurn} kcal`} colors={colors} />
              </View>
              <View style={styles.metricsRow}>
                <MetricChip label="Workouts" value={`${insight.liveMetrics.avgWorkoutBurn} kcal`} colors={colors} />
                <MetricChip
                  label="Net balance"
                  value={`${insight.liveMetrics.avgNetEnergyBalance > 0 ? "−" : "+"}${Math.abs(insight.liveMetrics.avgNetEnergyBalance)} kcal`}
                  colors={colors}
                />
              </View>
              <View style={styles.metricsRow}>
                <MetricChip label="Steps" value={insight.liveMetrics.avgSteps.toLocaleString()} colors={colors} />
                <MetricChip label="Sessions" value={String(insight.liveMetrics.workoutsLast14Days)} colors={colors} />
              </View>
            </View>

            {insight.actionItems.length > 0 ? (
              <View style={[styles.actionsBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.actionsTitle, { color: colors.foreground }]}>What to adjust</Text>
                {insight.actionItems.map((item, i) => (
                  <View key={i} style={styles.actionRow}>
                    <View style={[styles.actionBullet, { backgroundColor: accentColor }]} />
                    <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={[styles.liveNote, { color: colors.mutedForeground }]}>
              Recalculated every time you open this screen — not stored. Log today and tap refresh to update.
            </Text>
          </ScrollView>

          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={goPrev}
              disabled={step === 0}
              style={[styles.navBtn, { borderColor: colors.border, opacity: step === 0 ? 0.4 : 1 }]}
            >
              <Ionicons name="chevron-back" size={18} color={colors.foreground} />
              <Text style={[styles.navBtnText, { color: colors.foreground }]}>Back</Text>
            </TouchableOpacity>
            {step < totalSteps - 1 ? (
              <TouchableOpacity
                onPress={goNext}
                style={[styles.navBtnPrimary, { backgroundColor: accentColor }]}
              >
                <Text style={styles.navBtnPrimaryText}>Next</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} style={[styles.navBtnPrimary, { backgroundColor: accentColor }]}>
                <Text style={styles.navBtnPrimaryText}>Got it</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MetricChip({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.metricChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.metricChipLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.metricChipValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  sheetHero: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  alignBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  alignText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  headline: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  goalChip: { fontSize: 11, fontFamily: "Inter_500Medium" },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  stepDot: { height: 8, borderRadius: 4 },
  cardScroll: { maxHeight: 340 },
  cardScrollContent: { paddingHorizontal: 20, gap: 14, paddingBottom: 8 },
  cardPanel: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  highlightBox: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  highlightText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  metricsGrid: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  metricsTitle: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  metricsSub: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  metricsRow: { flexDirection: "row", gap: 8 },
  metricChip: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, gap: 2 },
  metricChipLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  metricChipValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  actionsBlock: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  actionsTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  actionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  actionBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  actionText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  liveNote: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16, textAlign: "center", paddingHorizontal: 8 },
  navRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  navBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  navBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navBtnPrimaryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
