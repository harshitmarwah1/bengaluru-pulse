// Bengaluru Pulse (mobile) - the one glanceable citizen card.
// Matches the CITIZEN half of ../../DESIGN-REFERENCE.html: indigo gradient header with a state
// hero (Normal / Delay Risk / Disruption), advisory text, action rows, a flood-prone area line,
// the timeline scrubber, and a "delivered via WhatsApp opt-in" footer.

import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Palette, radius, stateColors, stateLabel } from "../app/theme";
import { formatNow } from "../app/time";
import type { CitizenAction, CitizenPulse } from "../app/types";
import TimelineScrubber from "./TimelineScrubber";

interface Props {
  pulse: CitizenPulse;
  palette: Palette;
  scrubValue: number;
  onScrub: (clockMinutes: number) => void;
  onActionTap?: (kind: CitizenAction["kind"]) => void;
  loading?: boolean;
  isMock?: boolean;
}

const STATE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  normal: "checkmark-circle",
  delay: "warning",
  disruption: "alert-circle",
};

const ACTION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  time: "time-outline",
  metro: "train-outline",
};

export default function PulseCard({ pulse, palette, scrubValue, onScrub, onActionTap, loading, isMock }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const colors = stateColors(palette, pulse.state);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, shadowColor: "#000" },
      ]}
    >
      <LinearGradient
        colors={[palette.indigo, palette.indigoInk]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <Ionicons name="pulse" size={14} color="#fff" />
            <Text style={styles.brandText}>Bengaluru Pulse</Text>
          </View>
          <Text style={styles.nowText}>{formatNow(now)}</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TODAY'S PULSE</Text>
          <View style={styles.heroNameRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name={STATE_ICON[pulse.state] ?? "warning"} size={18} color="#fff" />
            </View>
            <Text style={styles.heroName}>{pulse.headline || stateLabel[pulse.state]}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={[styles.advisory, { color: palette.ink }]}>{pulse.advisory}</Text>

        <View style={styles.acts}>
          {pulse.actions.map((action, i) => (
            <Pressable
              key={`${action.kind}-${i}`}
              onPress={() => onActionTap?.(action.kind)}
              style={({ pressed }) => [
                styles.act,
                { backgroundColor: palette.surface2, borderColor: palette.hair, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.actIcon, { backgroundColor: palette.indigoSoft }]}>
                <Ionicons name={ACTION_ICON[action.kind] ?? "time-outline"} size={15} color={palette.indigo} />
              </View>
              <Text style={[styles.actText, { color: palette.ink }]}>{action.text}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.areaRow, { backgroundColor: colors.bg, borderColor: colors.line }]}>
          <Text style={[styles.areaLeft, { color: palette.inkSoft }]}>
            Your area · <Text style={{ color: palette.ink, fontWeight: "600" }}>{pulse.area.name}</Text>
          </Text>
          <View style={styles.areaRight}>
            <View style={[styles.dot, { backgroundColor: colors.fg }]} />
            <Text style={[styles.areaRightText, { color: colors.fg }]}>
              FLOOD-PRONE: {pulse.area.floodProne.toUpperCase()}
            </Text>
          </View>
        </View>

        <TimelineScrubber
          timeline={pulse.timeline}
          value={scrubValue}
          onChangeComplete={onScrub}
          palette={palette}
          disabled={loading}
        />
      </View>

      <View style={[styles.footer, { borderTopColor: palette.hair }]}>
        <View style={styles.waIcon}>
          <Ionicons name="logo-whatsapp" size={10} color="#fff" />
        </View>
        <Text style={[styles.footerText, { color: palette.inkFaint }]} numberOfLines={1}>
          Updated {pulse.updatedAt} · delivered via WhatsApp opt-in{isMock ? " · offline demo data" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: "hidden",
    elevation: 6,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
  },
  header: { paddingTop: 22, paddingHorizontal: 18, paddingBottom: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", opacity: 0.92 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandText: { color: "#fff", fontFamily: "IBMPlexSans_600SemiBold", fontSize: 12.5 },
  nowText: { color: "#fff", fontFamily: "IBMPlexMono_400Regular", fontSize: 11, opacity: 0.85 },
  hero: { marginTop: 16 },
  heroLabel: {
    color: "#fff",
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 10.5,
    letterSpacing: 1.6,
    opacity: 0.8,
  },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 4 },
  heroIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: { color: "#fff", fontFamily: "IBMPlexSans_700Bold", fontSize: 28, letterSpacing: -0.5 },
  body: { padding: 18, gap: 15 },
  advisory: { fontFamily: "IBMPlexSans_400Regular", fontSize: 16.5, lineHeight: 24 },
  acts: { gap: 9 },
  act: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
  },
  actIcon: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  actText: { fontFamily: "IBMPlexSans_400Regular", fontSize: 14.5, flexShrink: 1 },
  areaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
  },
  areaLeft: { fontFamily: "IBMPlexSans_400Regular", fontSize: 13.5 },
  areaRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  areaRightText: { fontFamily: "IBMPlexMono_600SemiBold", fontSize: 12 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderTopWidth: 1,
  },
  waIcon: {
    width: 15,
    height: 15,
    borderRadius: 4,
    backgroundColor: "#25d366",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontFamily: "IBMPlexMono_400Regular", fontSize: 11, flexShrink: 1 },
});
