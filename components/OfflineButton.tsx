"use client";
import { useState } from "react";

/** Asks the service worker to store pages (and their scripts) for offline use, e.g. before going to site. */
export default function OfflineButton({ urls, label = "Make available offline" }: { urls: string[]; label?: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const run = async () => {
    if (!("serviceWorker" in navigator)) return setMsg("This browser doesn't support offline pages.");
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg?.active) return setMsg("Offline support starts after the app is installed or reloaded once. Try again in a moment.");
    setMsg(`Saving ${urls.length} page(s)…`);
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type !== "precached") return;
      navigator.serviceWorker.removeEventListener("message", onMsg);
      setMsg(`Saved ${ev.data.count} of ${ev.data.total} page(s) for offline use on this device.`);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    reg.active.postMessage({ type: "precache", urls });
  };
  return (
    <span className="no-print" style={{ display: "inline-flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" className="btn ghost" style={{ width: "auto", marginTop: 0 }} onClick={run}>⤓ {label}</button>
      {msg && <span className="fine">{msg}</span>}
    </span>
  );
}
