import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import {
  FoodListItem,
  FoodQuantityPicker,
  type PickedFood,
} from "@/components/diet/FoodQuantityPicker";
import { useAuth } from "@/context/AuthContext";
import { useFitness } from "@/context/FitnessContext";
import { useBottomTabPadding } from "@/hooks/useBottomTabPadding";
import { useColors } from "@/hooks/useColors";
import { getFoodVisual } from "@/lib/food-visuals";
import { searchFoods, analyzeMealPhotoApi, type FoodItemDto, type MealVisionItemDto } from "@/lib/nutrition-api";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: { key: MealType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "sunny", color: "#FBBF24" },
  { key: "lunch", label: "Lunch", icon: "restaurant", color: "#FF6B35" },
  { key: "dinner", label: "Dinner", icon: "moon", color: "#8B5CF6" },
  { key: "snack", label: "Snack", icon: "cafe", color: "#00C853" },
];

export default function DietScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = useBottomTabPadding();
  const { token } = useAuth();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { todayLog, calorieGoal, addMeal, removeMeal, refreshDailyData } = useFitness();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState<MealType>("lunch");
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [customCal, setCustomCal] = useState("");
  const [foods, setFoods] = useState<FoodItemDto[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(false);
  const [foodsError, setFoodsError] = useState<string | null>(null);
  const [scanPhotoUri, setScanPhotoUri] = useState<string | null>(null);
  const [scanAnalyzing, setScanAnalyzing] = useState(false);
  const [scanResults, setScanResults] = useState<MealVisionItemDto[] | null>(null);
  const [scanNotes, setScanNotes] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pickedFood, setPickedFood] = useState<PickedFood | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      void refreshDailyData();
    }, [refreshDailyData]),
  );

  useFocusEffect(
    useCallback(() => {
      if (action === "add") {
        setShowAdd(true);
        router.setParams({ action: undefined });
      }
    }, [action]),
  );

  useEffect(() => {
    if (!showAdd || !token) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setFoodsLoading(true);
      setFoodsError(null);
      try {
        const items = await searchFoods(token, search);
        if (!cancelled) setFoods(items);
      } catch (err: any) {
        if (!cancelled) {
          setFoods([]);
          setFoodsError(err.message || "Failed to load foods");
        }
      } finally {
        if (!cancelled) setFoodsLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showAdd, token, search]);

  const totalProtein = todayLog.meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = todayLog.meals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = todayLog.meals.reduce((s, m) => s + m.fat, 0);

  const handleQuantityConfirm = async (payload: {
    servings: number;
    quantityLabel: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    foodItemId?: string;
  }) => {
    await addMeal({
      foodItemId: payload.foodItemId,
      name: payload.name,
      type: selectedType,
      calories: payload.calories,
      protein: payload.protein,
      carbs: payload.carbs,
      fat: payload.fat,
      servings: payload.servings,
      quantity: payload.quantityLabel,
    });
    setPickedFood(null);
    setShowAdd(false);
    setSearch("");
    setCustomName("");
    setCustomCal("");
    resetScanState();
  };

  const handleAddCustom = () => {
    if (!customName || !customCal) {
      Alert.alert("Required", "Name and calories are required");
      return;
    }
    setPickedFood({
      kind: "custom",
      name: customName.trim(),
      caloriesKcal: parseInt(customCal, 10),
    });
  };

  const resetScanState = () => {
    setScanPhotoUri(null);
    setScanResults(null);
    setScanNotes(null);
    setScanError(null);
    setScanAnalyzing(false);
  };

  const runMealPhotoAnalysis = async (uri: string, mimeType: string, fileName: string) => {
    if (!token) {
      Alert.alert("Sign in required", "Sign in to scan meals with AI.");
      return;
    }
    setScanPhotoUri(uri);
    setScanAnalyzing(true);
    setScanError(null);
    setScanResults(null);
    setScanNotes(null);

    try {
      const result = await analyzeMealPhotoApi(token, uri, mimeType, fileName);
      setScanResults(result.items);
      setScanNotes(result.notes);
    } catch (err: any) {
      setScanError(err.message || "Failed to analyze meal photo");
    } finally {
      setScanAnalyzing(false);
    }
  };

  const pickMealPhoto = async (source: "camera" | "library") => {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Camera access is needed to scan your meal.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      await runMealPhotoAnalysis(asset.uri, asset.mimeType ?? "image/jpeg", asset.fileName ?? "meal.jpg");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.75 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await runMealPhotoAnalysis(asset.uri, asset.mimeType ?? "image/jpeg", asset.fileName ?? "meal.jpg");
  };

  const handleLogAiItem = (item: MealVisionItemDto) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPickedFood({
      kind: "ai",
      name: item.name,
      caloriesKcal: item.caloriesKcal,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
    });
  };

  const handleLogAllAiItems = async () => {
    if (!scanResults?.length) return;
    for (const item of scanResults) {
      await addMeal({
        name: item.name,
        type: selectedType,
        calories: item.caloriesKcal,
        protein: item.proteinG,
        carbs: item.carbsG,
        fat: item.fatG,
        servings: 1,
        quantity: item.servingDescription || "1 serving",
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetScanState();
    setShowAdd(false);
    setSearch("");
  };

  const mealsByType = (type: MealType) => todayLog.meals.filter((m) => m.type === type);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.secondary + "15", colors.background]}
        style={styles.headerGrad}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: bottomPad },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[colors.typography.h1, { color: colors.foreground, flexShrink: 1 }]} numberOfLines={1}>
            Diet
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.push("/diet/my-plan")}
              style={[styles.planBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            >
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={[colors.typography.caption, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                My Plan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={[styles.addBtn, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="add" size={20} color={colors.primaryForeground} />
              <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground }]}>Add Meal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calorie summary */}
        <GlassCard style={styles.summaryCard} padded={false}>
          <View style={styles.summaryLeft}>
            <ProgressRing
              size={100}
              strokeWidth={8}
              progress={todayLog.calories / calorieGoal}
              color={colors.secondary}
              trackColor={colors.border}
              label={`${todayLog.calories}`}
              sublabel="kcal"
            />
          </View>
          <View style={styles.summaryRight}>
            <CalStat label="Goal" value={`${calorieGoal}`} color={colors.mutedForeground} />
            <CalStat label="Consumed" value={`${todayLog.calories}`} color={colors.secondary} />
            <CalStat label="Remaining" value={`${Math.max(0, calorieGoal - todayLog.calories)}`} color={colors.green} />
          </View>
        </GlassCard>

        {/* Macros */}
        <GlassCard style={styles.macroCard} padded={false}>
          {[
            { label: "Protein", value: totalProtein, color: colors.primary, max: 160 },
            { label: "Carbs", value: totalCarbs, color: colors.secondary, max: 220 },
            { label: "Fat", value: totalFat, color: colors.yellow, max: 70 },
          ].map((m) => (
            <View key={m.label} style={styles.macroRow}>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground, width: 54 }]}>
                {m.label}
              </Text>
              <View style={[styles.macroTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.macroFill,
                    { width: `${Math.min((m.value / m.max) * 100, 100)}%` as any, backgroundColor: m.color },
                  ]}
                />
              </View>
              <Text style={[colors.typography.bodyMedium, { color: colors.foreground, fontSize: 13, width: 40, textAlign: "right" }]}>
                {m.value}g
              </Text>
            </View>
          ))}
        </GlassCard>

        {/* Meals by type */}
        {MEAL_TYPES.map((type) => {
          const meals = mealsByType(type.key);
          return (
            <View key={type.key}>
              <View style={styles.mealTypeHeader}>
                <View style={[styles.mealTypeIcon, { backgroundColor: type.color + "20" }]}>
                  <Ionicons name={type.icon} size={16} color={type.color} />
                </View>
                <Text style={[colors.typography.bodyMedium, { color: colors.foreground, flex: 1 }]}>
                  {type.label}
                </Text>
                <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                  {meals.reduce((s, m) => s + m.calories, 0)} kcal
                </Text>
              </View>
              {meals.length === 0 ? (
                <TouchableOpacity
                  onPress={() => { setSelectedType(type.key); setShowAdd(true); }}
                  style={[styles.emptyMealRow, { borderColor: colors.border }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.mutedForeground} />
                  <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                    Add {type.label.toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ) : (
                meals.map((meal) => (
                  <GlassCard key={meal.id} style={styles.mealCard}>
                    <View style={styles.mealCardText}>
                      <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]} numberOfLines={2}>
                        {meal.name}
                      </Text>
                      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {meal.quantity ? `${meal.quantity} · ` : ""}P: {meal.protein.toFixed(1)}g · C: {meal.carbs.toFixed(1)}g · F: {meal.fat.toFixed(1)}g
                      </Text>
                    </View>
                    <Text style={[colors.typography.h3, { color: type.color, flexShrink: 0, marginHorizontal: 6 }]}>
                      {meal.calories}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      removeMeal(meal.id);
                    }}>
                      <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </GlassCard>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add meal modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={50} tint="dark" style={styles.modalBlur}>
              <AddMealSheetContent
                colors={colors}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                pickMealPhoto={pickMealPhoto}
                scanPhotoUri={scanPhotoUri}
                scanAnalyzing={scanAnalyzing}
                scanResults={scanResults}
                scanNotes={scanNotes}
                scanError={scanError}
                resetScanState={resetScanState}
                handleLogAiItem={handleLogAiItem}
                handleLogAllAiItems={handleLogAllAiItems}
                search={search}
                setSearch={setSearch}
                foodsLoading={foodsLoading}
                foodsError={foodsError}
                foods={foods}
                setPickedFood={setPickedFood}
                customName={customName}
                setCustomName={setCustomName}
                customCal={customCal}
                setCustomCal={setCustomCal}
                handleAddCustom={handleAddCustom}
                onClose={() => {
                  setShowAdd(false);
                  setSearch("");
                  setPickedFood(null);
                  resetScanState();
                }}
              />
            </BlurView>
          ) : (
            <View style={[styles.modalBlur, { backgroundColor: colors.card + "F2" }]}>
              <AddMealSheetContent
                colors={colors}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                pickMealPhoto={pickMealPhoto}
                scanPhotoUri={scanPhotoUri}
                scanAnalyzing={scanAnalyzing}
                scanResults={scanResults}
                scanNotes={scanNotes}
                scanError={scanError}
                resetScanState={resetScanState}
                handleLogAiItem={handleLogAiItem}
                handleLogAllAiItems={handleLogAllAiItems}
                search={search}
                setSearch={setSearch}
                foodsLoading={foodsLoading}
                foodsError={foodsError}
                foods={foods}
                setPickedFood={setPickedFood}
                customName={customName}
                setCustomName={setCustomName}
                customCal={customCal}
                setCustomCal={setCustomCal}
                handleAddCustom={handleAddCustom}
                onClose={() => {
                  setShowAdd(false);
                  setSearch("");
                  setPickedFood(null);
                  resetScanState();
                }}
              />
            </View>
          )}
        </View>
      </Modal>

      <FoodQuantityPicker
        visible={pickedFood != null}
        picked={pickedFood}
        mealType={selectedType}
        onClose={() => setPickedFood(null)}
        onConfirm={(payload) => void handleQuantityConfirm(payload)}
      />
    </View>
  );
}

function CalStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[colors.typography.h3, { color }]}>{value} kcal</Text>
    </View>
  );
}

