// v2.5.0: personal rate table (table user_rates): materials price list + labour trade rates.
// Labour defaults are ₱/day including benefits, a starting point for Iligan/CDO small jobs: Region X minimum wage
// ₱500/day (Category I) from 1 May 2026 (Wage Order RX-24, second tranche) + about 20% for 13th month and employer
// SSS / PhilHealth / Pag-IBIG shares for helpers; skilled trades are market estimates. VERIFY and edit on /estimate/rates.
export type Trade = "foreman" | "mason" | "carpenter" | "steelman" | "tilesetter" | "painter" | "plumber" | "electrician" | "welder" | "helper";
export const TRADES: Record<Trade, { name: string; rate: number }> = {
  foreman: { name: "Foreman", rate: 950 },
  mason: { name: "Mason", rate: 750 },
  carpenter: { name: "Carpenter", rate: 750 },
  steelman: { name: "Steelman (rebar)", rate: 750 },
  tilesetter: { name: "Tile setter", rate: 750 },
  painter: { name: "Painter", rate: 700 },
  plumber: { name: "Plumber", rate: 800 },
  electrician: { name: "Electrician", rate: 800 },
  welder: { name: "Welder / fabricator", rate: 850 },
  helper: { name: "Helper / laborer", rate: 600 },
};
export const WAGE_NOTE = "Helper rate starts from the Region X minimum wage of ₱500/day (Category I, from 1 May 2026, Wage Order RX-24) plus about 20% for 13th month and employer SSS, PhilHealth and Pag-IBIG shares. Skilled rates are market estimates: verify for your area.";

export type MatRate = { name: string; unit: string; price: number; note?: string; at: string };

// v2.8.0: several named labour rate sets (e.g. PH Region X, PH Region IX, Brunei). A project picks one; the set's
// currency labels the money and `vat: false` means the quotation carries no VAT (Brunei has no VAT/GST).
export type Currency = "PHP" | "BND";
export const CURRENCIES: Record<Currency, { sym: string; name: string; unit: [string, string] }> = {
  PHP: { sym: "₱", name: "Philippine peso (₱)", unit: ["Peso", "Pesos"] },
  BND: { sym: "B$", name: "Brunei dollar (B$)", unit: ["Brunei Dollar", "Brunei Dollars"] },
};
export type RateSet = { id: string; name: string; currency: Currency; vat: boolean; labour: Record<Trade, number>; note?: string };
export type Rates = { materials: Record<string, MatRate>; labour: Record<Trade, number>; sets: RateSet[] };
export const DEFAULT_SET_ID = "ph-r10";

const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? x : null; };
export function normalizeRates(row: { materials?: unknown; labour?: unknown; sets?: unknown } | null | undefined): Rates {
  const labour = Object.fromEntries((Object.keys(TRADES) as Trade[]).map((t) => [t, num((row?.labour as Record<string, unknown> | undefined)?.[t]) ?? TRADES[t].rate])) as Record<Trade, number>;
  const materials: Record<string, MatRate> = {};
  for (const [k, v] of Object.entries((row?.materials ?? {}) as Record<string, Partial<MatRate>>)) {
    const p = num(v?.price);
    if (p == null || !/^[\w.\-]{1,60}$/.test(k)) continue;
    materials[k] = { name: String(v?.name ?? k).slice(0, 120), unit: String(v?.unit ?? "").slice(0, 20), price: p, note: v?.note ? String(v.note).slice(0, 120) : undefined, at: String(v?.at ?? "").slice(0, 10) };
  }
  const sets: RateSet[] = [];
  const seen = new Set<string>();
  for (const raw of (Array.isArray((row as { sets?: unknown })?.sets) ? (row as { sets: unknown[] }).sets : []) as Partial<RateSet>[]) {
    const id = String(raw?.id ?? "").slice(0, 40);
    if (!/^[a-z0-9-]{1,40}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    const cur: Currency = raw?.currency === "BND" ? "BND" : "PHP";
    sets.push({
      id, name: String(raw?.name ?? id).slice(0, 60) || id, currency: cur, vat: raw?.vat !== false,
      labour: Object.fromEntries((Object.keys(TRADES) as Trade[]).map((t) => [t, num((raw?.labour as Record<string, unknown> | undefined)?.[t]) ?? labour[t]])) as Record<Trade, number>,
      note: raw?.note ? String(raw.note).slice(0, 200) : undefined,
    });
  }
  // Older rows (v2.5) have one labour table: it becomes the first set.
  if (!sets.length) sets.push({ id: DEFAULT_SET_ID, name: "PH Region X", currency: "PHP", vat: true, labour });
  return { materials, labour: sets[0].labour, sets };
}

/** The rate set a project uses (falls back to the first set). */
export const rateSetOf = (rates: Rates, id?: string | null) => rates.sets.find((s) => s.id === id) ?? rates.sets[0];
export const curSym = (c?: Currency) => CURRENCIES[c ?? "PHP"].sym;
