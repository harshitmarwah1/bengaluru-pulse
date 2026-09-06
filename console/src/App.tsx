import type { Session } from "@supabase/supabase-js";
import { useTheme } from "./hooks/useTheme";
import { useSession } from "./hooks/useSession";
import { Login } from "./components/Login";
import { Console } from "./components/Console";

// DEV-ONLY: VITE_DEV_BYPASS_AUTH=1 renders the console with a synthetic session
// so the UI can be reviewed against a server running in DEV_UNAUTHED mode
// (no Supabase). Never enable in a deployed build.
const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === "1";
const DEV_SESSION = {
  user: { id: "dev-officer", email: "officer@dult.gov.in" },
} as unknown as Session;

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const { session, loading, configured, signIn, signOut } = useSession();

  if (DEV_BYPASS_AUTH) {
    return <Console session={DEV_SESSION} theme={theme} onToggleTheme={toggleTheme} onSignOut={signOut} />;
  }

  if (loading) {
    return <div className="app-status mono">Loading Bengaluru Pulse console…</div>;
  }

  if (!session) {
    return <Login configured={configured} onSignIn={signIn} />;
  }

  return <Console session={session} theme={theme} onToggleTheme={toggleTheme} onSignOut={signOut} />;
}
