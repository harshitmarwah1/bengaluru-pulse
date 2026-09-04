// Bengaluru Pulse (mobile) - the event-window scrubber.
// Dragging re-fetches GET /api/pulse?at=<clockMinutes> (see app/api.ts) and the whole card
// updates: state hero color, headline, advisory. Network calls fire only on release
// (onSlidingComplete), not on every drag frame.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";

import { EVENT_WINDOW } from "../app/config";
import { Palette, stateColors } from "../app/theme";
import { formatClockMinutes } from "../app/time";
import type { TimelineSnapshot } from "../app/types";

interface Props {
  timeline: TimelineSnapshot[];
  value: number;
  onChangeComplete: (clockMinutes: number) => void;
  palette: Palette;
  disabled?: boolean;
}

export default function TimelineScrubber({ timeline, value, onChangeComplete, palette, disabled }: Props) {
  const [dragValue, setDragValue] = useState<number | null>(null);
  const displayValue = dragValue ?? value;

  return (
    <View style={styles.wrap}>
      <View style={styles.capRow}>
        <Text style={[styles.capText, { color: palette.inkFaint }]}>2 PM</Text>
        <Text style={[styles.capText, { color: palette.inkFaint }]}>
          {dragValue != null ? formatClockMinutes(dragValue) : "event window"}
        </Text>
        <Text style={[styles.capText, { color: palette.inkFaint }]}>8 PM</Text>
      </View>

      <View style={[styles.track, { backgroundColor: palette.surface2, borderColor: palette.hair }]}>
        <View style={styles.segmentsRow} pointerEvents="none">
          {timeline.map((snap, i) => {
            const colors = stateColors(palette, snap.state);
            const reached = displayValue >= snap.clockMinutes;
            return (
              <View
                key={`${snap.clockMinutes}-${i}`}
                style={[
                  styles.segment,
                  { backgroundColor: colors.bg, opacity: reached ? 1 : 0.4 },
                ]}
              />
            );
          })}
        </View>
        <Slider
          style={StyleSheet.absoluteFill}
          minimumValue={EVENT_WINDOW.startMinutes}
          maximumValue={EVENT_WINDOW.endMinutes}
          step={5}
          value={value}
          disabled={disabled}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor={palette.indigo}
          onValueChange={setDragValue}
          onSlidingComplete={(v) => {
            setDragValue(null);
            onChangeComplete(v);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  capRow: { flexDirection: "row", justifyContent: "space-between" },
  capText: {
    fontFamily: "IBMPlexMono_500Medium",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  track: {
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
  },
  segmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
    height: 26,
  },
  segment: { flex: 1, height: 26, borderRadius: 6, marginHorizontal: 2 },
});
