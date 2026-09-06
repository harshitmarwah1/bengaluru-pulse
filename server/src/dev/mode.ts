// Bengaluru Pulse - DEV-ONLY affordance. NOT a production code path.
//
// DEV_UNAUTHED=1 lets the server run with NO Supabase configured: officer auth
// is skipped (a stub officer is injected) and every console/mobile data route
// is served from the canonical shared/scenario.ts event held in an in-memory
// store (see dev/store.ts). This exists so the console/mobile UI can be
// reviewed locally before a real Supabase project is stood up.
//
// Double-guarded so it can never silently activate in production: it requires
// the explicit DEV_UNAUTHED=1 opt-in AND a non-production NODE_ENV.
import type { Officer } from "../auth/officer";

export const DEV_UNAUTHED =
  process.env.DEV_UNAUTHED === "1" && process.env.NODE_ENV !== "production";

/** The synthetic officer injected on every request while DEV_UNAUTHED is on. */
export const DEV_OFFICER: Officer = {
  id: "00000000-0000-0000-0000-0000000d0dev",
  name: "Dev Officer",
  agency: "DULT",
  role: "admin",
};
