// Expo push fan-out. Sends one push message to every registered Expo push
// token via the Expo Push API, using expo-server-sdk for chunking + receipts.

import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import type { PushMessage } from "../shared/types";
import { listPushTokens } from "../db/push-tokens";

const expo = new Expo(
  process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined
);

/**
 * Sends `message` to every registered, valid Expo push token.
 * Returns the number of tokens the message was actually dispatched to.
 * Gracefully returns 0 (no error) when there are no registered tokens.
 */
export async function sendPushToAll(message: PushMessage): Promise<number> {
  const tokens = (await listPushTokens()).filter((t) => Expo.isExpoPushToken(t));
  if (tokens.length === 0) return 0;

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    sound: "default",
    title: message.title,
    body: message.body,
    data: message.data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      sent += tickets.filter((t) => t.status === "ok").length;
    } catch (err) {
      // Don't let a transient Expo API failure crash the request - the
      // console's "Approve & assign" flow should still complete gracefully.
      console.error("[push] sendPushNotificationsAsync failed:", err);
    }
  }
  return sent;
}
