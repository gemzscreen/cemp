"use client";
// v2.8.0: Night / Light / Auto, the same three choices as darkwizscroll. Stored per device in localStorage "cemp-theme";
// the pre-paint script in app/layout.tsx applies it on every load.
import { useEffect, useState, type ReactElement } from "react";

type Mode = "dark" | "light" | "auto";
const KEY = "cemp-theme";
const ICON: Record<Mode, ReactElement> = {
  dark: <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>,
  light: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  auto: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5z" fill="currentColor" /></svg>,
};
const LABEL: Record<Mode, string> = { dark: "Night", light: "Light", auto: "Auto (follow device)" };

function apply(m: Mode) {
  const dark = m === "dark" || (m === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.mode = m;
}

export default function ThemeSwitch() {
  const [mode, setMode] = useState<Mode>("auto");
  useEffect(() => {
    let m: Mode = "auto";
    try { m = (localStorage.getItem(KEY) as Mode) || "auto"; } catch {}
    setMode(m);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => { if ((document.documentElement.dataset.mode ?? "auto") === "auto") apply("auto"); };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const pick = (m: Mode) => { setMode(m); try { localStorage.setItem(KEY, m); } catch {} apply(m); };
  return (
    <div className="theme-sw" role="radiogroup" aria-label="Display">
      {(["dark", "light", "auto"] as Mode[]).map((m) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => pick(m)} title={LABEL[m]} aria-label={LABEL[m]}>{ICON[m]}</button>
      ))}
    </div>
  );
}
