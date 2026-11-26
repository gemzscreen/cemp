"use client";
// v2.2.0: quotation number, date, validity, payment terms, terms and notes (saved with the project costing).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Costing } from "@/lib/costing";
import { saveCosting } from "@/app/(app)/estimate/actions";

export default function QuoteEditor({ projectId, costing, defaults }: { projectId: string; costing: Costing; defaults: { no: string; date: string } }) {
  const [q, setQ] = useState({ ...costing.quote, no: costing.quote.no || defaults.no, date: costing.quote.date || defaults.date });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof typeof q, v: string | number) => { setQ((x) => ({ ...x, [k]: v })); setMsg(null); };
  const save = () => start(async () => {
    const r = await saveCosting(projectId, { ...costing, quote: q });
    setMsg(r.ok ? "Saved." : r.error ?? "Could not save.");
    if (r.ok) router.refresh();
  });
  return (
    <details className="panel no-print quote-edit" open={!costing.quote.no}>
      <summary><strong>Quotation details</strong> <span className="fine">number, date, validity, terms</span></summary>
      <div className="tool-grid" style={{ marginTop: ".6rem" }}>
        <label className="fld"><span>Quotation no.</span><input value={q.no} maxLength={40} onChange={(e) => set("no", e.target.value)} /></label>
        <label className="fld"><span>Date</span><input type="date" value={q.date} onChange={(e) => set("date", e.target.value)} /></label>
        <label className="fld"><span>Valid for (days, 0 to hide)</span><input inputMode="numeric" value={q.validity} onChange={(e) => set("validity", Math.max(0, Math.round(Number(e.target.value) || 0)))} /></label>
      </div>
      <label className="fld"><span>Payment terms</span><textarea rows={2} maxLength={600} value={q.payment} onChange={(e) => set("payment", e.target.value)} /></label>
      <label className="fld"><span>Terms and conditions</span><textarea rows={3} maxLength={1500} value={q.terms} onChange={(e) => set("terms", e.target.value)} /></label>
      <label className="fld"><span>Notes (optional)</span><textarea rows={2} maxLength={1500} value={q.notes} onChange={(e) => set("notes", e.target.value)} /></label>
      <button type="button" className="btn" style={{ width: "auto" }} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save quotation details"}</button>
      {msg && <span className="fine" style={{ marginLeft: ".6rem" }}>{msg}</span>}
    </details>
  );
}
