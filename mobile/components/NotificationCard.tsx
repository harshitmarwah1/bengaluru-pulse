// Bengaluru Pulse (mobile) - the notifications setup card.
// Frames the push opt-in as the pilot's WhatsApp advisory opt-in (per ARCHITECTURE.md /
// DESIGN-REFERENCE.html footer copy: "delivered via WhatsApp opt-in"). The toggle is a local
// preference; the actual permission request + Expo push token registration
// (POST /api/push/register) happens on first app open, in app/notifications.ts.

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Palette, radius } from "../app/theme";
import type { PushSetupResult } from "../app/notifications";

interface Props {
  palette: Palette;
  optedIn: boolean;
  onToggle: (next: boolean) => void;
  pushResult: PushSetupResult | null;
  pushLoading: boolean;
  onSendTestNotification?: () => void;
}

const STATUS_COPY: Record<string, (r: PushSetupResult) => string> = {
  registered: () => "Registered - this device will receive advisory pushes.",
  "registered-offline": () => "Token ready on-device - server unreachable, will sync when online.",
  "permission-denied": () => "Notification permission denied - enable it in system Settings.",
  "unsupported-simulator": () => "Simulator has no push service - use the test button below.",
  "no-project-id": () => "No EAS project configured yet - opt-in preference is saved locally.",
  error: (r) => `Setup error: ${r.detail ?? "unknown error"}`,
};

export default function NotificationCard({
  palette,
  optedIn,
  onToggle,
  pushResult,
  pushLoading,
  onSendTestNotification,
}: Props) {
  const showTestButton =
    pushResult &&
    ["unsupported-simulator", "no-project-id", "registered-offline", "error"].includes(pushResult.status);

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
      <View style={styles.row}>
        <View style={[styles.waBadge]}>
          <Ionicons name="logo-whatsapp" size={16} color="#fff" />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: palette.ink }]}>WhatsApp advisory opt-in</Text>
          <Text style={[styles.subtitle, { color: palette.inkSoft }]}>
            Get delay and disruption advisories for Marathahalli.
          </Text>
        </View>
        <Switch
          value={optedIn}
          onValueChange={onToggle}
          trackColor={{ false: palette.line, true: palette.indigo }}
          thumbColor="#fff"
        />
      </View>

      <View style={[styles.statusRow, { borderTopColor: palette.hair }]}>
        {pushLoading ? (
          <ActivityIndicator size="small" color={palette.indigo} />
        ) : (
          <Ionicons
            name={pushResult?.status === "registered" ? "checkmark-circle" : "information-circle-outline"}
            size={14}
            color={pushResult?.status === "registered" ? palette.ok : palette.inkFaint}
          />
        )}
        <Text style={[styles.statusText, { color: palette.inkFaint }]}>
          {pushLoading
            ? "Setting up push notifications..."
            : pushResult
            ? STATUS_COPY[pushResult.status]?.(pushResult) ?? pushResult.status
            : "Not set up yet."}
        </Text>
      </View>

      {showTestButton && onSendTestNotification && (
        <Pressable
          onPress={onSendTestNotification}
          style={({ pressed }) => [
            styles.testBtn,
            { backgroundColor: palette.indigoSoft, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="notifications-outline" size={13} color={palette.indigo} />
          <Text style={[styles.testBtnText, { color: palette.indigo }]}>Send test notification</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 15, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  waBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#25d366",
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 14.5 },
  subtitle: { fontFamily: "IBMPlexSans_400Regular", fontSize: 12.5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingTop: 11 },
  statusText: { fontFamily: "IBMPlexMono_400Regular", fontSize: 11, flex: 1 },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  testBtnText: { fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12.5 },
});
