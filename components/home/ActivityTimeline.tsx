import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface TimelineEvent {
  id: string;
  timeLabel: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface ActivityTimelineProps {
  title?: string;
  events: TimelineEvent[];
  emptyMessage?: string;
  /** Collapse to N items with expand toggle */
  maxVisible?: number;
}

export function ActivityTimeline({
  title = "Today's Activity",
  events,
  emptyMessage = "Log meals, water, or a workout to build your timeline.",
  maxVisible,
}: ActivityTimelineProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const canCollapse = maxVisible != null && events.length > maxVisible;
  const visibleEvents = canCollapse && !expanded ? events.slice(0, maxVisible) : events;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Text style={[colors.typography.h3, { color: colors.foreground }]}>{title}</Text>
        {canCollapse ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setExpanded((v) => !v);
            }}
            hitSlop={8}
          >
            <Text style={[colors.typography.caption, { color: colors.primary }]}>
              {expanded ? "Show less" : `+${events.length - maxVisible!} more`}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {events.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.muted }]}>
          <Ionicons name="time-outline" size={20} color={colors.mutedForeground} />
          <Text style={[colors.typography.caption, { color: colors.mutedForeground, flex: 1 }]}>
            {emptyMessage}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleEvents.map((event, index) => {
            const isLast = index === visibleEvents.length - 1;
            return (
              <View key={event.id} style={styles.row}>
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: event.color, borderColor: colors.background }]} />
                  {!isLast ? (
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                  ) : null}
                </View>
                <View style={[styles.iconWrap, { backgroundColor: event.color + "18" }]}>
                  <Ionicons name={event.icon} size={16} color={event.color} />
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={[colors.typography.bodyMedium, { color: colors.foreground, flex: 1 }]}>
                      {event.title}
                    </Text>
                    <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{event.timeLabel}</Text>
                  </View>
                  {event.subtitle ? (
                    <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 2 }]}>
                      {event.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  empty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    minHeight: 52,
  },
  rail: {
    width: 12,
    alignItems: "center",
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginTop: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  body: {
    flex: 1,
    paddingBottom: 14,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
});
