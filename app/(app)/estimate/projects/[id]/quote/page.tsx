// v2.2.0: client quotation (print / Save as PDF). One lump sum per item; the BOM and cost build-up stay internal.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/auth";
import { CALCS } from "@/lib/calc";
import { computeCost, normalizeCosting, quoteNo } from "@/lib/costing";
import { normalizeIssuer } from "@/lib/issuer";
import PrintButton from "@/components/PrintButton";
import QuoteEditor from "@/components/QuoteEditor";
import QuoteDoc from "@/components/QuoteDoc";
import type { EstItem } from "../../../actions";

export const metadata = { title: "Quotation" };

const manilaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()); // YYYY-MM-DD
const longDate = (iso: string) => new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" });
const addDays = (iso: string, d: number) => { const t = new Date(`${iso}T00:00:00+08:00`); t.setDate(t.getDate() + d); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(t); };

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, fullName } = await getMe();
  const [{ data: p }, { data: prof }] = await Promise.all([
    supabase.from("estimate_projects").select("*").eq("id", id).maybeSingle(),
    user ? supabase.from("profiles").select("issuer").eq("id", user.id).single() : Promise.resolve({ data: null }),
  ]);
  if (!p) notFound();
  const items = (p.items ?? []) as EstItem[];
  const prices = (p.prices ?? {}) as Record<string, number>;
  const costing = normalizeCosting(p.costing);
  const q = { ...costing.quote, no: costing.quote.no || quoteNo(id), date: costing.quote.date || manilaToday() };
  const r = computeCost(items, prices, costing);
  const iss = normalizeIssuer(prof?.issuer);
  const signer = iss.name || fullName || "";

  return (
    <>
      <div className="no-print quote-bar">
        <p className="sub" style={{ margin: 0 }}><Link href={`/estimate/projects/${id}`}>← {p.name}</Link> · <Link href={`/estimate/projects/${id}#costing`}>Costing</Link></p>
        <div className="est-actions">
          <a className="btn ghost" href={`/estimate/projects/${id}/xlsx`}>Excel (.xlsx)</a>
          <PrintButton />
        </div>
      </div>
      {(!iss.name && !iss.company) && <div className="msg warn no-print" style={{ marginBottom: ".8rem" }}>Add your company, licence and contact details once in <Link href="/account#quotation">Profile → Quotation details</Link>.</div>}
      {r.unpriced > 0 && <div className="msg warn no-print" style={{ marginBottom: ".8rem" }}>{r.unpriced} material line(s) have no unit price and count as ₱0. <Link href={`/estimate/projects/${id}`}>Price them first.</Link></div>}
      <QuoteEditor projectId={id} costing={costing} defaults={{ no: q.no, date: q.date }} />

      <QuoteDoc r={r} costing={costing} q={q} iss={iss} signer={signer} project={{ name: p.name, client: p.client, location: p.location }} calcTitles={Object.fromEntries(items.map((it) => [it.calcKey, CALCS[it.calcKey]?.title ?? it.calcKey]))} dateLong={longDate(q.date)} validUntil={q.validity > 0 ? longDate(addDays(q.date, q.validity)) : null} />
    </>
  );
}
