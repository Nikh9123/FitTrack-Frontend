import { APP_NAME, APP_TAGLINE } from "@/constants/branding";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AboutVeeraSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>About {APP_NAME}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.tagline, { color: colors.primary }]}>{APP_TAGLINE}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            {APP_NAME} helps you track meals, workouts, weight, and daily habits — with an AI coach that adapts to your goals.
          </Text>

          <View style={[styles.versionRow, { backgroundColor: colors.muted }]}>
            <Text style={[styles.versionLabel, { color: colors.mutedForeground }]}>Version</Text>
            <Text style={[styles.versionVal, { color: colors.foreground }]}>1.0.0</Text>
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://veera.sdeashirvad.com/about")}
            style={[styles.linkBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="globe-outline" size={18} color="#fff" />
            <Text style={styles.linkText}>Learn more at veera.sdeashirvad.com</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 16 },
  versionRow: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 16 },
  versionLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  versionVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  linkText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
