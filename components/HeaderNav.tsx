"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/NavIcon";

/** Main navigation: inline on desktop, a slide-down panel behind a ☰ button on phones. */
export default function HeaderNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <button type="button" className="hamburger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span /><span /><span />
      </button>
      <nav className={`nav ${open ? "open" : ""}`}>
        <Link href="/" className={path === "/" ? "active" : ""}><NavIcon name="dashboard" /> Dashboard</Link>
        {children}
      </nav>
    </>
  );
}
