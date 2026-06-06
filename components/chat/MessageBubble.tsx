import { useColors } from "@/hooks/useColors";
import type { ChatMessageDto } from "@/lib/chat-api";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface MessageBubbleProps {
  message: ChatMessageDto;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const colors = useColors();
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.muted, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
        ]}
      >
        {!isUser ? (
          <Text style={[styles.coachLabel, { color: colors.primary }]}>AI Coach</Text>
        ) : null}
        <Text style={[styles.text, { color: isUser ? "#fff" : colors.foreground }]}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: 10, paddingHorizontal: 4 },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  coachLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginBottom: 4, letterSpacing: 0.3 },
  text: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
