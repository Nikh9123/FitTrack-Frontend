import { ChatComposer } from "@/components/chat/ChatComposer";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  fetchChatMessages,
  fetchDefaultCoachThread,
  sendChatMessage,
  type ChatMessageDto,
  type ChatThreadDto,
} from "@/lib/chat-api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SUGGESTIONS = [
  "How am I doing this week?",
  "Tips to improve my sleep?",
  "What should I focus on today?",
  "Review my workout consistency",
];

export default function TrainerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, isAuthenticated } = useAuth();
  const listRef = useRef<FlatList<ChatMessageDto>>(null);

  const [thread, setThread] = useState<ChatThreadDto | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = Platform.OS === "web" ? 84 : 72;

  const loadChat = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const coachThread = await fetchDefaultCoachThread(token);
      setThread(coachThread);
      const msgs = await fetchChatMessages(token, coachThread.id);
      setMessages(msgs);
    } catch (err: any) {
      setError(err.message ?? "Failed to load coach chat");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, thinking]);

  const handleSend = async (content: string) => {
    if (!token || !thread) return;
    setThinking(true);
    setError(null);

    const optimistic: ChatMessageDto = {
      id: `temp-${Date.now()}`,
      threadId: thread.id,
      senderId: "me",
      role: "user",
      content,
      messageType: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { userMessage, assistantMessage } = await sendChatMessage(token, thread.id, content);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        userMessage,
        assistantMessage,
      ]);
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError(err.message ?? "Failed to send message");
    } finally {
      setThinking(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in for AI Coach</Text>
        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
          Your personal fitness coach uses your real workout, nutrition, and progress data.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={[styles.signInBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + "18", "transparent"]}
        style={[styles.headerGrad, { paddingTop: topPad + 8 }]}
      />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={[styles.coachAvatar, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="sparkles" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Coach</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Personalized · data-driven · motivational
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error && messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptySub, { color: colors.error, textAlign: "center", paddingHorizontal: 24 }]}>
            {error}
          </Text>
          <TouchableOpacity onPress={() => void loadChat()} style={[styles.signInBtn, { backgroundColor: colors.primary, marginTop: 16 }]}>
            <Text style={styles.signInText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 12,
            }}
            ListHeaderComponent={
              messages.length <= 1 ? (
                <View style={styles.suggestionsWrap}>
                  <Text style={[styles.suggestionsLabel, { color: colors.mutedForeground }]}>Try asking</Text>
                  <View style={styles.suggestionsRow}>
                    {SUGGESTIONS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => void handleSend(s)}
                        disabled={thinking}
                      >
                        <GlassCard style={styles.suggestionChip}>
                          <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
                        </GlassCard>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null
            }
            ListFooterComponent={
              thinking ? (
                <View style={[styles.thinkingRow, { backgroundColor: colors.muted }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.thinkingText, { color: colors.mutedForeground }]}>Coach is thinking...</Text>
                </View>
              ) : error ? (
                <Text style={[styles.errorBanner, { color: colors.error }]}>{error}</Text>
              ) : null
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={{ marginBottom: tabBarHeight }}>
            <ChatComposer onSend={handleSend} disabled={thinking || !thread} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 140 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  coachAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  signInBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  signInText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  suggestionsWrap: { gap: 8, marginBottom: 12 },
  suggestionsLabel: { fontSize: 12, fontFamily: "Inter_500Medium", paddingHorizontal: 4 },
  suggestionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestionChip: { paddingHorizontal: 12, paddingVertical: 8 },
  suggestionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 4,
    marginLeft: 4,
  },
  thinkingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorBanner: { fontSize: 12, fontFamily: "Inter_500Medium", padding: 8, textAlign: "center" },
});
