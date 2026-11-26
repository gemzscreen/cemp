// v2.2.0 project costing: one formula for the costing panel, the quotation page and the .xlsx export.
//
// Per item i:  M_i = Σ unit price × quantity (BOM lines, each rounded like the BOM: countable items up)
//              L_i = pct% × M_i            (mode "pct", quick quote)
//                  = crew × rate × days     (mode "crew")
//                  = crew-days × crew day cost, crew-days = work qty ÷ output (mode "trade", v2.5.0 presets in lib/labour.ts)
//              E_i = equipment / tools ₱
//              DC_i = M_i + L_i + E_i
// Project:     DC = Σ DC_i;  OCM = ocm% × DC;  Profit = profit% × DC;  VAT = vat% × (DC + OCM + Profit)
// Quotation:   item lump sum Q_i = DC_i × (1 + ocm% + profit%), rounded to centavos;
//              subtotal = Σ Q_i (sum of the rounded figures, so the printed column adds up); VAT on the subtotal.
import { groupByItem } from "@/lib/bom";
import type { Material, Inputs } from "@/lib/calc";
import { labourPreset, crewDays, crewDayCost, type Crew } from "@/lib/labour";
import { TRADES, type Trade } from "@/lib/rates";

export type LabourMode = "pct" | "crew" | "trade";
export type ItemCosting = { mode: LabourMode; pct: number; crew: number; rate: number; days: number; equip: number; out: number }; // out: trade output override (0 = preset)
export type QuoteInfo = { no: string; date: string; validity: number; payment: string; terms: string; notes: string };
export type Costing = { items: Record<string, ItemCosting>; ocm: number; profit: number; vat: number; quote: QuoteInfo };

export const DEFAULT_ITEM: ItemCosting = { mode: "pct", pct: 40, crew: 2, rate: 750, days: 1, equip: 0, out: 0 };
export const DEFAULT_LABOUR = Object.fromEntries(Object.entries(TRADES).map(([k, v]) => [k, v.rate])) as Record<Trade, number>;
export const DEFAULT_QUOTE: QuoteInfo = {
  no: "", date: "", validity: 30,
  payment: "50% down payment upon acceptance, 40% progress billing, 10% upon completion and turnover.",
  terms: "Prices are based on the quantities in this quotation; changes in scope are billed as variations. Excludes permits and fees unless listed.",
  notes: "",
};
export const DEFAULT_COSTING: Costing = { items: {}, ocm: 15, profit: 10, vat: 12, quote: DEFAULT_QUOTE };

const num = (v: unknown, d: number) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? x : d; };
export const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

/** Fill gaps and clamp: stored JSON can be old, partial or hand-edited. */
export function normalizeCosting(raw: unknown): Costing {
  const c = (raw && typeof raw === "object" ? raw : {}) as Partial<Costing>;
  const items: Record<string, ItemCosting> = {};
  for (const [id, v] of Object.entries((c.items ?? {}) as Record<string, Partial<ItemCosting>>)) {
    items[id] = {
      mode: v?.mode === "crew" || v?.mode === "trade" ? v.mode : "pct", out: num(v?.out, 0),
      pct: Math.min(500, num(v?.pct, DEFAULT_ITEM.pct)), crew: num(v?.crew, DEFAULT_ITEM.crew),
      rate: num(v?.rate, DEFAULT_ITEM.rate), days: num(v?.days, DEFAULT_ITEM.days), equip: num(v?.equip, 0),
    };
  }
  const q = (c.quote ?? {}) as Partial<QuoteInfo>;
  const str = (s: unknown, d: string, max: number) => (typeof s === "string" ? s : d).slice(0, max);
  return {
    items,
    ocm: Math.min(100, num(c.ocm, DEFAULT_COSTING.ocm)), profit: Math.min(100, num(c.profit, DEFAULT_COSTING.profit)), vat: Math.min(100, num(c.vat, DEFAULT_COSTING.vat)),
    quote: { no: str(q.no, "", 40), date: str(q.date, "", 10), validity: Math.round(num(q.validity, 30)),
      payment: str(q.payment, DEFAULT_QUOTE.payment, 600), terms: str(q.terms, DEFAULT_QUOTE.terms, 1500), notes: str(q.notes, "", 1500) },
  };
}

export type TradeCalc = { qty: number; unit: string; measure: string; output: number; presetOutput: number; days: number; dayCost: number; crew: Crew; basis: string };
export type ItemCost = { id: string; no: number; label: string; calcKey: string; lines: number; unpriced: number;
  materials: number; labour: number; equip: number; direct: number; lump: number; cfg: ItemCosting; trade: TradeCalc | null };
