// Bengaluru Pulse (mobile) - "Civic Authority" design tokens.
// Source of truth: ../../ARCHITECTURE.md (exact hex values) + ../../DESIGN-REFERENCE.html
// (structural roles for tokens ARCHITECTURE.md doesn't spell out, e.g. dark surface-2/line).

import { useColorScheme } from "react-native";

export interface Palette {
  indigo: string;
  indigo2: string;
  indigoInk: string;
  indigoSoft: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  paper: string;
  surface: string;
  surface2: string;
  line: string;
  hair: string;
  ok: string;
  okBg: string;
  okLine: string;
  warn: string;
  warnBg: string;
  warnLine: string;
  crit: string;
  critBg: string;
  critLine: string;
  onIndigo: string; // text/icon color that sits on the indigo header
}

export const lightPalette: Palette = {
  indigo: "#26408b",
  indigo2: "#3a5bc7",
  indigoInk: "#1c3068",
  indigoSoft: "#e6ebf8",
  ink: "#161b24",
  inkSoft: "#4c5666",
  inkFaint: "#8a94a5",
  paper: "#e9edf4",
  surface: "#ffffff",
  surface2: "#f3f6fa",
  line: "#dbe1ec",
  hair: "#e6ebf3",
  ok: "#1f7a54",
  okBg: "#e2f0ea",
  okLine: "#bfe0d0",
  warn: "#b4791a",
  warnBg: "#f9efdb",
  warnLine: "#ecd6a8",
  crit: "#c0392f",
  critBg: "#f9e6e3",
  critLine: "#eec3bd",
  onIndigo: "#ffffff",
};

export const darkPalette: Palette = {
  indigo: "#6f8fe0",
  indigo2: "#8aa4ea",
  indigoInk: "#b8c8f2",
  indigoSoft: "#1a2438",
  ink: "#e8ecf3",
  inkSoft: "#98a3b5",
  inkFaint: "#657084",
  paper: "#0a0e15",
  surface: "#141a24",
  surface2: "#0f151e",
  line: "#242d3b",
  hair: "#1c2432",
  ok: "#4cc08d",
  okBg: "#122820",
  okLine: "#1f4536",
  warn: "#e0ab54",
  warnBg: "#2a2213",
  warnLine: "#463619",
  crit: "#e5726a",
  critBg: "#2c1815",
  critLine: "#4a2620",
  onIndigo: "#0a0e15",
};

export function usePalette(): { palette: Palette; scheme: "light" | "dark" } {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { palette: scheme === "dark" ? darkPalette : lightPalette, scheme };
}

export const stateLabel: Record<string, string> = {
  normal: "Normal",
  delay: "Delay Risk",
  disruption: "Disruption",
};

export function stateColors(palette: Palette, state: string) {
  switch (state) {
    case "normal":
      return { fg: palette.ok, bg: palette.okBg, line: palette.okLine };
    case "delay":
      return { fg: palette.warn, bg: palette.warnBg, line: palette.warnLine };
    case "disruption":
    default:
      return { fg: palette.crit, bg: palette.critBg, line: palette.critLine };
  }
}

export const radius = { card: 27, sm: 9, md: 10, lg: 14 };
