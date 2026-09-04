# Bengaluru Pulse - API Contract (v1)

This is the **binding interface** between the three packages. The `server/` implements it;
`console/` and `mobile/` are clients. Build to this contract exactly - during parallel development,
`mobile/` may mock these responses using the example payloads below, and Wave 2 wires it to the real
server.

- **Base URL (local dev):** `http://localhost:4000`
- **Content-Type:** `application/json`
- **CORS:** server must allow the console origin (`http://localhost:5173`) and Expo/dev origins (`*` is acceptable for the local MVP).
- Types are defined in `shared/types.ts`. The canonical data is `shared/scenario.ts`.

---

## GET `/api/event`
Full risk event for the **agency console**. Returns the `PulseEvent` object.

**200 response** (abridged - full object is `EVENT` from `shared/scenario.ts`):
```json
{
  "id": "2026-0904-ORR-E",
  "corridor": "ORR East - Silk Board to Marathahalli",
  "windowLabel": "5:00-8:00 PM",
  "leadTimeMin": 45,
  "updatedAt": "4:15 PM",
  "state": "delay",
  "confidencePct": 72,
  "uncertaintyMin": 15,
  "impact": { "addedTravelMin": [25,40], "peopleAffected": 120000, "busRoutesExposed": 18, "junctionsInSpread": 3 },
  "factors": [ { "kind":"rain","label":"IMD nowcast:","detail":"heavy rain 4:30-6:30 PM" } ],
  "floodContext": { "corridorNodes":[...], "waterlogPins":[...], "source":"ISRO Bhuvan ..." },
  "recommendations": [ { "id":"rec-btp-ecospace","owner":"BTP","title":"...","detail":"...","priority":1,"status":"pending" } ],
  "outcome": { "flaggedAt":"4:15 PM","actualPeakDelayMin":31,"predictedRange":[25,40],"withinPrediction":true,"avoidedPersonMin":14000,"baselineNote":"..." },
  "timeline": [ { "time":"4:15 PM","clockMinutes":975,"state":"delay","citizenHeadline":"Delay Risk","advisory":"...","confidencePct":72 } ]
}
```

## GET `/api/pulse?at=<clockMinutes>`
Citizen subset for the **mobile app**. Returns a `CitizenPulse`. Optional `at` query (minutes since
midnight) selects the timeline snapshot for the scrubber; omitted = current (`updatedAt`) snapshot.

**200 response:**
```json
{
  "eventId": "2026-0904-ORR-E",
  "state": "delay",
  "headline": "Delay Risk",
  "advisory": "Rain plus ORR congestion may add 25-40 min ... Leave before 4:45 PM or take the Metro.",
  "actions": [ { "kind":"time","text":"Leave before 4:45 PM" }, { "kind":"metro","text":"Or take the Metro (Purple Line)" } ],
  "area": { "name":"Marathahalli","floodProne":"High" },
  "updatedAt": "4:15 PM",
  "channel": "WhatsApp",
  "timeline": [ ... ]
}
```

## POST `/api/push/register`
Mobile app registers its Expo push token so the server can push to it.

**Request:**
```json
{ "expoPushToken": "ExponentPushToken[xxxxxxxx]", "area": "Marathahalli" }
```
**200 response:** `{ "ok": true, "registered": 1 }`

The server stores tokens **in memory** (an array is fine for the MVP - no database). Deduplicate by
token.

## POST `/api/advisory/send`
Triggered by the console's DULT "Push citizen advisory" recommendation. The server:
1. builds a `PushMessage` from the current `CitizenPulse`,
2. sends it to every registered Expo push token via the **Expo Push API**
   (`https://exp.host/--/api/v2/push/send`),
3. marks the `rec-dult-advisory` recommendation `sent` with meta `"Sent <time> - <n> reached"`.

**Request (optional override):**
```json
{ "at": 975 }
```
**200 response:**
```json
{ "ok": true, "sent": 1, "message": { "title":"Bengaluru Pulse: Delay Risk", "body":"Rain plus ORR congestion ...", "data": { "eventId":"2026-0904-ORR-E","state":"delay" } } }
```

If there are **no registered tokens** (e.g. demoing without a phone), still return `200` with
`"sent": 0` so the console can show a graceful "simulated - no device registered" state.

## POST `/api/recommendations/:id/approve`
Console approves/assigns a recommendation (recommend-and-account). Advances status:
`pending -> awaiting` (and for `rec-dult-advisory`, calls the advisory-send path). Returns the
updated `Recommendation`.

**200 response:**
```json
{ "id":"rec-btp-ecospace","owner":"BTP","title":"...","detail":"...","priority":1,"status":"awaiting","statusMeta":"Assigned - awaiting BTP" }
```

## GET `/api/health`
`{ "ok": true }` - used by Wave 2 integration checks.

---

## Expo Push - server implementation note
Sending a real push is a single POST per token to `https://exp.host/--/api/v2/push/send`:
```json
{ "to": "ExponentPushToken[...]", "title": "Bengaluru Pulse: Delay Risk", "body": "Rain plus ORR congestion ...", "data": { "eventId":"2026-0904-ORR-E", "state":"delay" } }
```
Use the `expo-server-sdk` npm package (handles chunking + receipts) or a plain `fetch`. No API key is
required for basic Expo push. Tokens come from `/api/push/register`.
