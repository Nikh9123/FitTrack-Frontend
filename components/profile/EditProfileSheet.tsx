import { APP_NAME } from "@/constants/branding";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { loadLocalAvatarUri, pickProfilePhoto } from "@/lib/local-avatar";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function EditProfileSheet({ visible, onClose, onSaved }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(user?.name ?? "");
      setRegion(user?.region ?? "");
      void loadLocalAvatarUri().then(setAvatarUri);
    }
  }, [visible, user?.name, user?.region]);

  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const handlePickPhoto = async () => {
    const uri = await pickProfilePhoto();
    if (uri) {
      setAvatarUri(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      const { firstName, lastName } = splitName(trimmedName);
      await updateProfile({
        firstName,
        lastName: lastName || null,
        region: region.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => void handlePickPhoto()} style={styles.avatarRow}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + "20", borderColor: colors.primary }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.photoLabel, { color: colors.foreground }]}>Profile photo</Text>
                <Text style={[styles.photoSub, { color: colors.mutedForeground }]}>
                  Stored on this device only — not uploaded to {APP_NAME}
                </Text>
              </View>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Region / Location</Text>
            <TextInput
              value={region}
              onChangeText={setRegion}
              placeholder="e.g. Mumbai, India"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />
          </ScrollView>

          <TouchableOpacity
            onPress={() => void handleSave()}
            disabled={saving || !name.trim()}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving || !name.trim() ? 0.6 : 1 }]}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16, maxHeight: "88%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  photoLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  photoSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 15 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 14 },
  saveBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
