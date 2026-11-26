// v2.5.0: one builder for the quotation (draft page, "Issue" action, frozen revisions).
// A snapshot holds exactly what QuoteDoc prints, so an issued revision re-renders identically later.
import { CALCS } from "@/lib/calc";
import { computeCost, normalizeCosting, quoteNo, type Costing, type ProjectCost, type QuoteInfo } from "@/lib/costing";
import { normalizeIssuer, type Issuer } from "@/lib/issuer";
import { normalizeRates } from "@/lib/rates";
import type { Material, Inputs } from "@/lib/calc";

export const manilaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
export const longDate = (iso: string) => new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" });
export const addDays = (iso: string, d: number) => { const t = new Date(`${iso}T00:00:00+08:00`); t.setDate(t.getDate() + d); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(t); };
export const revNo = (base: string, rev: number) => (rev > 0 ? `${base}-R${rev}` : base);

export type QuoteSnap = {
  rev: number; issuedAt?: string;
  r: Pick<ProjectCost, "subtotal" | "vat" | "total"> & { items: Pick<ProjectCost["items"][number], "id" | "no" | "label" | "calcKey" | "lump">[] };
  costing: Pick<Costing, "vat">; q: QuoteInfo; iss: Issuer; signer: string;
  project: { name: string; client: string | null; location: string | null };
  calcTitles: Record<string, string>; dateLong: string; validUntil: string | null;
};

type ProjectRow = { id: string; name: string; client: string | null; location: string | null; items: unknown; prices: unknown; costing: unknown };

/** Draft quotation from live project data. `rev` = the number this draft would get when issued. */
export function buildQuote(p: ProjectRow, issuerRaw: unknown, ratesRaw: unknown, fullName: string | null, rev: number) {
  const items = (p.items ?? []) as { id: string; label: string; calcKey: string; materials: Material[]; inputs?: Inputs }[];
  const costing = normalizeCosting(p.costing);
  const base = costing.quote.no || quoteNo(p.id);
  const q: QuoteInfo = { ...costing.quote, no: revNo(base, rev), date: costing.quote.date || manilaToday() };
  const full = computeCost(items, (p.prices ?? {}) as Record<string, number>, costing, normalizeRates(ratesRaw as never).labour);
  const iss = normalizeIssuer(issuerRaw);
  const snap: QuoteSnap = {
    rev,
    r: { subtotal: full.subtotal, vat: full.vat, total: full.total, items: full.items.map(({ id, no, label, calcKey, lump }) => ({ id, no, label, calcKey, lump })) },
    costing: { vat: costing.vat }, q, iss, signer: iss.name || fullName || "",
    project: { name: p.name, client: p.client, location: p.location },
    calcTitles: Object.fromEntries(items.map((it) => [it.calcKey, CALCS[it.calcKey]?.title ?? it.calcKey])),
    dateLong: longDate(q.date), validUntil: q.validity > 0 ? longDate(addDays(q.date, q.validity)) : null,
  };
  return { snap, full, base };
}

/** What changed between two issued revisions (for the revision list). */
export function diffSnaps(prev: QuoteSnap, cur: QuoteSnap) {
  const a = new Map(prev.r.items.map((i) => [i.id, i])), b = new Map(cur.r.items.map((i) => [i.id, i]));
  const added = cur.r.items.filter((i) => !a.has(i.id)).map((i) => i.label);
  const removed = prev.r.items.filter((i) => !b.has(i.id)).map((i) => i.label);
  const changed = cur.r.items.filter((i) => a.has(i.id) && Math.abs(a.get(i.id)!.lump - i.lump) >= 0.01).map((i) => ({ label: i.label, from: a.get(i.id)!.lump, to: i.lump }));
  return { added, removed, changed, delta: cur.r.total - prev.r.total, termsChanged: prev.q.payment !== cur.q.payment || prev.q.terms !== cur.q.terms || prev.q.notes !== cur.q.notes };
}
