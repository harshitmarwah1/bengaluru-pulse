import { PulseGlyph, SunIcon, MoonIcon } from "./Icons";

interface Props {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: Props) {
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
        <span className="avatar">DK</span>
      </div>
    </div>
  );
}
