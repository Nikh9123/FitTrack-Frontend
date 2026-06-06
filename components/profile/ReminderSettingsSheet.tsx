import { useColors } from "@/hooks/useColors";
import {
  adjustTime,
  formatReminderTime,
  loadReminderPrefs,
  requestReminderPermission,
  saveReminderPrefs,
  scheduleAllReminders,
  type ReminderKey,
  type ReminderPrefs,
} from "@/lib/reminders";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROWS: Array<{ key: ReminderKey; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { key: "weight", icon: "scale-outline", label: "Log weight (weekly)" },
  { key: "food", icon: "nutrition-outline", label: "Log food (daily)" },
  { key: "exercise", icon: "barbell-outline", label: "Log exercises (daily)" },
  { key: "steps", icon: "footsteps-outline", label: "Log steps (daily)" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReminderSettingsSheet({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      void loadReminderPrefs().then(setPrefs);
    }
  }, [visible]);

  const updatePref = (key: ReminderKey, patch: Partial<ReminderPrefs[ReminderKey]>) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: { ...prefs[key], ...patch } });
  };

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const granted = await requestReminderPermission();
      if (!granted && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      await saveReminderPrefs(prefs);
      if (granted) await scheduleAllReminders(prefs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Reminders</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {!prefs ? (
            <Text style={{ color: colors.mutedForeground, padding: 16 }}>Loading…</Text>
          ) : (
            ROWS.map((row) => (
              <View key={row.key} style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={[styles.rowIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name={row.icon} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>{row.label}</Text>
                  <View style={styles.timeRow}>
                    <TouchableOpacity
                      onPress={() => updatePref(row.key, { time: adjustTime(prefs[row.key].time, -30) })}
                      style={[styles.timeBtn, { backgroundColor: colors.muted }]}
                    >
                      <Ionicons name="remove" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                      {formatReminderTime(prefs[row.key].time)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updatePref(row.key, { time: adjustTime(prefs[row.key].time, 30) })}
                      style={[styles.timeBtn, { backgroundColor: colors.muted }]}
                    >
                      <Ionicons name="add" size={14} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Switch
                  value={prefs[row.key].enabled}
                  onValueChange={(v) => updatePref(row.key, { enabled: v })}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>
            ))
          )}

          <TouchableOpacity
            onPress={() => void handleSave()}
            disabled={saving || !prefs}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save Reminders"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 0.5 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  timeBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  timeText: { fontSize: 12, fontFamily: "Inter_400Regular", minWidth: 72, textAlign: "center" },
  saveBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
