import { useColors } from "@/hooks/useColors";
import type { MetricExplanation } from "@/lib/metrics/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface WhySectionProps {
  explanation: MetricExplanation;
}

export function WhySection({ explanation }: WhySectionProps) {
  const colors = useColors();
  const [open, setOpen] = useState(true);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
        <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground, flex: 1 }]}>
          Why am I seeing this?
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {open ? (
        <View style={styles.body}>
          <Text style={[styles.headline, { color: colors.primary }]}>{explanation.headline}</Text>

          <Block title="What it means" body={explanation.whatItMeans} />
          <Block title="Why it matters" body={explanation.whyItMatters} />
          <Block title="How it's calculated" body={explanation.howCalculated} />

          {explanation.calculationRows && explanation.calculationRows.length > 0 ? (
            <View style={[styles.calcBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.foreground }]}>Calculation breakdown</Text>
              {explanation.calculationRows.map((row) => (
                <View key={row.label} style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text
                    style={[
                      styles.calcValue,
                      { color: row.highlight ? colors.primary : colors.foreground },
                    ]}
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {explanation.influences.length > 0 ? (
            <View>
              <Text style={[styles.blockTitle, { color: colors.foreground }]}>What influences this</Text>
              {explanation.influences.map((item) => (
                <Text key={item} style={[styles.bullet, { color: colors.mutedForeground }]}>
                  • {item}
                </Text>
              ))}
            </View>
          ) : null}

          {explanation.improveTips.length > 0 ? (
            <View>
              <Text style={[styles.blockTitle, { color: colors.foreground }]}>How to improve</Text>
              {explanation.improveTips.map((tip) => (
                <Text key={tip} style={[styles.bullet, { color: colors.mutedForeground }]}>
                  • {tip}
                </Text>
              ))}
            </View>
          ) : null}

          {explanation.tooLow ? <Block title="If too low" body={explanation.tooLow} /> : null}
          {explanation.tooHigh ? <Block title="If too high" body={explanation.tooHigh} /> : null}
          {explanation.personalizedNote ? (
            <Text style={[styles.note, { color: colors.foreground, backgroundColor: colors.primary + "12" }]}>
              {explanation.personalizedNote}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  const colors = useColors();
  return (
    <View style={styles.block}>
      <Text style={[styles.blockTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.blockBody, { color: colors.mutedForeground }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  headline: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  block: { gap: 4 },
  blockTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  blockBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  bullet: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: 2 },
  calcBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  calcRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  calcLabel: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  calcValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  note: { fontSize: 12, fontFamily: "Inter_500Medium", padding: 10, borderRadius: 10, lineHeight: 17 },
});
