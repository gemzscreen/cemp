"use client";
import { useEffect, useState } from "react";

/** Live local date and time, e.g. "Sun 22 Nov 2026 · 20:41" (updates every 15 s). */
export default function Clock({ className = "fclock" }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t); }, []);
  if (!now) return <span className={className} />;
  return (
    <span className={className} suppressHydrationWarning>
      {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
