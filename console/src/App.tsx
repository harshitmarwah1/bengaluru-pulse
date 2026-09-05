import { useTheme } from "./hooks/useTheme";
import { useSession } from "./hooks/useSession";
import { Login } from "./components/Login";
import { Console } from "./components/Console";

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const { session, loading, configured, signIn, signOut } = useSession();

  if (loading) {
    return <div className="app-status mono">Loading Bengaluru Pulse console…</div>;
  }

  if (!session) {
    return <Login configured={configured} onSignIn={signIn} />;
  }

  return <Console session={session} theme={theme} onToggleTheme={toggleTheme} onSignOut={signOut} />;
}
