// Construction management & QS calculators (v0.5.0).
import { type Calc, n, r } from "./core";

/** Standard normal CDF (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7). */
export function normCdf(z: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

type Act = { id: string; name: string; a: number; m: number; b: number; te: number; v: number; preds: string[]; es: number; ef: number; ls: number; lf: number };

/** Parse "ID, Name, duration | a m b, predecessors" lines. */
export function parseActivities(text: string): { acts: Act[]; errors: string[] } {
  const acts: Act[] = [], errors: string[] = [];
  text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).forEach((line, i) => {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) { errors.push(`Line ${i + 1}: need "ID, Name, duration, predecessors"`); return; }
    const [id, name, dur, pred = ""] = parts;
    const nums = dur.split(/\s+/).map(Number);
    if (nums.some((x) => !Number.isFinite(x) || x < 0) || !(nums.length === 1 || nums.length === 3)) { errors.push(`Line ${i + 1}: duration must be "d" or "a m b"`); return; }
    const [a, m, b] = nums.length === 1 ? [nums[0], nums[0], nums[0]] : nums;
    if (!(a <= m && m <= b)) errors.push(`${id}: needs a ≤ m ≤ b`);
    const preds = pred.split(/[\s;]+/).map((p) => p.trim()).filter((p) => p && p !== "-");
    acts.push({ id, name, a, m, b, te: (a + 4 * m + b) / 6, v: ((b - a) / 6) ** 2, preds, es: 0, ef: 0, ls: 0, lf: 0 });
  });
  const ids = new Set(acts.map((x) => x.id));
  if (ids.size !== acts.length) errors.push("Duplicate activity IDs");
  acts.forEach((x) => x.preds.forEach((p) => ids.has(p) || errors.push(`${x.id}: unknown predecessor ${p}`)));
  return { acts, errors };
}

export function cpm(acts: Act[]) {
  const byId = new Map(acts.map((a) => [a.id, a]));
  const order: Act[] = [], state = new Map<string, number>();
  const visit = (a: Act): boolean => {
    if (state.get(a.id) === 2) return true;
    if (state.get(a.id) === 1) return false; // cycle
    state.set(a.id, 1);
    for (const p of a.preds) if (!visit(byId.get(p)!)) return false;
    state.set(a.id, 2); order.push(a); return true;
  };
  for (const a of acts) if (!visit(a)) return null;
  for (const a of order) { a.es = Math.max(0, ...a.preds.map((p) => byId.get(p)!.ef)); a.ef = a.es + a.te; }
  const T = Math.max(...order.map((a) => a.ef));
  for (const a of [...order].reverse()) {
    const succ = order.filter((s) => s.preds.includes(a.id));
    a.lf = succ.length ? Math.min(...succ.map((s) => s.ls)) : T; a.ls = a.lf - a.te;
  }
  return { order, T };
}

const pertCpm: Calc = {
  key: "pert-cpm",
  title: "PERT / CPM schedule: critical path, float and probability",
  clauses: [],
  fields: [
    { key: "acts", label: "Activities: ID, Name, duration (or a m b), predecessors", type: "text", rows: 8,
      default: "A, Site clearing, 2 3 4, -\nB, Excavation, 3 5 7, A\nC, Footings, 4 6 10, B\nD, Column forms, 2 3 4, B\nE, Columns, 3 4 5, C D\nF, Slab, 5 7 12, E",
      help: "One activity per line. Single number = deterministic (CPM). Three numbers = optimistic, most likely, pessimistic (PERT). Separate predecessors with spaces; '-' for none." },
    { key: "target", label: "Target completion (for probability)", unit: "days", type: "number", default: 28 },
  ],
  compute(i) {
    const { acts, errors } = parseActivities(String(i.acts));
    if (errors.length || !acts.length) return { results: [{ label: "Input error", value: errors[0] ?? "No activities", main: true }], checks: errors.map((e) => ({ label: "Input", ok: false, detail: e })), steps: [] };
    const res = cpm(acts);
    if (!res) return { results: [{ label: "Input error", value: "Loop in predecessors", main: true }], checks: [{ label: "Network", ok: false, detail: "Circular dependency" }], steps: [] };
    const { order, T } = res;
    const crit = order.filter((a) => Math.abs(a.ls - a.es) < 1e-9);
    const varSum = crit.reduce((s, a) => s + a.v, 0), sd = Math.sqrt(varSum);
    const target = n(i.target);
    const z = sd > 0 ? (target - T) / sd : target >= T ? Infinity : -Infinity;
    const p = sd > 0 ? normCdf(z) : target >= T ? 1 : 0;
    const f = (x: number) => r(x, 2);
    return {
      results: [
        { label: "Project duration (expected)", value: f(T), unit: "days", main: true },
        { label: "Critical path", value: crit.map((a) => a.id).join(" → "), main: true },
        { label: "σ of critical path", value: f(sd), unit: "days" },
        { label: `P(finish ≤ ${target} days)`, value: `${r(p * 100, 1)}%`, main: true },
      ],
      checks: [
        { label: "Network valid", ok: true, detail: `${order.length} activities, no loops` },
        { label: "Near-critical paths", ok: true, detail: `${order.filter((a) => a.ls - a.es > 0 && a.ls - a.es <= 2).map((a) => a.id).join(", ") || "none"} have ≤ 2 days float: watch these too` },
      ],
      steps: [
        "te = (a + 4m + b)/6; variance = ((b − a)/6)²",
        "Forward pass: ES = max EF of predecessors; EF = ES + te. Backward pass: LF = min LS of successors; LS = LF − te; float = LS − ES",
        `Σ variance on critical path = ${f(varSum)} → σ = ${f(sd)} days`,
        `z = (${target} − ${f(T)}) / ${f(sd)} = ${Number.isFinite(z) ? f(z) : "∞"} → P = ${r(p * 100, 1)}%`,
      ],
      table: {
        columns: ["ID", "Activity", "Pred.", "te", "ES", "EF", "LS", "LF", "Float"],
        rows: order.map((a) => [a.id, a.name, a.preds.join(" ") || "–", f(a.te), f(a.es), f(a.ef), f(a.ls), f(a.lf), f(a.ls - a.es)]),
        highlight: order.map((a, k) => (crit.includes(a) ? k : -1)).filter((k) => k >= 0),
      },
    };
  },
};

