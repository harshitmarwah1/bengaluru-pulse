// Bengaluru Pulse (mobile) - push notification setup.
//
// Flow (see ../../API_CONTRACT.md POST /api/push/register and ../../ARCHITECTURE.md data flow):
//   1. On first open, ask for notification permission.
//   2. If granted, get this device's Expo push token (getExpoPushTokenAsync).
//   3. POST { expoPushToken, area } to the server so the console's advisory-send can reach it.
//   4. A foreground notification handler shows a banner + plays a sound.
//   5. A response listener fires when the user taps a received notification (foreground,
//      background, or cold start) - the caller uses this to jump the card to the pushed state.
//
// Note: getExpoPushTokenAsync requires an EAS `projectId` (Constants.expoConfig.extra.eas.projectId
// once `eas init`/`eas build:configure` has been run) and a physical device. Neither is guaranteed
// in isolated dev, so every step here fails soft: permission denial, a missing projectId, and the
// simulator/emulator (which has no push capability at all) are all reported back as a typed
// PushSetupResult rather than thrown, so the rest of the app keeps working.

import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPush } from "./api";
import { PILOT_AREA } from "./config";

// Foreground notifications show a banner + play a sound (the RN equivalent of "show an alert").
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushSetupStatus =
  | "registered" // permission granted, token obtained, server accepted it
  | "registered-offline" // token obtained, server unreachable (see app/api.ts mock fallback)
  | "permission-denied"
  | "unsupported-simulator" // simulators/emulators can't receive push at all
  | "no-project-id" // no EAS projectId configured yet - can't mint an Expo push token
  | "error";

export interface PushSetupResult {
  status: PushSetupStatus;
  token?: string;
  detail?: string;
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Requests permission, mints an Expo push token, and registers it with the server. Safe to call
 * every app open - Notifications.requestPermissionsAsync() is a no-op prompt if already decided.
 */
export async function setupPushNotifications(area: string = PILOT_AREA): Promise<PushSetupResult> {
  if (!Device.isDevice) {
    return {
      status: "unsupported-simulator",
      detail: "Push tokens require a physical device - the simulator/emulator has no push service.",
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") {
    return { status: "permission-denied", detail: "Notification permission was not granted." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Bengaluru Pulse advisories",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#26408b",
    });
  }

  const projectId = getProjectId();
  if (!projectId) {
    return {
      status: "no-project-id",
      detail:
        "No EAS project is configured yet (expo.extra.eas.projectId). Run `eas init` to enable " +
        "real push tokens; the opt-in toggle and area registration still work locally.",
    };
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const result = await registerPush({ expoPushToken: token, area });
    return {
      status: result.ok ? "registered" : "registered-offline",
      token,
      detail: result.error,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.warn(`[Bengaluru Pulse] push token setup failed: ${detail}`);
    return { status: "error", detail };
  }
}

/** Fires when the user taps a notification (foreground, background, or cold start). */
export function addNotificationTapListener(
  onTap: (data: Record<string, unknown>) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap((response.notification.request.content.data ?? {}) as Record<string, unknown>);
  });
  return () => sub.remove();
}

/** Fires whenever a notification arrives while the app is in the foreground. */
export function addNotificationReceivedListener(
  onReceive: (data: Record<string, unknown>) => void
): () => void {
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    onReceive((notification.request.content.data ?? {}) as Record<string, unknown>);
  });
  return () => sub.remove();
}

/**
 * Fires a local test notification so the tap -> refresh-card flow can be demoed without a live
 * server push (useful in Expo Go / isolated dev). Not part of the real push path.
 */
export async function scheduleLocalTestNotification(
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  });
}
