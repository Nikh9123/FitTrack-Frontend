import { useColors } from "@/hooks/useColors";
import { searchExerciseCatalog, type CatalogExerciseHit } from "@/lib/workout-plan-api";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface Props {
  token: string;
  placeholder?: string;
}

export function ExerciseSearchBar({ token, placeholder = "Search exercises…" }: Props) {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogExerciseHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      const reqId = ++requestIdRef.current;
      setLoading(true);
      setOpen(true);

      try {
        const hits = await searchExerciseCatalog(token, { q: trimmed, limit: 12, markPlan: true });
        if (reqId !== requestIdRef.current) return;
        setResults(hits);
      } catch {
        if (reqId === requestIdRef.current) setResults([]);
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const openTutorial = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {open && results.length > 0 ? (
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {results.map((ex) => (
            <View key={ex.id} style={[styles.hit, { borderBottomColor: colors.border }]}>
              {ex.gifUrl ? (
                <Image source={{ uri: ex.gifUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
                  <Ionicons name="barbell-outline" size={16} color={colors.mutedForeground} />
                </View>
              )}
              <View style={styles.hitBody}>
                <Text style={[styles.hitName, { color: colors.foreground }]} numberOfLines={1}>
                  {ex.name}
                </Text>
                <Text style={[styles.hitMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {ex.target || ex.bodyPart} · {ex.equipment || "Body weight"}
                </Text>
                <View style={styles.hitTags}>
                  {ex.inCurrentPlan ? (
                    <View style={[styles.planBadge, { backgroundColor: colors.primary + "18" }]}>
                      <Text style={[styles.planBadgeText, { color: colors.primary }]}>In your plan</Text>
                    </View>
                  ) : (
                    <View style={[styles.planBadge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.planBadgeText, { color: colors.mutedForeground }]}>Not in plan</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.tutorialBtns}>
                {ex.youtubeUrl ? (
                  <Pressable
                    onPress={() => openTutorial(ex.youtubeUrl!)}
                    style={[styles.tutorialBtn, { backgroundColor: "#FF000015" }]}
                  >
                    <Ionicons name="logo-youtube" size={14} color="#FF0000" />
                  </Pressable>
                ) : null}
                {ex.googleUrl ? (
                  <Pressable
                    onPress={() => openTutorial(ex.googleUrl!)}
                    style={[styles.tutorialBtn, { backgroundColor: colors.muted }]}
                  >
                    <Ionicons name="globe-outline" size={14} color={colors.foreground} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {open && !loading && query.trim().length >= 2 && results.length === 0 ? (
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>No exercises found</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, zIndex: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 15,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: Platform.OS === "web" ? 8 : 0 },
  dropdown: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: 320,
  },
  hit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  thumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  hitBody: { flex: 1, gap: 2 },
  hitName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  hitMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  hitTags: { flexDirection: "row", marginTop: 4 },
  planBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  planBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tutorialBtns: { flexDirection: "row", gap: 6 },
  tutorialBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
