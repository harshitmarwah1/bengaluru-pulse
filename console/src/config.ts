// Single source of truth for the server base URL. Override via VITE_API_BASE
// (see .env). Defaults to the local dev server on port 4000.
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:4000";
