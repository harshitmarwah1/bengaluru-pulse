# Bengaluru Pulse - Architecture & Design System

## Packages
```
bengaluru-pulse/
├─ server/    Node + TypeScript backend (Fastify or Express). Serves the API_CONTRACT.
│             Owns the scenario data (imports ../shared) + push fan-out via Expo Push API.
│             In-memory state only - NO database.
├─ console/   Vite + React + TypeScript + Tailwind. The agency web console (desktop-first).
│             Pure client of the server API. This is the deployable WEBSITE.
├─ mobile/    Expo (React Native + TypeScript). The citizen Pulse app (mobile).
│             Pure client of the server API. Real push via expo-notifications. This is the APP.
└─ shared/    TypeScript types (types.ts) + canonical scenario (scenario.ts). Do not edit in Wave 1.
```

## Data flow
```
shared/scenario.ts ─► server (GET /api/event, GET /api/pulse)
                         ▲                              │
        console ─ approve rec ─► POST /api/advisory/send│ Expo Push API
                                                        ▼
                                   mobile ◄── real push ── (phone / emulator)
                                   mobile ─ POST /api/push/register ─► server
```

## Design system - "Civic Authority"
Both faces MUST share this identity (it is the approved hi-fi design). The reference render is
`./DESIGN-REFERENCE.html` (open it in a browser - build to match it). `./WIREFRAMES-REFERENCE.html`
shows the annotated low-fi layout.

### Color tokens (light)
| Token | Hex | Use |
|---|---|---|
| indigo | `#26408b` | primary / accent, headers, primary buttons |
| indigo-2 | `#3a5bc7` | hover / interactive |
| indigo-ink | `#1c3068` | header gradient end |
| indigo-soft | `#e6ebf8` | accent tints, chips |
| ink | `#161b24` | primary text |
| ink-soft | `#4c5666` | secondary text |
| ink-faint | `#8a94a5` | meta / mono labels |
| paper | `#e9edf4` | app background |
| surface | `#ffffff` | cards |
| surface-2 | `#f3f6fa` | subtle fills |
| line | `#dbe1ec` | borders |

### Semantic risk states (the ONLY place color carries meaning)
| State | Color | BG | Border |
|---|---|---|---|
| Normal (ok) | `#1f7a54` | `#e2f0ea` | `#bfe0d0` |
| Delay Risk (warn) | `#b4791a` | `#f9efdb` | `#ecd6a8` |
| Disruption (crit) | `#c0392f` | `#f9e6e3` | `#eec3bd` |

### Dark theme
Provide a dark palette too (console: CSS media/[data-theme]; mobile: React Native `useColorScheme`).
Dark tokens (match hifi-design.html): paper `#0a0e15`, surface `#141a24`, ink `#e8ecf3`,
indigo `#6f8fe0`, ok `#4cc08d`, warn `#e0ab54`, crit `#e5726a`.

### Type
- **IBM Plex Sans** - UI + body.
- **IBM Plex Mono** - data, IDs, labels, timestamps, uppercase eyebrows (letter-spacing ~.12em).
- Console: load from Google Fonts. Mobile: use `expo-font` with `@expo-google-fonts/ibm-plex-sans`
  and `@expo-google-fonts/ibm-plex-mono` (fallback to system if load fails).

## What each face must contain (match the wireframes / hifi-design.html)

### console/ (agency)
- Header: brand + "DULT - Urban Mobility Mission" chip.
- Active Risk Event strip: LIVE dot, event id, corridor, lead time, current state tag.
- The flow rail: Risk -> Why -> Impact -> Intervention -> Owner -> Status.
- **Why**: flood-context map. Use a real map (Leaflet + OpenStreetMap tiles) centered on the
  Silk Board -> Marathahalli corridor, with the corridor nodes + waterlog pins from `floodContext`.
  A satellite/terrain tile layer is a plus. If Leaflet proves heavy, a styled SVG map matching the
  hifi placeholder is acceptable - but prefer a real map.
- **Impact**: KPI grid + confidence/uncertainty meters + contributing factors list.
- **Recommendations**: one row per recommendation (BTP/GBA/BMTC/DULT) with owner tag, status, and an
  **[Approve & assign]** button for `pending` ones -> POST approve -> status advances live.
- **Outcome**: prediction-vs-reality + North Star (avoided person-min), labeled an estimate.
- Desktop-first, responsive, light+dark.

### mobile/ (citizen)
- One glanceable Pulse card: indigo header with state hero (Normal/Delay/Disruption), advisory text,
  action rows, "your area flood-prone" line, a **timeline scrubber** (slider) that refetches
  `/api/pulse?at=` and updates the card.
- A **notifications** setup: on first open, request permission, get the Expo push token, POST it to
  `/api/push/register`. Show an opt-in toggle (WhatsApp-styled framing per the pilot).
- Tapping a received push opens the card at that event state.
- Bottom line: "delivered via WhatsApp opt-in" framing + updated time.
- Must run in **Expo Go** on a physical phone and in an emulator.

## Non-goals (do not build)
Auth, database, real ML, multiple scenarios/corridors, turn-by-turn, a standalone satellite browser.
All data is the single illustrative ORR scenario.
