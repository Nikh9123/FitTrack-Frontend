import { APP_NAME } from "@/constants/branding";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: "What we store",
    body: `${APP_NAME} keeps your account details, meal logs, weight entries, workouts, and daily check-ins to power your fitness dashboard and AI coach.`,
  },
  {
    title: "Activity & steps",
    body: "Step and motion data from your device is used to show daily activity rings and progress. You can disable step tracking in app permissions at any time.",
  },
  {
    title: "Profile photo",
    body: "Photos you pick for your profile are saved only on this device — they are not uploaded to our servers.",
  },
  {
    title: "Delete your account",
    body: "You can request account deletion from Settings or by contacting support. Deleting your account removes access and marks your profile as deleted.",
  },
];

export function PrivacySecuritySheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Privacy & Security</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
                <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{section.body}</Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => Linking.openURL("https://veera.sdeashirvad.com/contact/")}
              style={[styles.linkBtn, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>Data requests & contact</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16, maxHeight: "85%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  sectionBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, marginTop: 4 },
  linkText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
