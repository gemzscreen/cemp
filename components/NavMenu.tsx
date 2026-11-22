"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Dropdown built on <details>: closes after navigation, on outside click and on Escape. */
export default function NavMenu({ label, children, align = "left", className = "" }: { label: React.ReactNode; children: React.ReactNode; align?: "left" | "right"; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname(), qs = useSearchParams();
  useEffect(() => { ref.current?.removeAttribute("open"); }, [path, qs]);
  useEffect(() => {
    const close = (e: Event) => {
      if (!ref.current?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current.contains(e.target as Node)) ref.current.removeAttribute("open");
    };
    document.addEventListener("click", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", close); };
  }, []);
  return (
    <details ref={ref} className={`navmenu ${align} ${className}`}>
      <summary>{label} <span className="caret">▾</span></summary>
      <div className="navmenu-body">{children}</div>
    </details>
  );
}
