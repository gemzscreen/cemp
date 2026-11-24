"use client";
// Clamps long text to a few lines with a "Read more / Show less" toggle (only shown when the text overflows).
import { useEffect, useRef, useState } from "react";

export default function ReadMore({ text, lines = 3, className = "" }: { text: string; lines?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false), [over, setOver] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => setOver(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check); ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  return (
    <>
      <div ref={ref} className={`readmore ${className}`} style={open ? undefined : { WebkitLineClamp: lines, lineClamp: lines } as React.CSSProperties} data-open={open || undefined}>{text}</div>
      {(over || open) && <button type="button" className="readmore-btn no-print" onClick={() => setOpen(!open)}>{open ? "Show less" : "Read more"}</button>}
    </>
  );
}
