import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { hapticLight } from "@/lib/haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatComposerProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  /** When false, parent handles bottom inset (e.g. tab bar + keyboard) */
  includeBottomInset?: boolean;
}

export function ChatComposer({
  onSend,
  disabled,
  placeholder = "Ask your coach...",
  includeBottomInset = true,
}: ChatComposerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setText("");
    try {
      void hapticLight();
      await onSend(trimmed);
    } finally {
      setSending(false);
    }
  };

  const bottomPad = includeBottomInset ? Math.max(insets.bottom, Platform.OS === "web" ? 12 : 8) : 8;

  return (
    <View style={[styles.wrap, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: bottomPad }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline
        maxLength={2000}
        editable={!sending && !disabled}
        style={[
          styles.input,
          { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border },
        ]}
        onSubmitEditing={() => void handleSend()}
      />
      <TouchableOpacity
        onPress={() => void handleSend()}
        disabled={!text.trim() || sending || disabled}
        style={[
          styles.sendBtn,
          { backgroundColor: text.trim() && !sending ? colors.primary : colors.muted },
        ]}
      >
        {sending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="send" size={18} color={text.trim() ? "#fff" : colors.mutedForeground} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
