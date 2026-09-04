# Bengaluru Pulse - MVP

A cross-agency mobility decision-support system for rain-driven disruption in Bengaluru.
Two faces, one scenario (ORR East, Silk Board -> Marathahalli, evening rain):

- **console/** - the agency web console (deployable website)
- **mobile/** - the citizen Pulse app (native, real push notifications)
- **server/** - the API + push fan-out
- **shared/** - types + canonical scenario data

See `ARCHITECTURE.md` and `API_CONTRACT.md`. Product spec: `../docs/PRD.md`. Design: `../design/hifi-design.html`.

## Run locally (all three)
```bash
# 1. Server (terminal 1)
cd server && npm install && npm run dev        # http://localhost:4000

# 2. Console (terminal 2)
cd console && npm install && npm run dev        # http://localhost:5173

# 3. Mobile (terminal 3)
cd mobile && npm install && npx expo start       # scan QR with Expo Go, or press i / a
```

To receive a real push: open the mobile app (grants permission + registers its token), then in the
console approve the DULT "Push citizen advisory" recommendation.

> Illustrative data only. Public-data-first, recommend-and-account. Not affiliated with any agency.
