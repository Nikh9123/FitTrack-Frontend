import { useColors } from "@/hooks/useColors";
import { formatServingsLabel, getFoodVisual, type FoodVisual } from "@/lib/food-visuals";
import type { FoodItemDto } from "@/lib/nutrition-api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type PickedFood =
  | { kind: "catalog"; food: FoodItemDto }
  | {
      kind: "ai";
      name: string;
      caloriesKcal: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      category?: string | null;
    }
  | { kind: "custom"; name: string; caloriesKcal: number };

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface FoodQuantityPickerProps {
  visible: boolean;
  picked: PickedFood | null;
  mealType: MealType;
  onClose: () => void;
  onConfirm: (payload: {
    servings: number;
    quantityLabel: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    foodItemId?: string;
  }) => void;
}

function getBase(picked: PickedFood) {
  if (picked.kind === "catalog") {
    return {
      name: picked.food.name,
      category: picked.food.category,
      servingDescription: picked.food.servingDescription,
      calories: picked.food.calories,
      protein: picked.food.protein,
      carbs: picked.food.carbs,
      fat: picked.food.fat,
      foodItemId: picked.food.id,
    };
  }
  if (picked.kind === "ai") {
    return {
      name: picked.name,
      category: picked.category ?? "custom",
      servingDescription: "1 serving",
      calories: picked.caloriesKcal,
      protein: picked.proteinG,
      carbs: picked.carbsG,
      fat: picked.fatG,
      foodItemId: undefined,
    };
  }
  return {
    name: picked.name,
    category: "custom",
    servingDescription: "1 serving",
    calories: picked.caloriesKcal,
    protein: 0,
    carbs: 0,
    fat: 0,
    foodItemId: undefined,
  };
}

function FoodHero({ visual, size = 88 }: { visual: FoodVisual; size?: number }) {
  return (
    <LinearGradient
      colors={visual.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.heroEmoji, { fontSize: size * 0.42 }]}>{visual.emoji}</Text>
    </LinearGradient>
  );
}

export function FoodQuantityPicker({ visible, picked, mealType, onClose, onConfirm }: FoodQuantityPickerProps) {
  const colors = useColors();
  const [servings, setServings] = useState(1);

  useEffect(() => {
    if (visible) setServings(1);
  }, [visible, picked]);

  if (!picked) return null;

  const base = getBase(picked);
  const visual = getFoodVisual(base.name, base.category);
  const totalCal = Math.round(base.calories * servings);
  const totalProtein = Math.round(base.protein * servings * 10) / 10;
  const totalCarbs = Math.round(base.carbs * servings * 10) / 10;
  const totalFat = Math.round(base.fat * servings * 10) / 10;
  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  const adjust = (delta: number) => {
    Haptics.selectionAsync();
    setServings((s) => Math.max(1, Math.min(20, s + delta)));
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm({
      servings,
      quantityLabel: formatServingsLabel(servings, base.servingDescription),
      name: base.name,
      calories: totalCal,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      foodItemId: base.foodItemId,
    });
  };

  const sheet = (
    <View style={[styles.sheet, { borderColor: colors.border }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      <FoodHero visual={visual} size={96} />
      <Text style={[styles.foodName, { color: colors.foreground }]} numberOfLines={2}>
        {base.name}
      </Text>
      <Text style={[styles.perServing, { color: colors.mutedForeground }]}>
        {base.calories} kcal per {base.servingDescription ?? "serving"}
      </Text>

      <View style={[styles.stepperRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => adjust(-1)}
          disabled={servings <= 1}
          style={[styles.stepBtn, { borderColor: colors.border, opacity: servings <= 1 ? 0.4 : 1 }]}
        >
          <Ionicons name="remove" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.stepCenter}>
          <Text style={[styles.stepCount, { color: colors.foreground }]}>{servings}</Text>
          <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>
            {servings === 1 ? "serving" : "servings"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => adjust(1)}
          disabled={servings >= 20}
          style={[styles.stepBtn, { borderColor: colors.border, opacity: servings >= 20 ? 0.4 : 1 }]}
        >
          <Ionicons name="add" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.totalsCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + "40" }]}>
        <Text style={[styles.totalKcal, { color: colors.primary }]}>{totalCal} kcal</Text>
        <Text style={[styles.totalMacros, { color: colors.mutedForeground }]}>
          P {totalProtein}g · C {totalCarbs}g · F {totalFat}g
        </Text>
      </View>

      <TouchableOpacity onPress={handleConfirm} style={[styles.confirmBtn, { backgroundColor: colors.primary }]}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.confirmText}>Add {servings > 1 ? `${servings} servings` : ""} to {mealLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose}>
        <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={40} tint="dark" style={styles.blurWrap}>
              {sheet}
            </BlurView>
          ) : (
            <View style={[styles.blurWrap, { backgroundColor: colors.card + "F5" }]}>{sheet}</View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function FoodListItem({
  name,
  category,
  calories,
  protein,
  carbs,
  fat,
  onPress,
}: {
  name: string;
  category: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const visual = getFoodVisual(name, category);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.listItem, { backgroundColor: colors.muted + "80", borderColor: colors.border }]}
    >
      <FoodHero visual={visual} size={52} />
      <View style={styles.listText}>
        <Text style={[styles.listName, { color: colors.foreground }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.listMacros, { color: colors.mutedForeground }]} numberOfLines={1}>
          P {protein}g · C {carbs}g · F {fat}g
        </Text>
      </View>
      <View style={styles.listRight}>
        <Text style={[styles.listKcal, { color: colors.secondary }]}>{calories}</Text>
        <Text style={[styles.listKcalUnit, { color: colors.mutedForeground }]}>kcal</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  blurWrap: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  sheet: { padding: 24, paddingBottom: 32, alignItems: "center", gap: 12, borderTopWidth: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
  hero: { alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroEmoji: { textAlign: "center" },
  foodName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", paddingHorizontal: 8 },
  perServing: { fontSize: 13, fontFamily: "Inter_400Regular" },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 8,
    gap: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  stepCenter: { alignItems: "center", minWidth: 80 },
  stepCount: { fontSize: 32, fontFamily: "Inter_700Bold" },
  stepLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  totalsCard: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  totalKcal: { fontSize: 28, fontFamily: "Inter_700Bold" },
  totalMacros: { fontSize: 13, fontFamily: "Inter_500Medium" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  confirmText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 8 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  listText: { flex: 1, minWidth: 0, gap: 2 },
  listName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  listMacros: { fontSize: 11, fontFamily: "Inter_400Regular" },
  listRight: { alignItems: "flex-end", gap: 0 },
  listKcal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  listKcalUnit: { fontSize: 10, fontFamily: "Inter_500Medium", marginBottom: 2 },
});
