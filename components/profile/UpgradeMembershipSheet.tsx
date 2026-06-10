import { buildUpiPaymentString, UPGRADE_AMOUNT_INR, UPGRADE_UPI_ID } from "@/constants/membership";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { fetchUpgradeStatus, submitUpgradeRequest } from "@/lib/membership-api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import QRCode from "qrcode";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function UpgradeMembershipSheet({ visible, onClose, onSubmitted }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, refreshProfile } = useAuth();
  const [transactionId, setTransactionId] = useState("");
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [tier, setTier] = useState<"free" | "pending" | "premium">("free");
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    void QRCode.toString(buildUpiPaymentString(), { type: "svg", width: 160, margin: 1 })
      .then(setQrSvg)
      .catch(() => setQrSvg(null));
  }, [visible]);

  useEffect(() => {
    if (!visible || !token) return;
    void fetchUpgradeStatus(token)
      .then((status) => {
        setTier(status.membershipTier);
        if (status.latestRequest?.status === "pending") {
          setPendingMessage(
            "Payment under verification — membership will be updated within 24 hours post verification.",
          );
        } else {
          setPendingMessage(null);
        }
      })
      .catch(() => {});
  }, [visible, token]);

  const handleCopyUpi = async () => {
    try {
      await Share.share({ message: UPGRADE_UPI_ID });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("UPI ID", UPGRADE_UPI_ID);
    }
  };

  const handlePickProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setProofUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!transactionId.trim() && !proofUri) {
      Alert.alert("Missing proof", "Enter a transaction ID or upload a payment screenshot.");
      return;
    }
    setSubmitting(true);
    try {
      const { message } = await submitUpgradeRequest(token, {
        transactionId: transactionId.trim(),
        proofUri,
      });
      setPendingMessage(message);
      setTier("pending");
      await refreshProfile();
      onSubmitted?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (tier === "premium") {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Premium Member</Text>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              You already have premium membership. Thank you for supporting Veera!
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Upgrade Membership</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {pendingMessage ? (
              <View style={[styles.banner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "35" }]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.bannerText, { color: colors.foreground }]}>{pendingMessage}</Text>
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>1. Pay via UPI</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Scan the QR or send ₹{UPGRADE_AMOUNT_INR} to the UPI ID below.
            </Text>

            <View style={[styles.qrWrap, { backgroundColor: "#fff" }]}>
              {qrSvg ? (
                <SvgXml xml={qrSvg} width={160} height={160} />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={48} color="#9CA3AF" />
                </View>
              )}
            </View>

            <TouchableOpacity onPress={() => void handleCopyUpi()} style={[styles.upiRow, { backgroundColor: colors.muted }]}>
              <Text style={[styles.upiLabel, { color: colors.mutedForeground }]}>UPI ID</Text>
              <Text style={[styles.upiVal, { color: colors.foreground }]}>{UPGRADE_UPI_ID}</Text>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>2. Submit proof</Text>
            <TextInput
              value={transactionId}
              onChangeText={setTransactionId}
              placeholder="Transaction ID (optional if screenshot provided)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />

            <TouchableOpacity
              onPress={() => void handlePickProof()}
              style={[styles.proofBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text style={[styles.proofText, { color: colors.foreground }]}>
                {proofUri ? "Screenshot selected" : "Upload payment screenshot"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {!pendingMessage ? (
            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={submitting}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
            >
              <Text style={styles.saveBtnText}>{submitting ? "Submitting…" : "Submit for Verification"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16, maxHeight: "92%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 12 },
  qrWrap: { alignSelf: "center", padding: 16, borderRadius: 12, marginBottom: 12 },
  qrPlaceholder: { width: 160, height: 160, alignItems: "center", justifyContent: "center" },
  upiRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12 },
  upiLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  upiVal: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 10 },
  proofBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  proofText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  banner: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14, alignItems: "flex-start" },
  bannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  saveBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
