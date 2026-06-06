import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import { feetInchesToCm, lbToKg } from "@/lib/units";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type WeightUnit = "kg" | "lb";
type HeightUnit = "cm" | "ft";

export interface MeasurementSubmitPayload {
  weightKg?: number;
  weightLb?: number;
  heightCm?: number;
  heightFeet?: number;
  heightInches?: number;
  waistCm: number;
  chestCm: number;
}

interface Props {
  onSubmit: (payload: MeasurementSubmitPayload) => Promise<void>;
  onBack: () => void;
  loading?: boolean;
}

export default function MeasurementWizard({ onSubmit, onBack, loading }: Props) {
  const colors = useColors();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [weight, setWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [waist, setWaist] = useState("");
  const [chest, setChest] = useState("");

  const handleSubmit = async () => {
    const w = parseFloat(weight);
    const waistCm = parseFloat(waist);
    const chestCm = parseFloat(chest) || 0;

    if (!w || w <= 0 || !waistCm || waistCm <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    let payload: MeasurementSubmitPayload = { waistCm, chestCm };

    if (weightUnit === "kg") {
      payload.weightKg = w;
    } else {
      payload.weightLb = w;
      payload.weightKg = lbToKg(w);
    }

    if (heightUnit === "cm") {
      const h = parseFloat(heightCm);
      if (!h || h <= 0) return;
      payload.heightCm = h;
    } else {
      const ft = parseFloat(heightFeet);
      const inch = parseFloat(heightInches) || 0;
      if (!ft || ft <= 0) return;
      payload.heightFeet = ft;
      payload.heightInches = inch;
      payload.heightCm = feetInchesToCm(ft, inch);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onSubmit(payload);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <GlassCard style={{ ...styles.disclaimer, borderColor: "#F59E0B50" }}>
        <Ionicons name="information-circle-outline" size={18} color="#F59E0B" />
        <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
          Estimates are approximate and not clinically accurate. For precise analysis, use an InBody scan.
        </Text>
      </GlassCard>

      <UnitSection
        label="Weight"
        unit={weightUnit}
        units={["kg", "lb"]}
        onUnitChange={(u) => setWeightUnit(u as WeightUnit)}
        colors={colors}
      >
        <TextInput
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder={weightUnit === "kg" ? "e.g. 72.5" : "e.g. 160"}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
        />
      </UnitSection>

      <UnitSection
        label="Height"
        unit={heightUnit}
        units={["cm", "ft"]}
        onUnitChange={(u) => setHeightUnit(u as HeightUnit)}
        colors={colors}
      >
        {heightUnit === "cm" ? (
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            placeholder="e.g. 175"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
          />
        ) : (
          <View style={styles.rowInputs}>
            <TextInput
              value={heightFeet}
              onChangeText={setHeightFeet}
              keyboardType="number-pad"
              placeholder="ft"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.halfInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            />
            <TextInput
              value={heightInches}
              onChangeText={setHeightInches}
              keyboardType="number-pad"
              placeholder="in"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.halfInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            />
          </View>
        )}
      </UnitSection>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Waist (cm)</Text>
        <TextInput
          value={waist}
          onChangeText={setWaist}
          keyboardType="decimal-pad"
          placeholder="e.g. 82"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Chest (cm)</Text>
        <TextInput
          value={chest}
          onChangeText={setChest}
          keyboardType="decimal-pad"
          placeholder="e.g. 96"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="analytics-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Estimate Composition</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function UnitSection({
  label,
  unit,
  units,
  onUnitChange,
  colors,
  children,
}: {
  label: string;
  unit: string;
  units: string[];
  onUnitChange: (u: string) => void;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
        <View style={[styles.unitRow, { backgroundColor: colors.muted }]}>
          {units.map((u) => (
            <TouchableOpacity
              key={u}
              onPress={() => onUnitChange(u)}
              style={[styles.unitChip, unit === u && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.unitChipText, { color: unit === u ? "#fff" : colors.mutedForeground }]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 40 },
  disclaimer: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderWidth: 1, padding: 12 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  field: { gap: 8 },
  fieldHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  unitRow: { flexDirection: "row", borderRadius: 8, padding: 2 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  unitChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_500Medium", fontSize: 16 },
  rowInputs: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  submitBtn: { flex: 2, flexDirection: "row", gap: 8, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
