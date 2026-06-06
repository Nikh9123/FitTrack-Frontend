import { entranceFade } from "@/constants/animations";
import {
  fetchMotivationQuote,
  MotivationQuoteError,
  type MotivationQuote,
} from "@/lib/motivation-quotes";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

function PulsingIcon() {
  const colors = useColors();
  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.iconWrap, { backgroundColor: colors.yellow + "22" }]}>
      <Ionicons name="sunny" size={18} color={colors.yellow} />
    </Animated.View>
  );
}

export function MotivationQuoteCard() {
  const colors = useColors();
  const [quote, setQuote] = useState<MotivationQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchMotivationQuote();
      setQuote(next);
    } catch (err) {
      setQuote(null);
      setError(err instanceof MotivationQuoteError ? err.message : "Could not load quote.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadQuote();
    }, [loadQuote]),
  );

  return (
    <Animated.View entering={entranceFade(0)}>
      <LinearGradient
        colors={[colors.yellow + "18", colors.primary + "10", colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: colors.border }]}
      >
        <View style={styles.header}>
          <PulsingIcon />
          <Text style={[colors.typography.label, { color: colors.mutedForeground, flex: 1 }]}>
            Daily Motivation
          </Text>
          <TouchableOpacity onPress={() => void loadQuote()} hitSlop={8} disabled={loading}>
            <Ionicons name="refresh" size={16} color={loading ? colors.mutedForeground : colors.primary} />
          </TouchableOpacity>
        </View>

        {loading && !quote && !error ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 12 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.mutedForeground} />
            <Text style={[colors.typography.caption, { color: colors.mutedForeground, flex: 1, lineHeight: 18 }]}>
              {error}
            </Text>
          </View>
        ) : quote ? (
          <Animated.View
            key={quote.content}
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(200)}
            style={styles.quoteBody}
          >
            <Text style={[styles.quoteText, { color: colors.foreground }]}>"{quote.content}"</Text>
            <Text style={[colors.typography.caption, { color: colors.mutedForeground, marginTop: 8 }]}>
              — {quote.author}
            </Text>
          </Animated.View>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quoteBody: {
    paddingBottom: 2,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
});