export type ProjectCost = { items: ItemCost[]; materials: number; labour: number; equip: number; direct: number;
  ocm: number; profit: number; subtotal: number; vat: number; total: number; unpriced: number; markup: number };

/** Trade-crew build-up for an item (null if its calculator has no preset). */
export function tradeOf(calcKey: string, inputs: Inputs | undefined, cfg: ItemCosting, rates: Record<Trade, number>): TradeCalc | null {
  const p = inputs ? labourPreset(calcKey, inputs) : null;
  if (!p) return null;
  const output = cfg.out > 0 ? cfg.out : p.output, days = crewDays(p.qty, output), dayCost = crewDayCost(p.crew, rates);
  return { qty: p.qty, unit: p.unit, measure: p.measure, output, presetOutput: p.output, days, dayCost, crew: p.crew, basis: p.basis };
}
export function labourOf(cfg: ItemCosting, materials: number, trade: TradeCalc | null = null) {
  if (cfg.mode === "trade") return trade ? trade.days * trade.dayCost : 0;
  return cfg.mode === "crew" ? cfg.crew * cfg.rate * cfg.days : (cfg.pct / 100) * materials;
}

export function computeCost(
  items: { id: string; label: string; calcKey: string; materials: Material[]; inputs?: Inputs }[],
  prices: Record<string, number>,
  costing: Costing,
  labourRates: Record<Trade, number> = DEFAULT_LABOUR,
): ProjectCost {
  const inputsOf = new Map(items.map((i) => [i.id, i.inputs]));
  const markup = (costing.ocm + costing.profit) / 100;
  const rows: ItemCost[] = groupByItem(items).map((g) => {
    const cfg = costing.items[g.id] ?? DEFAULT_ITEM;
    let materials = 0, unpriced = 0;
    for (const l of g.lines) { const p = prices[l.key]; if (p == null) unpriced++; else materials += p * l.show; }
    const trade = tradeOf(g.calcKey, inputsOf.get(g.id), cfg, labourRates);
    const labour = labourOf(cfg, materials, trade), equip = cfg.equip, direct = materials + labour + equip;
    return { id: g.id, no: g.no, label: g.label, calcKey: g.calcKey, lines: g.lines.length, unpriced,
      materials, labour, equip, direct, lump: round2(direct * (1 + markup)), cfg, trade };
  });
  const sum = (f: (r: ItemCost) => number) => rows.reduce((s, r) => s + f(r), 0);
  const direct = sum((r) => r.direct);
  const subtotal = round2(sum((r) => r.lump));
  const vat = round2((subtotal * costing.vat) / 100);
  return {
    items: rows, materials: sum((r) => r.materials), labour: sum((r) => r.labour), equip: sum((r) => r.equip), direct,
    ocm: (direct * costing.ocm) / 100, profit: (direct * costing.profit) / 100,
    subtotal, vat, total: round2(subtotal + vat), unpriced: sum((r) => r.unpriced), markup,
  };
}

export const peso = (x: number) => `₱${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Default quotation number: Q-YYMMDD-<4 chars of the project id>. */
export const quoteNo = (projectId: string, d = new Date()) =>
  `Q-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${projectId.slice(0, 4).toUpperCase()}`;

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function words999(n: number): string {
  const h = Math.floor(n / 100), t = n % 100;
  const tt = t < 20 ? ONES[t] : TENS[Math.floor(t / 10)] + (t % 10 ? `-${ONES[t % 10]}` : "");
  return [h ? `${ONES[h]} Hundred` : "", tt].filter(Boolean).join(" ");
}
/** 34125.5 → "Thirty-Four Thousand One Hundred Twenty-Five Pesos and 50/100" (cheque style). */
export function pesoWords(x: number): string {
  const v = round2(Math.abs(x)), whole = Math.floor(v), cents = Math.round((v - whole) * 100);
  const scales = ["", "Thousand", "Million", "Billion"];
  const parts: string[] = [];
  let w = whole, k = 0;
  while (w > 0 && k < scales.length) { const g = w % 1000; if (g) parts.unshift([words999(g), scales[k]].filter(Boolean).join(" ")); w = Math.floor(w / 1000); k++; }
  return `${parts.join(" ") || "Zero"} ${whole === 1 ? "Peso" : "Pesos"} and ${String(cents).padStart(2, "0")}/100`;
}
