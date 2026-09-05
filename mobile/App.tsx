// Bengaluru Pulse (mobile) - the citizen "Pulse" app.
// See ARCHITECTURE.md, API_CONTRACT.md, DESIGN-REFERENCE.html at the repo root for the spec
// this implements. mobile/app/ holds config + data logic, mobile/components/ holds the UI.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from "@expo-google-fonts/ibm-plex-sans";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from "@expo-google-fonts/ibm-plex-mono";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { fetchPulse } from "./app/api";
import { PILOT_AREA } from "./app/config";
import {
  addNotificationTapListener,
  addNotificationReceivedListener,
  scheduleLocalTestNotification,
  setupPushNotifications,
  type PushSetupResult,
} from "./app/notifications";
import { usePalette } from "./app/theme";
import type { CitizenPulse } from "./app/types";
import {
  initAnalytics,
  trackActionTapped,
  trackAdvisoryViewed,
  trackAppOpened,
  trackPulseViewed,
  trackPushOpened,
  trackPushReceived,
  trackTimelineScrubbed,
} from "./app/analytics";
import PulseCard from "./components/PulseCard";
import NotificationCard from "./components/NotificationCard";

const OPT_IN_STORAGE_KEY = "bengaluru-pulse:advisory-opt-in";

SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op: fine if the splash screen module isn't available (e.g. web)
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  const { palette, scheme } = usePalette();

  const [pulse, setPulse] = useState<CitizenPulse | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [optedIn, setOptedIn] = useState(false);
  const [pushResult, setPushResult] = useState<PushSetupResult | null>(null);
  const [pushLoading, setPushLoading] = useState(false);

  const loadedOnce = useRef(false);

  const loadPulse = useCallback(async (atClockMinutes?: number) => {
    const result = await fetchPulse(atClockMinutes);
    setPulse(result.data);
    setIsMock(result.source === "mock");
    trackPulseViewed(result.data.state);
    if (atClockMinutes == null) {
      const matched = result.data.timeline.find((s) => s.time === result.data.updatedAt);
      setScrubValue(matched?.clockMinutes ?? result.data.timeline[result.data.timeline.length - 1]?.clockMinutes ?? 975);
      trackAdvisoryViewed();
    }
    return result.data;
  }, []);

  const runPushSetup = useCallback(async () => {
    setPushLoading(true);
    const result = await setupPushNotifications(PILOT_AREA);
    setPushResult(result);
    setPushLoading(false);
    if (result.status === "registered" || result.status === "registered-offline") {
      setOptedIn(true);
      await AsyncStorage.setItem(OPT_IN_STORAGE_KEY, "1");
    }
  }, []);

  // Initial load: fetch the current pulse, restore the opt-in preference, request notification
  // permission + register the push token (first-open flow per API_CONTRACT.md).
  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;

    initAnalytics();
    trackAppOpened();

    (async () => {
      try {
        await loadPulse();
      } finally {
        setLoading(false);
      }

      const stored = await AsyncStorage.getItem(OPT_IN_STORAGE_KEY);
      if (stored === "1") setOptedIn(true);

      await runPushSetup();
    })();
  }, [loadPulse, runPushSetup]);

  // Tapping a received push (foreground, background, or cold start) refreshes the card at the
  // pushed state - i.e. re-fetches the current (non-scrubbed) pulse.
  useEffect(() => {
    const removeTap = addNotificationTapListener(() => {
      trackPushOpened();
      loadPulse();
    });
    const removeReceived = addNotificationReceivedListener(() => {
      trackPushReceived();
      loadPulse();
    });
    return () => {
      removeTap();
      removeReceived();
    };
  }, [loadPulse]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  const handleScrub = useCallback(
    (clockMinutes: number) => {
      setScrubValue(clockMinutes);
      trackTimelineScrubbed();
      loadPulse(clockMinutes);
    },
    [loadPulse]
  );

  const handleActionTap = useCallback((kind: "time" | "metro") => {
    trackActionTapped(kind);
  }, []);

  const handleToggleOptIn = useCallback(
    async (next: boolean) => {
      setOptedIn(next);
      await AsyncStorage.setItem(OPT_IN_STORAGE_KEY, next ? "1" : "0");
      if (next && (!pushResult || pushResult.status !== "registered")) {
        await runPushSetup();
      }
    },
    [pushResult, runPushSetup]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPulse(scrubValue ?? undefined);
    setRefreshing(false);
  }, [loadPulse, scrubValue]);

  const handleSendTestNotification = useCallback(async () => {
    if (!pulse) return;
    await scheduleLocalTestNotification(`Bengaluru Pulse: ${pulse.headline}`, pulse.advisory, {
      eventId: pulse.eventId,
      state: pulse.state,
    });
  }, [pulse]);

  if (!fontsLoaded && !fontError) {
    return null; // splash screen is still visible
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper }]} edges={["top", "bottom"]}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.indigo} />
          }
        >
          {loading || !pulse || scrubValue == null ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={palette.indigo} />
              <Text style={{ color: palette.inkSoft, fontFamily: "IBMPlexSans_400Regular", marginTop: 10 }}>
                Loading today's Pulse...
              </Text>
            </View>
          ) : (
            <>
              <PulseCard
                pulse={pulse}
                palette={palette}
                scrubValue={scrubValue}
                onScrub={handleScrub}
                onActionTap={handleActionTap}
                isMock={isMock}
              />
              <NotificationCard
                palette={palette}
                optedIn={optedIn}
                onToggle={handleToggleOptIn}
                pushResult={pushResult}
                pushLoading={pushLoading}
                onSendTestNotification={handleSendTestNotification}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 0 },
  scroll: { padding: 18, paddingBottom: 40, gap: 16 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 120 },
});
