import { TransformationTimelineInsightSheet } from "@/components/coach/TransformationTimelineInsightSheet";
import { useColors } from "@/hooks/useColors";
import type { TimelineInsight, TransformationTimelineNode } from "@/lib/coach-api";
import { hapticLight } from "@/lib/haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function alignmentTone(alignment: TimelineInsight["alignment"] | undefined, colors: ReturnType<typeof useColors>) {
  switch (alignment) {
    case "on_track":
      return colors.green;
    case "at_risk":
      return "#F59E0B";
    case "off_track":
      return colors.destructive ?? "#EF4444";
    default:
      return colors.primary;
  }
}

export function TransformationTimeline({
  nodes,
  insight,
  compact = false,
  accent,
}: {
  nodes: TransformationTimelineNode[];
  insight?: TimelineInsight | null;
  compact?: boolean;
  accent?: string;
}) {
  const colors = useColors();
  const accentColor = accent ?? colors.primary;
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!nodes.length) {
    return (
      <Text style={[styles.empty, { color: colors.mutedForeground }]}>
        Log weight and workouts to unlock your transformation timeline.
      </Text>
    );
  }

  const tone = alignmentTone(insight?.alignment, colors);

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Transformation Timeline</Text>
        <TouchableOpacity
          onPress={() => {
            void hapticLight();
            setSheetOpen(true);
          }}
          style={[styles.infoBtn, { backgroundColor: tone + "15", borderColor: tone + "35" }]}
          hitSlop={8}
        >
          <Ionicons name="information-circle" size={16} color={tone} />
          <Text style={[styles.infoBtnText, { color: tone }]}>Explain</Text>
        </TouchableOpacity>
      </View>

      {insight ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            void hapticLight();
            setSheetOpen(true);
          }}
          style={[styles.insightBanner, { backgroundColor: tone + "10", borderColor: tone + "30" }]}
        >
          <Ionicons
            name={
              insight.alignment === "on_track"
                ? "checkmark-circle"
                : insight.alignment === "need_data"
                  ? "help-circle"
                  : "warning"
            }
            size={18}
            color={tone}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.insightHeadline, { color: colors.foreground }]} numberOfLines={2}>
              {insight.headline}
            </Text>
            <Text style={[styles.insightSub, { color: colors.mutedForeground }]}>
              {insight.goalLabel} · Tap for full breakdown
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tone} />
        </TouchableOpacity>
      ) : null}

      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1;
        const isNow = node.horizon === "now";
        return (
          <View key={node.horizon} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isNow ? accentColor : colors.card,
                    borderColor: isNow ? accentColor : colors.border,
                  },
                ]}
              >
                {isNow ? <Ionicons name="person" size={12} color="#fff" /> : null}
              </View>
              {!isLast ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
            </View>
            <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: isNow ? accentColor : colors.foreground }]}>{node.label}</Text>
              {!compact ? (
                <>
                  <Text style={[styles.metric, { color: colors.foreground }]}>
                    Weight: {node.weightKg != null ? `${node.weightKg} kg` : "—"}
                  </Text>
                  <Text style={[styles.metric, { color: colors.mutedForeground }]}>
                    Body fat: {node.bodyFatPct != null ? `${node.bodyFatPct}%` : "—"} · Score: {node.activityScore}
                  </Text>
                  <Text style={[styles.stage, { color: accentColor }]}>{node.journeyStage}</Text>
                </>
              ) : (
                <Text style={[styles.metricCompact, { color: colors.mutedForeground }]}>
                  {node.weightKg != null ? `${node.weightKg} kg` : "—"} · {node.activityScore} pts
                </Text>
              )}
            </View>
          </View>
        );
      })}

      <TransformationTimelineInsightSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        insight={insight ?? null}
        accent={accentColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  infoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  infoBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  insightBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  insightHeadline: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  insightSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  row: { flexDirection: "row", gap: 12 },
  rail: { width: 24, alignItems: "center" },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  line: { width: 2, flex: 1, minHeight: 28, marginTop: 4 },
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12, gap: 4 },
  label: { fontSize: 14, fontFamily: "Inter_700Bold" },
  metric: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metricCompact: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stage: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
