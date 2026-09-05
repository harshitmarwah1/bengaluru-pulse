import { PulseGlyph, SunIcon, MoonIcon } from "./Icons";

interface Props {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  officerEmail?: string;
  onSignOut: () => void;
}

function initialsFor(email?: string): string {
  if (!email) return "DK";
  const name = email.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return email.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Header({ theme, onToggleTheme, officerEmail, onSignOut }: Props) {
  return (
    <div className="c-head">
      <div className="b">
        <div className="g">
          <PulseGlyph />
        </div>
        <div className="t">
          Bengaluru Pulse
          <small>AGENCY CONSOLE</small>
        </div>
      </div>
      <div className="org">
        <span className="chip mono">DULT · Urban Mobility Mission</span>
        <button
          type="button"
          className="theme-btn"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          type="button"
          className="avatar"
          onClick={onSignOut}
          aria-label="Sign out"
          title={officerEmail ? `Sign out - ${officerEmail}` : "Sign out"}
        >
          {initialsFor(officerEmail)}
        </button>
      </div>
    </div>
  );
}
