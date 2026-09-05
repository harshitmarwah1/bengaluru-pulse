import { useState } from "react";
import type { FormEvent } from "react";
import { PulseGlyph, LockIcon } from "./Icons";

interface Props {
  configured: boolean;
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
}

export function Login({ configured, onSignIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!configured || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await onSignIn(email, password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-glyph">
            <PulseGlyph />
          </div>
          <div className="login-title">
            Bengaluru Pulse
            <small>AGENCY CONSOLE</small>
          </div>
        </div>
        <div className="login-eyebrow mono">
          <LockIcon /> Officer sign-in · DULT Urban Mobility Mission
        </div>

        <label className="login-field">
          <span className="mono">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            disabled={!configured || submitting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="officer@dult.gov.in"
          />
        </label>
        <label className="login-field">
          <span className="mono">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            disabled={!configured || submitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && <div className="login-error mono">{error}</div>}

        <button type="submit" className="btn login-submit" disabled={!configured || submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        {!configured && (
          <div className="login-warning mono">
            Supabase auth is not configured in this environment (VITE_SUPABASE_URL /
            VITE_SUPABASE_ANON_KEY missing) - sign-in is disabled.
          </div>
        )}
      </form>
    </div>
  );
}