type Colors = ReturnType<typeof useColors>;

function AddMealSheetContent({
  colors,
  selectedType,
  setSelectedType,
  pickMealPhoto,
  scanPhotoUri,
  scanAnalyzing,
  scanResults,
  scanNotes,
  scanError,
  resetScanState,
  handleLogAiItem,
  handleLogAllAiItems,
  search,
  setSearch,
  foodsLoading,
  foodsError,
  foods,
  setPickedFood,
  customName,
  setCustomName,
  customCal,
  setCustomCal,
  handleAddCustom,
  onClose,
}: {
  colors: Colors;
  selectedType: MealType;
  setSelectedType: (t: MealType) => void;
  pickMealPhoto: (source: "camera" | "library") => Promise<void>;
  scanPhotoUri: string | null;
  scanAnalyzing: boolean;
  scanResults: MealVisionItemDto[] | null;
  scanNotes: string | null;
  scanError: string | null;
  resetScanState: () => void;
  handleLogAiItem: (item: MealVisionItemDto) => void;
  handleLogAllAiItems: () => void;
  search: string;
  setSearch: (s: string) => void;
  foodsLoading: boolean;
  foodsError: string | null;
  foods: FoodItemDto[];
  setPickedFood: (f: PickedFood) => void;
  customName: string;
  setCustomName: (s: string) => void;
  customCal: string;
  setCustomCal: (s: string) => void;
  handleAddCustom: () => void;
  onClose: () => void;
}) {
  return (
    <View
      style={[
        styles.modalSheet,
        {
          borderColor: colors.border + "80",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
      ]}
    >
      <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
      <Text style={[colors.typography.h2, { color: colors.foreground }]}>Add Meal</Text>
      <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: -6 }]}>
        Tap a food to choose quantity
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={styles.typeRow}>
          {MEAL_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setSelectedType(t.key)}
              style={[
                styles.typeChip,
                {
                  backgroundColor: selectedType === t.key ? t.color + "25" : colors.muted + "90",
                  borderColor: selectedType === t.key ? t.color : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={selectedType === t.key ? t.color : colors.mutedForeground}
              />
              <Text
                style={[
                  colors.typography.bodyMedium,
                  { color: selectedType === t.key ? t.color : colors.mutedForeground, fontSize: 13 },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.scanRow}>
        <TouchableOpacity
          onPress={() => void pickMealPhoto("camera")}
          style={[styles.scanBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
        >
          <Ionicons name="camera" size={18} color={colors.primary} />
          <Text style={[colors.typography.caption, { color: colors.primary }]}>Scan Meal (AI)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void pickMealPhoto("library")}
          style={[styles.scanBtn, { backgroundColor: colors.muted + "90", borderColor: colors.border }]}
        >
          <Ionicons name="images-outline" size={18} color={colors.foreground} />
          <Text style={[colors.typography.caption, { color: colors.foreground }]}>From Gallery</Text>
        </TouchableOpacity>
      </View>

      {(scanPhotoUri || scanAnalyzing || scanResults || scanError) && (
        <View style={[styles.scanPanel, { borderColor: colors.border, backgroundColor: colors.muted + "80" }]}>
          {scanPhotoUri ? (
            <Image source={{ uri: scanPhotoUri }} style={styles.scanPreview} resizeMode="cover" />
          ) : null}

          {scanAnalyzing ? (
            <View style={styles.scanLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>
                AI is estimating calories and macros...
              </Text>
            </View>
          ) : null}

          {scanError ? (
            <Text style={[colors.typography.caption, { color: colors.destructive }]}>{scanError}</Text>
          ) : null}

          {scanResults?.map((item, index) => {
            const visual = getFoodVisual(item.name, null);
            return (
              <TouchableOpacity
                key={`${item.name}-${index}`}
                onPress={() => handleLogAiItem(item)}
                style={[styles.aiFoodRow, { borderBottomColor: colors.border }]}
              >
                <LinearGradient
                  colors={visual.gradient}
                  style={styles.aiFoodIcon}
                >
                  <Text style={styles.aiFoodEmoji}>{visual.emoji}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[colors.typography.bodyMedium, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>
                    P:{item.proteinG}g · C:{item.carbsG}g · F:{item.fatG}g · {item.confidence}% sure
                  </Text>
                </View>
                <Text style={[colors.typography.h3, { color: colors.secondary, marginRight: 4 }]}>
                  {item.caloriesKcal}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}

          {scanResults && scanResults.length > 1 ? (
            <TouchableOpacity
              onPress={() => void handleLogAllAiItems()}
              style={[styles.logAllBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[colors.typography.bodyMedium, { color: colors.primaryForeground }]}>
                Log all {scanResults.length} items (1 serving each)
              </Text>
            </TouchableOpacity>
          ) : null}

          {scanNotes ? (
            <Text style={[colors.typography.tiny, { color: colors.mutedForeground }]}>{scanNotes}</Text>
          ) : null}

          {(scanResults || scanError) && !scanAnalyzing ? (
            <TouchableOpacity onPress={resetScanState}>
              <Text style={[colors.typography.caption, { color: colors.mutedForeground, textAlign: "center" }]}>
                Clear scan
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <View style={[styles.searchWrap, { backgroundColor: colors.muted + "90", borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search Indian foods..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInputInner, { color: colors.foreground }, colors.typography.body]}
        />
      </View>

      <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
        {foodsLoading ? (
          <View style={styles.foodsLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[colors.typography.caption, { color: colors.mutedForeground }]}>Loading foods...</Text>
          </View>
        ) : foodsError ? (
          <Text style={[colors.typography.caption, { color: colors.destructive, paddingVertical: 12 }]}>
            {foodsError}
          </Text>
        ) : foods.length === 0 ? (
          <Text style={[colors.typography.caption, { color: colors.mutedForeground, paddingVertical: 12 }]}>
            {search ? "No foods match your search" : "No foods in catalog yet — run db:seed:foods on the backend"}
          </Text>
        ) : (
          foods.map((food) => (
            <FoodListItem
              key={food.id}
              name={food.name}
              category={food.category}
              calories={food.calories}
              protein={food.protein}
              carbs={food.carbs}
              fat={food.fat}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPickedFood({ kind: "catalog", food });
              }}
            />
          ))
        )}
      </ScrollView>

      <View style={[styles.customRow, { backgroundColor: colors.muted + "60", borderColor: colors.border }]}>
        <TextInput
          value={customName}
          onChangeText={setCustomName}
          placeholder="Custom food name"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.customInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background + "80", flex: 1 }, colors.typography.body]}
        />
        <TextInput
          value={customCal}
          onChangeText={setCustomCal}
          placeholder="kcal"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="number-pad"
          style={[styles.customInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background + "80", width: 72 }, colors.typography.body]}
        />
        <TouchableOpacity onPress={handleAddCustom} style={[styles.customAddBtn, { backgroundColor: colors.secondary }]}>
          <Ionicons name="add" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
        <Text style={[colors.typography.body, { color: colors.mutedForeground }]}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 200 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  planBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 20 },
  summaryCard: { flexDirection: "row", padding: 16, gap: 20, alignItems: "center" },
  summaryLeft: {},
  summaryRight: { flex: 1, gap: 12 },
  macroCard: { padding: 16, gap: 12 },
  macroRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  macroTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  macroFill: { height: 6, borderRadius: 3 },
  mealTypeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 8 },
  mealTypeIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyMealRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderStyle: "dashed", borderRadius: 12, padding: 12, marginBottom: 8 },
  mealCard: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  mealCardText: { flex: 1, minWidth: 0 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  modalBlur: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", maxHeight: "88%" },
  modalSheet: { padding: 20, paddingBottom: 28, borderWidth: 1, gap: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInputInner: { flex: 1, fontSize: 14, paddingVertical: 0 },
  foodsLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 16 },
  customRow: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 16, borderWidth: 1 },
  customInput: { height: 44, borderWidth: 1, paddingHorizontal: 10, fontSize: 13, borderRadius: 12 },
  customAddBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cancelBtn: { alignItems: "center", padding: 8 },
  scanRow: { flexDirection: "row", gap: 8 },
  scanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  scanPanel: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  scanPreview: { width: "100%", height: 120, borderRadius: 10 },
  scanLoading: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiFoodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5, gap: 10 },
  aiFoodIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  aiFoodEmoji: { fontSize: 18 },
  logAllBtn: { paddingVertical: 10, borderRadius: 10, alignItems: "center" },
});
