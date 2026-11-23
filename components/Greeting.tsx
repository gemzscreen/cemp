"use client";
import { useEffect, useState } from "react";
import { firstName } from "@/lib/names";

/** "Good morning/afternoon/evening, Name" using the viewer's own clock, plus today's date. */
export default function Greeting({ name }: { name: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const h = now?.getHours() ?? 9;
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="greet">
      <h1>{now ? part : "Welcome"}, {firstName(name, true)}</h1>
      <p>{now ? now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : " "}</p>
    </div>
  );
}
