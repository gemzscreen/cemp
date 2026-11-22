"use client";
import { useEffect, useRef } from "react";

/** Topic sidebar: always open on desktop; collapsed behind "Browse topics" on phones. */
export default function TopicNav({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (ref.current && window.matchMedia("(max-width: 860px)").matches) ref.current.open = false; }, []);
  return (
    <details ref={ref} className="lib-nav-wrap" open>
      <summary><span>☰ {label}</span><span aria-hidden>▾</span></summary>
      <aside className="lib-nav">{children}</aside>
    </details>
  );
}