const peso = (x: number) => `₱${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const costBuildup: Calc = {
  key: "cost-buildup",
  title: "Cost estimate build-up: direct cost, OCM, profit, VAT, unit cost",
  clauses: [],
  fields: [
    { key: "qty", label: "Quantity", type: "number", default: 10 },
    { key: "unit", label: "Unit", type: "select", default: "m³", options: ["m³", "m²", "m", "kg", "lot", "pc"].map((u) => ({ value: u, label: u })) },
    { key: "mat", label: "Materials cost (total)", unit: "₱", type: "number", default: 65000 },
    { key: "crew", label: "Crew size", unit: "workers", type: "number", default: 6 },
    { key: "rate", label: "Average daily rate incl. benefits", unit: "₱/day", type: "number", default: 750, help: "Use current regional wage + mandatory contributions" },
    { key: "days", label: "Crew-days", unit: "days", type: "number", default: 3 },
    { key: "eqp", label: "Equipment / tools cost", unit: "₱", type: "number", default: 5000 },
    { key: "ocm", label: "OCM (overhead, contingencies, misc.)", unit: "%", type: "number", default: 15 },
    { key: "profit", label: "Profit", unit: "%", type: "number", default: 10 },
    { key: "vat", label: "VAT", unit: "%", type: "number", default: 12 },
  ],
  compute(i) {
    const qty = n(i.qty), mat = n(i.mat), labor = n(i.crew) * n(i.rate) * n(i.days), eqp = n(i.eqp);
    const dc = mat + labor + eqp;
    const ocm = (dc * n(i.ocm)) / 100, profit = (dc * n(i.profit)) / 100;
    const sub = dc + ocm + profit, vat = (sub * n(i.vat)) / 100, total = sub + vat;
    return {
      results: [
        { label: "Total cost", value: peso(total), main: true },
        { label: `Unit cost per ${i.unit}`, value: qty > 0 ? peso(total / qty) : "–", main: true },
        { label: "Direct cost", value: peso(dc) },
        { label: "Indirect (OCM + profit)", value: peso(ocm + profit) },
        { label: "VAT", value: peso(vat) },
      ],
      checks: [
        { label: "Labor share of direct cost", ok: true, detail: `${r((labor / dc) * 100, 1)}% (materials ${r((mat / dc) * 100, 1)}%, equipment ${r((eqp / dc) * 100, 1)}%)` },
        { label: "Indirect percentages", ok: true, detail: "DPWH sets OCM/profit by cost bracket in its current Department Order: verify for government jobs" },
      ],
      steps: [
        `Labor = ${i.crew} × ${peso(n(i.rate))} × ${i.days} days = ${peso(labor)}`,
        `Direct cost = materials + labor + equipment = ${peso(mat)} + ${peso(labor)} + ${peso(eqp)} = ${peso(dc)}`,
        `OCM = ${i.ocm}% × DC = ${peso(ocm)}; Profit = ${i.profit}% × DC = ${peso(profit)}`,
        `VAT = ${i.vat}% × (DC + OCM + profit) = ${peso(vat)}`,
        `Total = ${peso(total)}; unit cost = ${peso(total)} / ${qty} ${i.unit} = ${qty > 0 ? peso(total / qty) : "–"}`,
      ],
      table: { columns: ["Component", "Amount", "% of total"], rows: [
        ["Materials", peso(mat), `${r((mat / total) * 100, 1)}%`], ["Labor", peso(labor), `${r((labor / total) * 100, 1)}%`],
        ["Equipment", peso(eqp), `${r((eqp / total) * 100, 1)}%`], ["OCM", peso(ocm), `${r((ocm / total) * 100, 1)}%`],
        ["Profit", peso(profit), `${r((profit / total) * 100, 1)}%`], ["VAT", peso(vat), `${r((vat / total) * 100, 1)}%`], ["Total", peso(total), "100%"]] },
    };
  },
};

/* Concrete materials per m³ (40 kg bags, common PH factors). */
const MIX: Record<string, { label: string; cement: number; sand: number; gravel: number }> = {
  AA: { label: "Class AA 1:1.5:3", cement: 12.0, sand: 0.5, gravel: 1.0 },
  A: { label: "Class A 1:2:4", cement: 9.0, sand: 0.5, gravel: 1.0 },
  B: { label: "Class B 1:2.5:5", cement: 7.5, sand: 0.5, gravel: 1.0 },
  C: { label: "Class C 1:3:6", cement: 6.0, sand: 0.5, gravel: 1.0 },
};
const concreteTakeoff: Calc = {
  key: "concrete-materials-takeoff",
  title: "Concrete materials takeoff: cement, sand, gravel",
  clauses: ["Item 405"],
  fields: [
    { key: "L", label: "Length", unit: "m", type: "number", default: 4 },
    { key: "W", label: "Width", unit: "m", type: "number", default: 0.3 },
    { key: "H", label: "Depth / thickness", unit: "m", type: "number", default: 0.5 },
    { key: "count", label: "Number of identical members", type: "number", default: 10 },
    { key: "mix", label: "Mix class", type: "select", default: "A", options: Object.entries(MIX).map(([k, v]) => ({ value: k, label: v.label })) },
    { key: "waste", label: "Waste allowance", unit: "%", type: "number", default: 5 },
  ],
  compute(i) {
    const V = n(i.L) * n(i.W) * n(i.H) * n(i.count), Vw = V * (1 + n(i.waste) / 100);
    const m = MIX[String(i.mix)] ?? MIX.A;
    const bags = Math.ceil(Vw * m.cement), sand = Vw * m.sand, gravel = Vw * m.gravel;
    return {
      results: [
        { label: "Concrete volume (net)", value: r(V, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: bags, unit: "bags", main: true },
        { label: "Sand", value: r(sand, 2), unit: "m³", main: true },
        { label: "Gravel", value: r(gravel, 2), unit: "m³", main: true },
      ],
      checks: [{ label: "Factors are site-mix estimating values", ok: true, detail: "Ready-mix or designed mixes: use the approved mix design instead" }],
      steps: [
        `V = ${i.L} × ${i.W} × ${i.H} × ${i.count} = ${r(V, 4)} m³; with ${i.waste}% waste = ${r(Vw, 4)} m³`,
        `${m.label}: ${m.cement} bags, ${m.sand} m³ sand, ${m.gravel} m³ gravel per m³`,
        `Cement = ${r(Vw, 4)} × ${m.cement} = ${r(Vw * m.cement, 2)} → ${bags} bags; sand = ${r(sand, 3)} m³; gravel = ${r(gravel, 3)} m³`,
      ],
    };
  },
};

const rebarTakeoff: Calc = {
  key: "rebar-weight-takeoff",
  title: "Rebar takeoff: weight and commercial lengths",
  clauses: ["Item 404"],
  fields: [
    { key: "db", label: "Bar diameter", unit: "mm", type: "number", default: 16 },
    { key: "pieces", label: "Number of bars", type: "number", default: 40 },
    { key: "len", label: "Cut length per bar (incl. hooks & laps)", unit: "m", type: "number", default: 2.9 },
    { key: "stock", label: "Commercial length", type: "select", default: "6", options: ["6", "7.5", "9", "10.5", "12"].map((v) => ({ value: v, label: `${v} m` })) },
  ],
  compute(i) {
    const db = n(i.db), pcs = n(i.pieces), len = n(i.len), stock = n(i.stock);
    const kgm = (db * db) / 162.2;
    const perStock = Math.floor(stock / len);
    const stocks = perStock > 0 ? Math.ceil(pcs / perStock) : NaN;
    const netKg = pcs * len * kgm, buyKg = stocks * stock * kgm;
    return {
      results: [
        { label: "Net weight", value: r(netKg, 1), unit: "kg", main: true },
        { label: `Buy ${stock} m bars`, value: Number.isFinite(stocks) ? stocks : "Cut length > stock: splice needed", unit: "pcs", main: true },
        { label: "Weight purchased", value: Number.isFinite(buyKg) ? r(buyKg, 1) : "–", unit: "kg" },
        { label: "Cutting waste", value: Number.isFinite(buyKg) ? `${r(((buyKg - netKg) / buyKg) * 100, 1)}%` : "–" },
      ],
      checks: [{ label: "Pieces per commercial bar", ok: perStock > 0, detail: `${perStock} cut(s) of ${len} m from each ${stock} m bar; offcut ${r(stock - perStock * len, 2)} m` }],
      steps: [
        `Mass = d²/162.2 = ${db}²/162.2 = ${r(kgm, 3)} kg/m`,
        `Net = ${pcs} × ${len} × ${r(kgm, 3)} = ${r(netKg, 2)} kg`,
        `Cuts per ${stock} m bar = floor(${stock}/${len}) = ${perStock} → bars to buy = ceil(${pcs}/${perStock}) = ${stocks}`,
      ],
    };
  },
};

export const CM_CALCS: Calc[] = [pertCpm, costBuildup, concreteTakeoff, rebarTakeoff];
