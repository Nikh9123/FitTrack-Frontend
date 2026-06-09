import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export type DailyMetricLogVariant = "steps" | "calories";

interface DailyMetricLogModalProps {
  visible: boolean;
  variant: DailyMetricLogVariant;
  currentValue: number;
  saving?: boolean;
  onClose: () => void;
  onSaveManual: (value: number, label?: string) => Promise<void>;
  onAlternative: () => void;
  onViewDetails?: () => void;
}

const COPY: Record<
  DailyMetricLogVariant,
  {
    title: string;
    subtitle: string;
    inputLabel: string;
    placeholder: string;
    saveLabel: string;
    alternativeLabel: string;
    alternativeHint: string;
    alternativeIcon: keyof typeof Ionicons.glyphMap;
    showLabelField?: boolean;
  }
> = {
  steps: {
    title: "Log Steps",
    subtitle: "Enter your step count for today",
    inputLabel: "Steps today",
    placeholder: "e.g. 8500",
    saveLabel: "Save steps",
    alternativeLabel: "Use phone tracking",
    alternativeHint: "Count steps automatically with your phone sensors",
    alternativeIcon: "footsteps",
  },
  calories: {
    title: "Log Calories",
    subtitle: "Enter calories for a quick manual log",
    inputLabel: "Calories",
    placeholder: "e.g. 450",
    saveLabel: "Save calories",
    alternativeLabel: "Add food one by one",
    alternativeHint: "Search foods and build your meal log",
    alternativeIcon: "restaurant-outline",
    showLabelField: true,
  },
};

export function DailyMetricLogModal({
  visible,
  variant,
  currentValue,
  saving = false,
  onClose,
  onSaveManual,
  onAlternative,
  onViewDetails,
}: DailyMetricLogModalProps) {
  const colors = useColors();
  const copy = COPY[variant];
  const [valueInput, setValueInput] = useState("");
  const [labelInput, setLabelInput] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (variant === "steps" && currentValue > 0) {
      setValueInput(String(currentValue));
    } else {
      setValueInput("");
    }
    setLabelInput("");
  }, [visible, currentValue, variant]);

  const handleSave = async () => {
    const parsed =
      variant === "steps"
        ? parseInt(valueInput.replace(/,/g, ""), 10)
        : parseInt(valueInput.replace(/,/g, ""), 10);
    if (!parsed || parsed <= 0) return;
    await onSaveManual(parsed, labelInput.trim() || undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[colors.typography.h3, { color: colors.foreground }]}>{copy.title}</Text>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 4 }]}>
                {copy.subtitle}
              </Text>

              <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 16, fontFamily: "Inter_600SemiBold" }]}>
                {copy.inputLabel}
              </Text>
              <TextInput
                value={valueInput}
                onChangeText={setValueInput}
                placeholder={copy.placeholder}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                autoFocus
                style={[
                  styles.input,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input },
                ]}
              />

              {copy.showLabelField ? (
                <>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_600SemiBold" }]}>
                    Label (optional)
                  </Text>
                  <TextInput
                    value={labelInput}
                    onChangeText={setLabelInput}
                    placeholder="e.g. Lunch, Snack"
                    placeholderTextColor={colors.mutedForeground}
                    style={[
                      styles.input,
                      { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input },
                    ]}
                  />
                </>
              ) : null}

              <TouchableOpacity
                onPress={() => void handleSave()}
                disabled={saving}
                style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[colors.typography.bodyMedium, { color: "#fff" }]}>{copy.saveLabel}</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[colors.typography.caption, { color: colors.mutedForeground, paddingHorizontal: 10 }]}>
                  or
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                onPress={onAlternative}
                style={[styles.altBtn, { borderColor: colors.border, backgroundColor: colors.input }]}
              >
                <Ionicons name={copy.alternativeIcon} size={20} color={colors.primary} />
                <View style={styles.altTextWrap}>
                  <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>
                    {copy.alternativeLabel}
                  </Text>
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 2 }]}>
                    {copy.alternativeHint}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>

              {onViewDetails ? (
                <TouchableOpacity onPress={onViewDetails} style={styles.detailsLink}>
                  <Text style={[colors.typography.caption, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>View details</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity onPress={onClose} style={styles.cancelLink}>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  center: { width: "100%" },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  altBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  altTextWrap: { flex: 1 },
  detailsLink: { alignItems: "center", marginTop: 14 },
  cancelLink: { alignItems: "center", marginTop: 10 },
});
