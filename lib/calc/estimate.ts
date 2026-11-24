// Estimating calculators (v1.1.0): quantity takeoff of materials for common PH building work.
// Factors default to common PH estimating practice (40 kg cement bags) and stay editable.
// Rebar is counted bar by bar from spacing/cover, then cut from commercial stock lengths.
import { type Calc, type Field, type Inputs, type Material, type Preset, n, r } from "./core";

/* ---------------- shared factors ---------------- */
export const MIX: Record<string, { label: string; c: number; s: number; g: number }> = {
  AA: { label: "Class AA 1:1.5:3", c: 12.0, s: 0.5, g: 1.0 },
  A: { label: "Class A 1:2:4", c: 9.0, s: 0.5, g: 1.0 },
  B: { label: "Class B 1:2.5:5", c: 7.5, s: 0.5, g: 1.0 },
  C: { label: "Class C 1:3:6", c: 6.0, s: 0.5, g: 1.0 },
};
/** Mortar per m³ (PH practice): bags of 40 kg cement, m³ sand. */
export const MORTAR: Record<string, { label: string; c: number; s: number }> = {
  A: { label: "Class A 1:2", c: 18.0, s: 1.0 }, B: { label: "Class B 1:3", c: 12.0, s: 1.0 },
  C: { label: "Class C 1:4", c: 9.0, s: 1.0 }, D: { label: "Class D 1:5", c: 7.5, s: 1.0 },
};
/** CHB laying mortar per m² of wall (PH practice table): cement bags by class, sand m³. */
export const CHB_MORTAR: Record<string, { A: number; B: number; C: number; D: number; sand: number }> = {
  "100": { A: 0.792, B: 0.522, C: 0.394, D: 0.328, sand: 0.0435 },
  "150": { A: 1.526, B: 1.018, C: 0.763, D: 0.633, sand: 0.0844 },
  "200": { A: 2.260, B: 1.500, C: 1.125, D: 0.938, sand: 0.1250 },
};
export const CHB_PER_M2 = 12.5;                 // 400 × 200 mm face incl. joints
export const WIRE16_KG_M = 0.01555;             // No. 16 GI tie wire (1.59 mm)
export const PLYWOOD_M2 = 1.22 * 2.44;          // one 4' × 8' sheet
export const kgPerM = (d: number) => (d * d) / 162.2;
const up = (x: number, d = 2) => Math.ceil(x * 10 ** d - 1e-9) / 10 ** d;

/* ---------------- shared field builders ---------------- */
const STOCKS = ["6", "7.5", "9", "10.5", "12"].map((v) => ({ value: v, label: `${v} m` }));
const DIAS = [8, 10, 12, 16, 20, 25, 28].map((d) => ({ value: String(d), label: `${d} mm` }));
const mixFields = (g = "Concrete mix (PH practice, editable)"): Field[] => [
  { key: "mix", label: "Concrete class", type: "select", default: "A", group: g, options: Object.entries(MIX).map(([k, v]) => ({ value: k, label: v.label })) },
  { key: "cf", label: "Cement per m³", unit: "bags", type: "number", default: 9, group: g },
  { key: "sf", label: "Sand per m³", unit: "m³", type: "number", default: 0.5, group: g },
  { key: "gf", label: "Gravel per m³", unit: "m³", type: "number", default: 1.0, group: g },
  { key: "waste", label: "Concrete waste", unit: "%", type: "number", default: 5, group: g },
];
const mixPreset: Preset = { from: ["mix"], label: "PH practice: concrete per m³", map: Object.fromEntries(Object.entries(MIX).map(([k, v]) => [k, { cf: v.c, sf: v.s, gf: v.g }])) };
const stockField = (g = "Reinforcement"): Field => ({ key: "stock", label: "Commercial bar length", type: "select", default: "6", group: g, options: STOCKS });
const diaField = (key: string, label: string, def: number, g = "Reinforcement"): Field => ({ key, label, type: "select", default: String(def), group: g, options: DIAS });
const tieField = (g = "Reinforcement"): Field => ({ key: "tie", label: "Tie wire per intersection", unit: "m", type: "number", default: 0.3, group: g, help: "No. 16 GI wire" });
const formFields = (g = "Formwork"): Field[] => [
  { key: "reuse", label: "Plywood uses (re-use count)", type: "number", default: 1, group: g, min: 1 },
];

/* ---------------- shared quantity helpers ---------------- */
export type BarGroup = { d: number; len: number; n: number; what: string };
export type BarBuy = { d: number; pieces: number; lengthM: number; kg: number };
/** Pieces of stock bars to buy for groups of cut bars. Cuts longer than stock get lap splices. */
export function buyBars(groups: BarGroup[], stock: number, lapDb = 40): BarBuy[] {
  const byD = new Map<number, BarBuy>();
  for (const g of groups) {
    if (g.n <= 0 || g.len <= 0) continue;
    const lap = (lapDb * g.d) / 1000;
    let pcs: number, len: number;
    if (g.len <= stock) {
      pcs = Math.ceil(g.n / Math.floor(stock / g.len));
      len = g.n * g.len;
    } else {
      const splices = Math.ceil((g.len - stock) / (stock - lap));
      len = g.n * (g.len + splices * lap);
      pcs = Math.ceil(len / stock);
    }
    const b = byD.get(g.d) ?? { d: g.d, pieces: 0, lengthM: 0, kg: 0 };
    b.pieces += pcs; b.lengthM += len; b.kg += len * kgPerM(g.d);
    byD.set(g.d, b);
  }
  return [...byD.values()].sort((a, b) => a.d - b.d);
}
export type Conc = { V: number; Vw: number; cement: number; sand: number; gravel: number };
export function concrete(V: number, i: Inputs): Conc {
  const Vw = V * (1 + n(i.waste) / 100);
  return { V, Vw, cement: Math.ceil(Vw * n(i.cf) - 1e-9), sand: up(Vw * n(i.sf)), gravel: up(Vw * n(i.gf)) };
}
const plySheets = (area: number, uses: number) => Math.ceil(area / PLYWOOD_M2 / Math.max(1, uses) - 1e-9);
const wireKg = (intersections: number, tie: number) => up(intersections * tie * WIRE16_KG_M, 1);

function concMaterials(c: Conc): Material[] {
  return [
    { key: "cement-40kg", name: "Portland cement (40 kg)", unit: "bags", qty: c.cement },
    { key: "sand", name: "Sand", unit: "m³", qty: c.sand },
    { key: "gravel", name: "Gravel (¾\")", unit: "m³", qty: c.gravel },
  ];
}
function barMaterials(bars: BarBuy[], stock: number): Material[] {
  return bars.map((b) => ({ key: `rebar-${b.d}-${stock}`, name: `Deformed bar ${b.d} mm × ${stock} m`, unit: "pcs", qty: b.pieces }));
}
const wireMat = (kg: number): Material => ({ key: "tie-wire-16", name: "Tie wire No. 16", unit: "kg", qty: kg });
const formMats = (area: number, uses: number): Material[] => area > 0 ? [
  { key: "formwork-area", name: "Formwork contact area", unit: "m²", qty: up(area) },
  { key: "plywood-sheet", name: "Plywood ½\" (4' × 8')", unit: "sheets", qty: plySheets(area, uses) },
] : [];

function concSteps(c: Conc, i: Inputs, expr: string): string[] {
  return [
    `Concrete V = ${expr} = ${r(c.V, 4)} m³; with ${n(i.waste)}% waste = ${r(c.Vw, 4)} m³`,
    `Cement = ${r(c.Vw, 4)} × ${n(i.cf)} = ${r(c.Vw * n(i.cf), 2)} → ${c.cement} bags; sand = ${r(c.Vw, 4)} × ${n(i.sf)} = ${c.sand} m³; gravel = ${r(c.Vw, 4)} × ${n(i.gf)} = ${c.gravel} m³`,
  ];
}
const barRows = (groups: BarGroup[]) => groups.filter((g) => g.n > 0).map((g) => [g.what, `${g.d} mm`, g.n, r(g.len, 3), r(g.n * g.len, 2)]);
const barTable = (groups: BarGroup[]) => ({ columns: ["Bars", "Ø", "No.", "Cut length (m)", "Total (m)"], rows: barRows(groups) });
const buyResults = (bars: BarBuy[], stock: number) => bars.map((b) => ({ label: `${b.d} mm bars (${stock} m)`, value: b.pieces, unit: "pcs", main: true }));
const buySteps = (bars: BarBuy[], stock: number) => bars.map((b) => `${b.d} mm: ${r(b.lengthM, 2)} m incl. laps → ${b.pieces} pcs of ${stock} m (${r(b.kg, 1)} kg at d²/162.2 = ${r(kgPerM(b.d), 3)} kg/m)`);
/** Number of bars at spacing s across a width w with cover c (both ends included). */
export const across = (w: number, s: number, c: number) => (w - 2 * c > 0 && s > 0 ? Math.floor((w - 2 * c) / s + 1e-9) + 1 : 0);

/* =================================================================== */
/* 1. Isolated footing                                                  */
const footing: Calc = {
  key: "est-footing", title: "Concrete footing (isolated)", clauses: [],
  presets: [mixPreset],
  fields: [
    { key: "count", label: "Number of identical footings", type: "number", default: 1, group: "Dimensions", min: 1 },
    { key: "L", label: "Length", unit: "m", type: "number", default: 1.5, group: "Dimensions" },
    { key: "W", label: "Width", unit: "m", type: "number", default: 1.5, group: "Dimensions" },
    { key: "t", label: "Thickness", unit: "m", type: "number", default: 0.35, group: "Dimensions" },
    ...mixFields(),
    diaField("d", "Bar diameter (both ways)", 12),
    { key: "s", label: "Spacing (both ways)", unit: "m", type: "number", default: 0.15, group: "Reinforcement" },
    { key: "cover", label: "Concrete cover", unit: "m", type: "number", default: 0.075, group: "Reinforcement" },
    { key: "hook", label: "Bend/hook allowance per bar", unit: "m", type: "number", default: 0, group: "Reinforcement", help: "Add e.g. 2 × 12db if bars are hooked up at the ends" },
    stockField(), tieField(),
    { key: "forms", label: "Side forms", type: "select", default: "1", group: "Formwork", options: [{ value: "1", label: "Formed sides" }, { value: "0", label: "Cast against earth (no forms)" }] },
    ...formFields(),
  ],
  compute(i) {
    const N = Math.max(1, Math.round(n(i.count))), L = n(i.L), W = n(i.W), t = n(i.t), d = n(i.d), s = n(i.s), c = n(i.cover), h = n(i.hook), stock = n(i.stock);
    const cn = concrete(L * W * t * N, i);
    const nL = across(W, s, c), nW = across(L, s, c);           // bars running along L are spaced across W
    const groups: BarGroup[] = [
      { d, len: L - 2 * c + h, n: nL * N, what: "Along length" },
      { d, len: W - 2 * c + h, n: nW * N, what: "Along width" },
    ];
    const bars = buyBars(groups, stock);
    const wire = wireKg(nL * nW * N, n(i.tie));
    const fa = n(i.forms) ? 2 * (L + W) * t * N : 0;
    return {
      results: [
        { label: "Concrete", value: r(cn.Vw, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: cn.cement, unit: "bags", main: true },
        { label: "Sand", value: cn.sand, unit: "m³" }, { label: "Gravel", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock),
        { label: "Tie wire No. 16", value: wire, unit: "kg" },
        { label: "Formwork", value: r(fa, 2), unit: "m²" },
      ],
      checks: [
        { label: "Bar count per footing", ok: nL > 1 && nW > 1, detail: `${nL} bars along L × ${nW} bars along W at ${s} m` },
        { label: "Footing size from design", ok: true, detail: "This is a quantity takeoff: size and reinforcement come from the structural design" },
      ],
      steps: [
        ...concSteps(cn, i, `${L} × ${W} × ${t} × ${N}`),
        `Bars along L: n = ⌊(${W} − 2×${c})/${s}⌋ + 1 = ${nL}, cut = ${L} − 2×${c} + ${h} = ${r(L - 2 * c + h, 3)} m`,
        `Bars along W: n = ⌊(${L} − 2×${c})/${s}⌋ + 1 = ${nW}, cut = ${W} − 2×${c} + ${h} = ${r(W - 2 * c + h, 3)} m`,
        ...buySteps(bars, stock),
        `Tie wire = ${nL}×${nW}×${N} intersections × ${n(i.tie)} m × ${WIRE16_KG_M} kg/m = ${wire} kg`,
        `Formwork = 2(L+W) × t × N = ${r(fa, 3)} m²`,
      ],
      table: barTable(groups),
      materials: [...concMaterials(cn), ...barMaterials(bars, stock), wireMat(wire), ...formMats(fa, n(i.reuse))],
    };
  },
};

/* 2. Wall (strip) footing */
const wallFooting: Calc = {
  key: "est-wall-footing", title: "Wall footing (strip)", clauses: [],
  presets: [mixPreset],
  fields: [
    { key: "L", label: "Total length of footing", unit: "m", type: "number", default: 20, group: "Dimensions" },
    { key: "B", label: "Width", unit: "m", type: "number", default: 0.6, group: "Dimensions" },
    { key: "t", label: "Thickness", unit: "m", type: "number", default: 0.25, group: "Dimensions" },
    ...mixFields(),
    { key: "nl", label: "Longitudinal bars (count)", type: "number", default: 3, group: "Reinforcement" },
    diaField("dl", "Longitudinal bar Ø", 12),
    diaField("dt", "Transverse bar Ø", 10),
    { key: "st", label: "Transverse spacing", unit: "m", type: "number", default: 0.2, group: "Reinforcement" },
    { key: "cover", label: "Concrete cover", unit: "m", type: "number", default: 0.075, group: "Reinforcement" },
    stockField(), tieField(),
    { key: "forms", label: "Side forms", type: "select", default: "0", group: "Formwork", options: [{ value: "1", label: "Formed sides" }, { value: "0", label: "Cast against earth (no forms)" }] },
    ...formFields(),
  ],
  compute(i) {
    const L = n(i.L), B = n(i.B), t = n(i.t), c = n(i.cover), stock = n(i.stock), nl = Math.round(n(i.nl)), dl = n(i.dl), dt = n(i.dt), st = n(i.st);
    const cn = concrete(L * B * t, i);
    const nt = across(L, st, c);
    const groups: BarGroup[] = [
      { d: dl, len: L - 2 * c, n: nl, what: "Longitudinal" },
      { d: dt, len: B - 2 * c, n: nt, what: "Transverse" },
    ];
    const bars = buyBars(groups, stock);
    const wire = wireKg(nl * nt, n(i.tie));
    const fa = n(i.forms) ? 2 * L * t : 0;
    return {
      results: [
        { label: "Concrete", value: r(cn.Vw, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: cn.cement, unit: "bags", main: true },
        { label: "Sand", value: cn.sand, unit: "m³" }, { label: "Gravel", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock), { label: "Tie wire No. 16", value: wire, unit: "kg" }, { label: "Formwork", value: r(fa, 2), unit: "m²" },
      ],
      checks: [{ label: "Long bars are spliced", ok: true, detail: L - 2 * c > stock ? `Cut ${r(L - 2 * c, 2)} m > ${stock} m stock: 40db laps added` : "No splices needed" }],
      steps: [...concSteps(cn, i, `${L} × ${B} × ${t}`), `Transverse: n = ⌊(${L} − 2×${c})/${st}⌋ + 1 = ${nt} @ ${r(B - 2 * c, 3)} m`, ...buySteps(bars, stock),
        `Tie wire = ${nl} × ${nt} × ${n(i.tie)} m × ${WIRE16_KG_M} = ${wire} kg`],
      table: barTable(groups),
      materials: [...concMaterials(cn), ...barMaterials(bars, stock), wireMat(wire), ...formMats(fa, n(i.reuse))],
    };
  },
};

/* 3. Beam (tie beam, girder, lintel) */
const stirrupCut = (b: number, h: number, c: number, ds: number) => 2 * (b - 2 * c) + 2 * (h - 2 * c) + 2 * Math.max(6 * ds / 1000, 0.075);
const beam: Calc = {
  key: "est-beam", title: "Beam: tie beam, girder or lintel", clauses: [],
  presets: [mixPreset],
  fields: [
    { key: "count", label: "Number of identical beams", type: "number", default: 1, group: "Dimensions", min: 1 },
    { key: "L", label: "Beam length", unit: "m", type: "number", default: 4, group: "Dimensions" },
    { key: "b", label: "Width b", unit: "m", type: "number", default: 0.25, group: "Dimensions" },
    { key: "h", label: "Depth h", unit: "m", type: "number", default: 0.4, group: "Dimensions" },
    ...mixFields(),
    { key: "ntop", label: "Top bars (count)", type: "number", default: 2, group: "Reinforcement" },
    { key: "nbot", label: "Bottom bars (count)", type: "number", default: 3, group: "Reinforcement" },
    diaField("d", "Main bar Ø", 16),
    { key: "ext", label: "Extension into supports, each end", unit: "m", type: "number", default: 0.3, group: "Reinforcement" },
    diaField("ds", "Stirrup Ø", 10),
    { key: "ss", label: "Stirrup spacing", unit: "m", type: "number", default: 0.15, group: "Reinforcement" },
    { key: "cover", label: "Cover", unit: "m", type: "number", default: 0.04, group: "Reinforcement" },
    stockField(), tieField(),
    { key: "forms", label: "Forms", type: "select", default: "3", group: "Formwork", options: [{ value: "3", label: "Bottom + 2 sides (suspended)" }, { value: "2", label: "2 sides only (on grade)" }] },
    ...formFields(),
  ],
  compute(i) {
    const N = Math.max(1, Math.round(n(i.count))), L = n(i.L), b = n(i.b), h = n(i.h), c = n(i.cover), d = n(i.d), ds = n(i.ds), ss = n(i.ss), stock = n(i.stock);
    const nt = Math.round(n(i.ntop)), nb = Math.round(n(i.nbot));
    const cn = concrete(b * h * L * N, i);
    const mainCut = L + 2 * n(i.ext), nStir = ss > 0 ? Math.floor(L / ss + 1e-9) + 1 : 0, sCut = stirrupCut(b, h, c, ds);
    const groups: BarGroup[] = [
      { d, len: mainCut, n: (nt + nb) * N, what: "Main bars (top + bottom)" },
      { d: ds, len: sCut, n: nStir * N, what: "Stirrups (135° hooks)" },
    ];
    const bars = buyBars(groups, stock);
    const wire = wireKg(nStir * (nt + nb) * N, n(i.tie));
    const fa = (n(i.forms) === 3 ? b + 2 * h : 2 * h) * L * N;
    return {
      results: [
        { label: "Concrete", value: r(cn.Vw, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: cn.cement, unit: "bags", main: true },
        { label: "Sand", value: cn.sand, unit: "m³" }, { label: "Gravel", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock), { label: "Stirrups per beam", value: nStir, unit: "pcs" },
        { label: "Tie wire No. 16", value: wire, unit: "kg" }, { label: "Formwork", value: r(fa, 2), unit: "m²" },
      ],
      checks: [
        { label: "Stirrup cut length", ok: true, detail: `2(b−2c) + 2(h−2c) + 2 hooks of max(6db, 75 mm) = ${r(sCut, 3)} m` },
        { label: "Main bar splices", ok: true, detail: mainCut > stock ? `Cut ${r(mainCut, 2)} m > ${stock} m: 40db laps added` : "No splices needed" },
      ],
      steps: [...concSteps(cn, i, `${b} × ${h} × ${L} × ${N}`),
        `Main bars: ${nt} top + ${nb} bottom, cut = ${L} + 2×${n(i.ext)} = ${r(mainCut, 3)} m`,
        `Stirrups: n = ⌊${L}/${ss}⌋ + 1 = ${nStir}, cut = ${r(sCut, 3)} m`, ...buySteps(bars, stock),
        `Formwork = (${n(i.forms) === 3 ? "b + 2h" : "2h"}) × L × N = ${r(fa, 3)} m²`],
      table: barTable(groups),
      materials: [...concMaterials(cn), ...barMaterials(bars, stock), wireMat(wire), ...formMats(fa, n(i.reuse))],
    };
  },
};

/* 4. Column */
const column: Calc = {
  key: "est-column", title: "Concrete column", clauses: [],
  presets: [mixPreset],
  fields: [
    { key: "count", label: "Number of identical columns", type: "number", default: 4, group: "Dimensions", min: 1 },
    { key: "b", label: "Width b", unit: "m", type: "number", default: 0.3, group: "Dimensions" },
    { key: "h", label: "Depth h", unit: "m", type: "number", default: 0.3, group: "Dimensions" },
    { key: "H", label: "Height (clear + embedment)", unit: "m", type: "number", default: 3, group: "Dimensions" },
    ...mixFields(),
    { key: "nbars", label: "Vertical bars (count)", type: "number", default: 4, group: "Reinforcement" },
    diaField("d", "Vertical bar Ø", 16),
    { key: "dowel", label: "Dowel / lap allowance per bar", unit: "m", type: "number", default: 0.64, group: "Reinforcement", help: "e.g. 40db lap into the next lift" },
    diaField("dt", "Tie Ø", 10),
    { key: "st", label: "Tie spacing", unit: "m", type: "number", default: 0.15, group: "Reinforcement" },
    { key: "cover", label: "Cover", unit: "m", type: "number", default: 0.04, group: "Reinforcement" },
    stockField(), tieField(), ...formFields(),
  ],
  compute(i) {
    const N = Math.max(1, Math.round(n(i.count))), b = n(i.b), h = n(i.h), H = n(i.H), c = n(i.cover), d = n(i.d), dt = n(i.dt), st = n(i.st), stock = n(i.stock), nb = Math.round(n(i.nbars));
    const cn = concrete(b * h * H * N, i);
    const vCut = H + n(i.dowel), nTie = st > 0 ? Math.floor(H / st + 1e-9) + 1 : 0, tCut = stirrupCut(b, h, c, dt);
    const groups: BarGroup[] = [
      { d, len: vCut, n: nb * N, what: "Vertical bars" },
      { d: dt, len: tCut, n: nTie * N, what: "Ties (135° hooks)" },
    ];
    const bars = buyBars(groups, stock);
    const wire = wireKg(nTie * nb * N, n(i.tie));
    const fa = 2 * (b + h) * H * N;
    return {
      results: [
        { label: "Concrete", value: r(cn.Vw, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: cn.cement, unit: "bags", main: true },
        { label: "Sand", value: cn.sand, unit: "m³" }, { label: "Gravel", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock), { label: "Ties per column", value: nTie, unit: "pcs" },
        { label: "Tie wire No. 16", value: wire, unit: "kg" }, { label: "Formwork", value: r(fa, 2), unit: "m²" },
      ],
      checks: [{ label: "ρg", ok: true, detail: `${r((nb * Math.PI * d * d / 4) / (b * h * 1e6) * 100, 2)}% (design range 1%–8%; check with the column tool)` }],
      steps: [...concSteps(cn, i, `${b} × ${h} × ${H} × ${N}`), `Vertical cut = ${H} + ${n(i.dowel)} = ${r(vCut, 3)} m × ${nb} bars`,
        `Ties: n = ⌊${H}/${st}⌋ + 1 = ${nTie}, cut = ${r(tCut, 3)} m`, ...buySteps(bars, stock), `Formwork = 2(b + h) × H × N = ${r(fa, 3)} m²`],
      table: barTable(groups),
      materials: [...concMaterials(cn), ...barMaterials(bars, stock), wireMat(wire), ...formMats(fa, n(i.reuse))],
    };
  },
};

/* 5. Slab (one-way or two-way mesh) */
function slabParts(L: number, W: number, t: number, d: number, sx: number, sy: number, c: number, mats: number, hook: number) {
  const nx = across(W, sx, c), ny = across(L, sy, c);         // bars along L spaced across W, and vice versa
  const groups: BarGroup[] = [
    { d, len: L - 2 * c + hook, n: nx * mats, what: "Bars along length" },
    { d, len: W - 2 * c + hook, n: ny * mats, what: "Bars along width" },
  ];
  return { groups, inter: nx * ny * mats, nx, ny, V: L * W * t };
}
const slab: Calc = {
  key: "est-slab", title: "Concrete slab", clauses: [],
  presets: [mixPreset],
  fields: [
    { key: "count", label: "Number of identical panels", type: "number", default: 1, group: "Dimensions", min: 1 },
    { key: "L", label: "Length", unit: "m", type: "number", default: 4, group: "Dimensions" },
    { key: "W", label: "Width", unit: "m", type: "number", default: 3, group: "Dimensions" },
    { key: "t", label: "Thickness", unit: "m", type: "number", default: 0.1, group: "Dimensions" },
    ...mixFields(),
    diaField("d", "Bar Ø", 10),
    { key: "sx", label: "Spacing of bars along length", unit: "m", type: "number", default: 0.2, group: "Reinforcement" },
    { key: "sy", label: "Spacing of bars along width", unit: "m", type: "number", default: 0.2, group: "Reinforcement" },
    { key: "mats", label: "Layers", type: "select", default: "1", group: "Reinforcement", options: [{ value: "1", label: "Single mat" }, { value: "2", label: "Double mat (top + bottom)" }] },
    { key: "cover", label: "Edge cover", unit: "m", type: "number", default: 0.025, group: "Reinforcement" },
    { key: "hook", label: "Bend allowance per bar", unit: "m", type: "number", default: 0, group: "Reinforcement" },
    stockField(), tieField(),
    { key: "forms", label: "Formwork", type: "select", default: "soffit", group: "Formwork", options: [{ value: "soffit", label: "Suspended: soffit + edges" }, { value: "edges", label: "On grade: edges only" }] },
    ...formFields(),
  ],
  compute(i) {
    const N = Math.max(1, Math.round(n(i.count))), L = n(i.L), W = n(i.W), t = n(i.t), stock = n(i.stock);
    const p = slabParts(L, W, t, n(i.d), n(i.sx), n(i.sy), n(i.cover), n(i.mats), n(i.hook));
    const groups = p.groups.map((g) => ({ ...g, n: g.n * N }));
    const cn = concrete(p.V * N, i), bars = buyBars(groups, stock), wire = wireKg(p.inter * N, n(i.tie));
    const fa = ((i.forms === "soffit" ? L * W : 0) + 2 * (L + W) * t) * N;
    return {
      results: [
        { label: "Concrete", value: r(cn.Vw, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: cn.cement, unit: "bags", main: true },
        { label: "Sand", value: cn.sand, unit: "m³" }, { label: "Gravel", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock), { label: "Tie wire No. 16", value: wire, unit: "kg" }, { label: "Formwork", value: r(fa, 2), unit: "m²" },
      ],
      checks: [{ label: "Bars per panel", ok: true, detail: `${p.nx} along L, ${p.ny} along W per mat; temperature-steel minimum: see the one-way slab tool` }],
      steps: [...concSteps(cn, i, `${L} × ${W} × ${t} × ${N}`), `Along L: ⌊(${W} − 2c)/${n(i.sx)}⌋ + 1 = ${p.nx}; along W: ⌊(${L} − 2c)/${n(i.sy)}⌋ + 1 = ${p.ny}; × ${n(i.mats)} mat(s)`,
        ...buySteps(bars, stock), `Formwork = ${i.forms === "soffit" ? "L·W + " : ""}2(L+W)·t, × N = ${r(fa, 3)} m²`],
      table: barTable(groups),
      materials: [...concMaterials(cn), ...barMaterials(bars, stock), wireMat(wire), ...formMats(fa, n(i.reuse))],
    };
  },
};

/* 6. Concrete wall */
function wallParts(L: number, H: number, dv: number, sv: number, dh: number, sh: number, c: number, mats: number, dowel: number) {
  const nv = across(L, sv, c), nh = across(H, sh, c);
  return {
    nv, nh, inter: nv * nh * mats,
    groups: [
      { d: dv, len: H + dowel, n: nv * mats, what: "Vertical bars" },
      { d: dh, len: L - 2 * c, n: nh * mats, what: "Horizontal bars" },
    ] as BarGroup[],
  };
}
const wall: Calc = {
  key: "est-wall", title: "Concrete wall", clauses: [],
  presets: [mixPreset],
  fields: [
    { key: "count", label: "Number of identical walls", type: "number", default: 1, group: "Dimensions", min: 1 },
    { key: "L", label: "Length", unit: "m", type: "number", default: 5, group: "Dimensions" },
    { key: "H", label: "Height", unit: "m", type: "number", default: 2.5, group: "Dimensions" },
    { key: "t", label: "Thickness", unit: "m", type: "number", default: 0.15, group: "Dimensions" },
    ...mixFields(),
    diaField("dv", "Vertical bar Ø", 12), { key: "sv", label: "Vertical spacing", unit: "m", type: "number", default: 0.2, group: "Reinforcement" },
    diaField("dh", "Horizontal bar Ø", 10), { key: "sh", label: "Horizontal spacing", unit: "m", type: "number", default: 0.25, group: "Reinforcement" },
    { key: "mats", label: "Layers", type: "select", default: "1", group: "Reinforcement", options: [{ value: "1", label: "Single mat (center)" }, { value: "2", label: "Double mat (each face)" }] },
    { key: "dowel", label: "Dowel / lap allowance on vertical bars", unit: "m", type: "number", default: 0.3, group: "Reinforcement" },
    { key: "cover", label: "Edge cover", unit: "m", type: "number", default: 0.04, group: "Reinforcement" },
    stockField(), tieField(), ...formFields(),
  ],
  compute(i) {
    const N = Math.max(1, Math.round(n(i.count))), L = n(i.L), H = n(i.H), t = n(i.t), stock = n(i.stock);
    const p = wallParts(L, H, n(i.dv), n(i.sv), n(i.dh), n(i.sh), n(i.cover), n(i.mats), n(i.dowel));
    const groups = p.groups.map((g) => ({ ...g, n: g.n * N }));
    const cn = concrete(L * H * t * N, i), bars = buyBars(groups, stock), wire = wireKg(p.inter * N, n(i.tie));
    const fa = (2 * L * H + 2 * H * t) * N;
    return {
      results: [
        { label: "Concrete", value: r(cn.Vw, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: cn.cement, unit: "bags", main: true },
        { label: "Sand", value: cn.sand, unit: "m³" }, { label: "Gravel", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock), { label: "Tie wire No. 16", value: wire, unit: "kg" }, { label: "Formwork (both faces + ends)", value: r(fa, 2), unit: "m²" },
      ],
      checks: [{ label: "Bars per wall", ok: true, detail: `${p.nv} vertical × ${p.nh} horizontal per mat` }],
      steps: [...concSteps(cn, i, `${L} × ${H} × ${t} × ${N}`), `Vertical: ⌊(${L} − 2c)/${n(i.sv)}⌋ + 1 = ${p.nv}; horizontal: ⌊(${H} − 2c)/${n(i.sh)}⌋ + 1 = ${p.nh}`,
        ...buySteps(bars, stock), `Formwork = (2·L·H + 2·H·t) × N = ${r(fa, 3)} m²`],
      table: barTable(groups),
      materials: [...concMaterials(cn), ...barMaterials(bars, stock), wireMat(wire), ...formMats(fa, n(i.reuse))],
    };
  },
};

/* 7. Stairs (waist slab with steps) */
const stairs: Calc = {
  key: "est-stairs", title: "Concrete stairs (one flight)", clauses: [],
  presets: [mixPreset],
  fields: [
    { key: "count", label: "Number of identical flights", type: "number", default: 1, group: "Dimensions", min: 1 },
    { key: "steps", label: "Number of risers", type: "number", default: 9, group: "Dimensions" },
    { key: "R", label: "Riser height", unit: "m", type: "number", default: 0.175, group: "Dimensions" },
    { key: "T", label: "Tread (going)", unit: "m", type: "number", default: 0.25, group: "Dimensions" },
    { key: "Wd", label: "Stair width", unit: "m", type: "number", default: 1.0, group: "Dimensions" },
    { key: "tw", label: "Waist slab thickness", unit: "m", type: "number", default: 0.15, group: "Dimensions" },
    ...mixFields(),
    diaField("d", "Main bar Ø (along the flight)", 12), { key: "s", label: "Main bar spacing", unit: "m", type: "number", default: 0.15, group: "Reinforcement" },
    diaField("dd", "Distribution bar Ø", 10), { key: "sd", label: "Distribution spacing", unit: "m", type: "number", default: 0.25, group: "Reinforcement" },
    { key: "anch", label: "Anchorage into landing/beam, each end", unit: "m", type: "number", default: 0.3, group: "Reinforcement" },
    { key: "cover", label: "Edge cover", unit: "m", type: "number", default: 0.025, group: "Reinforcement" },
    stockField(), tieField(), ...formFields(),
  ],
  compute(i) {
    const N = Math.max(1, Math.round(n(i.count))), k = Math.round(n(i.steps)), R = n(i.R), T = n(i.T), Wd = n(i.Wd), tw = n(i.tw), c = n(i.cover), stock = n(i.stock);
    const rise = k * R, going = k * T, slope = Math.hypot(rise, going);
    const V = (slope * tw * Wd + k * 0.5 * R * T * Wd) * N;
    const cn = concrete(V, i);
    const nm = across(Wd, n(i.s), c), nd = n(i.sd) > 0 ? Math.floor(slope / n(i.sd) + 1e-9) + 1 : 0;
    const groups: BarGroup[] = [
      { d: n(i.d), len: slope + 2 * n(i.anch), n: nm * N, what: "Main bars" },
      { d: n(i.dd), len: Wd - 2 * c, n: nd * N, what: "Distribution bars" },
    ];
    const bars = buyBars(groups, stock), wire = wireKg(nm * nd * N, n(i.tie));
    const fa = (slope * Wd + k * R * Wd + 2 * (slope * tw + k * 0.5 * R * T)) * N;
    return {
      results: [
        { label: "Concrete", value: r(cn.Vw, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: cn.cement, unit: "bags", main: true },
        { label: "Sand", value: cn.sand, unit: "m³" }, { label: "Gravel", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock), { label: "Tie wire No. 16", value: wire, unit: "kg" }, { label: "Formwork", value: r(fa, 2), unit: "m²" },
        { label: "Total rise / going", value: `${r(rise, 3)} / ${r(going, 3)}`, unit: "m" },
      ],
      checks: [{ label: "Comfort rule 2R + T", ok: 2 * R + T >= 0.55 && 2 * R + T <= 0.70, detail: `2×${R} + ${T} = ${r(2 * R + T, 3)} m (comfortable range about 0.55–0.70 m; check NBCP limits for riser and tread)` }],
      steps: [`Rise = ${k} × ${R} = ${r(rise, 3)} m; going = ${k} × ${T} = ${r(going, 3)} m; slope length = √(rise² + going²) = ${r(slope, 3)} m`,
        ...concSteps(cn, i, `(slope × tw × W + risers × ½·R·T × W) × N`), `Main: ⌊(${Wd} − 2c)/${n(i.s)}⌋ + 1 = ${nm} @ ${r(slope + 2 * n(i.anch), 3)} m; distribution: ⌊${r(slope, 3)}/${n(i.sd)}⌋ + 1 = ${nd}`,
        ...buySteps(bars, stock), `Formwork = soffit + riser boards + 2 side forms = ${r(fa, 3)} m²`],
      table: barTable(groups),
      materials: [...concMaterials(cn), ...barMaterials(bars, stock), wireMat(wire), ...formMats(fa, n(i.reuse))],
    };
  },
};

/* 8. CHB wall with mortar and reinforcement */
const chbPreset: Preset = { from: ["size", "mclass"], label: "PH practice: CHB mortar per m²",
  map: Object.fromEntries(Object.entries(CHB_MORTAR).flatMap(([size, v]) => (["A", "B", "C", "D"] as const).map((cl) => [`${size}|${cl}`, { mcf: v[cl], msf: v.sand }]))) };
export function chbParts(area: number, L: number, H: number, size: string, i: Inputs) {
  const chb = Math.ceil(area * CHB_PER_M2 * (1 + n(i.waste) / 100) - 1e-9);
  const cement = Math.ceil(area * n(i.mcf) - 1e-9), sand = up(area * n(i.msf));
  const sv = n(i.sv), every = Math.round(n(i.every));
  const nv = sv > 0 ? Math.floor(L / sv + 1e-9) + 1 : 0;
  const courses = Math.floor(H / 0.2 + 1e-9), nh = every > 0 ? Math.floor(courses / every) : 0;
  const ratio = L * H > 0 ? Math.min(1, area / (L * H)) : 1;           // openings reduce bars proportionally
  const groups: BarGroup[] = [
    { d: n(i.dv), len: H + n(i.dowel), n: Math.ceil(nv * ratio - 1e-9), what: `Vertical bars @ ${sv} m` },
    { d: n(i.dh), len: L, n: Math.ceil(nh * ratio - 1e-9), what: `Horizontal bars every ${every} courses` },
  ];
  return { chb, cement, sand, nv, nh, courses, groups, inter: Math.ceil(nv * nh * ratio - 1e-9), size };
}
const chbFields = (g = "CHB & mortar (PH practice, editable)"): Field[] => [
  { key: "size", label: "CHB size", type: "select", default: "100", group: g, options: [{ value: "100", label: "4\" (100 mm)" }, { value: "150", label: "6\" (150 mm)" }, { value: "200", label: "8\" (200 mm)" }] },
  { key: "mclass", label: "Mortar class", type: "select", default: "B", group: g, options: Object.entries(MORTAR).map(([k, v]) => ({ value: k, label: v.label })) },
  { key: "mcf", label: "Mortar cement per m² of wall", unit: "bags", type: "number", default: 0.522, group: g },
  { key: "msf", label: "Mortar sand per m² of wall", unit: "m³", type: "number", default: 0.0435, group: g },
  { key: "waste", label: "CHB breakage allowance", unit: "%", type: "number", default: 5, group: g },
];
const chbBarFields = (g = "Reinforcement"): Field[] => [
  diaField("dv", "Vertical bar Ø", 10, g), { key: "sv", label: "Vertical spacing", unit: "m", type: "select" as const, default: "0.6", group: g,
    options: [{ value: "0.4", label: "0.40 m" }, { value: "0.6", label: "0.60 m" }, { value: "0.8", label: "0.80 m" }] } as Field,
  { key: "dowel", label: "Dowel / lap allowance on vertical bars", unit: "m", type: "number", default: 0.3, group: g },
  diaField("dh", "Horizontal bar Ø", 10, g),
  { key: "every", label: "Horizontal bar every … courses", type: "select", default: "3", group: g, options: ["2", "3", "4"].map((v) => ({ value: v, label: `${v} courses` })) },
];
const chbWall: Calc = {
  key: "est-chb", title: "CHB wall: blocks, mortar & reinforcement", clauses: [],
  presets: [chbPreset],
  fields: [
    { key: "count", label: "Number of identical walls", type: "number", default: 1, group: "Dimensions", min: 1 },
    { key: "L", label: "Wall length", unit: "m", type: "number", default: 5, group: "Dimensions" },
    { key: "H", label: "Wall height", unit: "m", type: "number", default: 2.8, group: "Dimensions" },
    { key: "open", label: "Openings to deduct (doors, windows), per wall", unit: "m²", type: "number", default: 2.0, group: "Dimensions" },
    ...chbFields(), ...chbBarFields(), stockField(), tieField(),
  ],
  compute(i) {
    const N = Math.max(1, Math.round(n(i.count))), L = n(i.L), H = n(i.H), stock = n(i.stock);
    const area1 = Math.max(0, L * H - n(i.open));
    const p = chbParts(area1, L, H, String(i.size), i);
    const groups = p.groups.map((g) => ({ ...g, n: g.n * N }));
    const chb = Math.ceil(area1 * N * CHB_PER_M2 * (1 + n(i.waste) / 100) - 1e-9);
    const cement = Math.ceil(area1 * N * n(i.mcf) - 1e-9), sand = up(area1 * N * n(i.msf));
    const bars = buyBars(groups, stock), wire = wireKg(p.inter * N, n(i.tie));
    const sizeIn = { "100": "4\"", "150": "6\"", "200": "8\"" }[String(i.size)] ?? String(i.size);
    return {
      results: [
        { label: "Net wall area", value: r(area1 * N, 2), unit: "m²", main: true },
        { label: `CHB ${sizeIn}`, value: chb, unit: "pcs", main: true },
        { label: "Cement for mortar (40 kg)", value: cement, unit: "bags", main: true },
        { label: "Sand for mortar", value: sand, unit: "m³" },
        ...buyResults(bars, stock), { label: "Tie wire No. 16", value: wire, unit: "kg" },
      ],
      checks: [
        { label: "Mix/mortar factors", ok: true, detail: `${CHB_PER_M2} CHB/m²; mortar ${n(i.mcf)} bags + ${n(i.msf)} m³ sand per m² (${sizeIn}, Class ${i.mclass}). Edit if your supplier or spec differs.` },
        { label: "Plaster is separate", ok: true, detail: "Use the Cement plaster calculator for both faces" },
      ],
      steps: [`Net area = (${L} × ${H} − ${n(i.open)}) × ${N} = ${r(area1 * N, 3)} m²`,
        `CHB = ${r(area1 * N, 3)} × ${CHB_PER_M2} × (1 + ${n(i.waste)}%) = ${r(area1 * N * CHB_PER_M2 * (1 + n(i.waste) / 100), 2)} → ${chb} pcs`,
        `Cement = ${r(area1 * N, 3)} × ${n(i.mcf)} = ${r(area1 * N * n(i.mcf), 3)} → ${cement} bags; sand = ${r(area1 * N, 3)} × ${n(i.msf)} = ${sand} m³`,
        `Vertical: ⌊${L}/${n(i.sv)}⌋ + 1 = ${p.nv}; courses = ⌊${H}/0.20⌋ = ${p.courses} → horizontal rows = ⌊${p.courses}/${n(i.every)}⌋ = ${p.nh}; × net/gross area ratio for openings`,
        ...buySteps(bars, stock)],
      table: barTable(groups),
      materials: [
        { key: `chb-${i.size}`, name: `Concrete hollow block ${sizeIn}`, unit: "pcs", qty: chb },
        { key: "cement-40kg", name: "Portland cement (40 kg)", unit: "bags", qty: cement },
        { key: "sand", name: "Sand", unit: "m³", qty: sand },
        ...barMaterials(bars, stock), wireMat(wire),
      ],
    };
  },
};

/* 9. Cement plaster */
const mortarPreset: Preset = { from: ["mclass"], label: "PH practice: mortar per m³", map: Object.fromEntries(Object.entries(MORTAR).map(([k, v]) => [k, { pcf: v.c, psf: v.s }])) };
const plaster: Calc = {
  key: "est-plaster", title: "Cement plaster", clauses: [],
  presets: [mortarPreset],
  fields: [
    { key: "area", label: "Wall area to plaster (one face)", unit: "m²", type: "number", default: 50, group: "Dimensions" },
    { key: "faces", label: "Faces", type: "select", default: "2", group: "Dimensions", options: [{ value: "1", label: "One face" }, { value: "2", label: "Both faces" }] },
    { key: "th", label: "Plaster thickness", unit: "mm", type: "number", default: 16, group: "Dimensions" },
    { key: "mclass", label: "Mortar class", type: "select", default: "B", group: "Mortar (PH practice, editable)", options: Object.entries(MORTAR).map(([k, v]) => ({ value: k, label: v.label })) },
    { key: "pcf", label: "Cement per m³ of mortar", unit: "bags", type: "number", default: 12, group: "Mortar (PH practice, editable)" },
    { key: "psf", label: "Sand per m³ of mortar", unit: "m³", type: "number", default: 1.0, group: "Mortar (PH practice, editable)" },
    { key: "waste", label: "Waste allowance", unit: "%", type: "number", default: 5, group: "Mortar (PH practice, editable)" },
  ],
  compute(i) {
    const A = n(i.area) * n(i.faces), V = A * (n(i.th) / 1000) * (1 + n(i.waste) / 100);
    const cement = Math.ceil(V * n(i.pcf) - 1e-9), sand = up(V * n(i.psf));
    return {
      results: [
        { label: "Plaster area", value: r(A, 2), unit: "m²", main: true },
        { label: "Mortar volume", value: r(V, 3), unit: "m³" },
        { label: "Cement (40 kg)", value: cement, unit: "bags", main: true },
        { label: "Sand", value: sand, unit: "m³", main: true },
      ],
      checks: [{ label: "Thickness", ok: n(i.th) >= 10 && n(i.th) <= 25, detail: "Typical 12–20 mm per coat system; thicker on uneven CHB" }],
      steps: [`Area = ${n(i.area)} × ${n(i.faces)} face(s) = ${r(A, 3)} m²`, `Mortar = ${r(A, 3)} × ${n(i.th)}/1000 × (1 + ${n(i.waste)}%) = ${r(V, 4)} m³`,
        `Cement = ${r(V, 4)} × ${n(i.pcf)} = ${r(V * n(i.pcf), 3)} → ${cement} bags; sand = ${r(V, 4)} × ${n(i.psf)} = ${sand} m³`],
      materials: [{ key: "cement-40kg", name: "Portland cement (40 kg)", unit: "bags", qty: cement }, { key: "sand", name: "Sand", unit: "m³", qty: sand }],
    };
  },
};

/* 10. Concrete ground water tank */
const tankFields = (g = "Tank size (inside)"): Field[] => [
  { key: "L", label: "Inside length", unit: "m", type: "number", default: 2.0, group: g },
  { key: "W", label: "Inside width", unit: "m", type: "number", default: 1.5, group: g },
  { key: "H", label: "Inside height", unit: "m", type: "number", default: 1.5, group: g },
  { key: "free", label: "Freeboard (air space at top)", unit: "m", type: "number", default: 0.15, group: g },
];
function mergeMaterials(list: Material[]): Material[] {
  const m = new Map<string, Material>();
  for (const x of list) { const y = m.get(x.key); if (y) y.qty = up(y.qty + x.qty); else m.set(x.key, { ...x }); }
  return [...m.values()];
}
const tank: Calc = {
  key: "est-water-tank", title: "Concrete ground water tank", clauses: [],
  presets: [mixPreset],
  fields: [
    ...tankFields(),
    { key: "tw", label: "Wall thickness", unit: "m", type: "number", default: 0.15, group: "Thickness" },
    { key: "tf", label: "Floor slab thickness", unit: "m", type: "number", default: 0.15, group: "Thickness" },
    { key: "tr", label: "Roof slab thickness", unit: "m", type: "number", default: 0.1, group: "Thickness" },
    ...mixFields(),
    diaField("d", "Bar Ø (walls, floor, roof)", 10), { key: "s", label: "Spacing both ways", unit: "m", type: "number", default: 0.2, group: "Reinforcement" },
    { key: "wm", label: "Wall & floor layers", type: "select", default: "1", group: "Reinforcement", options: [{ value: "1", label: "Single mat" }, { value: "2", label: "Double mat" }] },
    { key: "rm", label: "Roof layers", type: "select", default: "1", group: "Reinforcement", options: [{ value: "1", label: "Single mat" }, { value: "2", label: "Double mat" }] },
    { key: "anch", label: "Wall bar anchorage into floor and roof (total)", unit: "m", type: "number", default: 0.45, group: "Reinforcement" },
    { key: "lap", label: "Corner/splice allowance on horizontal bars", unit: "%", type: "number", default: 10, group: "Reinforcement" },
    { key: "cover", label: "Cover", unit: "m", type: "number", default: 0.04, group: "Reinforcement" },
    stockField(), tieField(), ...formFields(),
  ],
  compute(i) {
    const L = n(i.L), W = n(i.W), H = n(i.H), tw = n(i.tw), tf = n(i.tf), tr = n(i.tr), d = n(i.d), s = n(i.s), c = n(i.cover), stock = n(i.stock);
    const wm = n(i.wm), rm = n(i.rm);
    const Lo = L + 2 * tw, Wo = W + 2 * tw, pc = 2 * (L + W) + 4 * tw;         // outside plan, wall centerline perimeter
    const Vw = pc * H * tw, Vf = Lo * Wo * tf, Vr = Lo * Wo * tr, V = Vw + Vf + Vr;
    const cn = concrete(V, i);
    const nv = Math.floor(pc / s + 1e-9) * wm, nh = (Math.floor(H / s + 1e-9) + 1) * wm;
    const floor = slabParts(Lo, Wo, tf, d, s, s, c, wm, 0), roof = slabParts(Lo, Wo, tr, d, s, s, c, rm, 0);
    const groups: BarGroup[] = [
      { d, len: H + n(i.anch), n: nv, what: "Wall vertical bars" },
      { d, len: pc * (1 + n(i.lap) / 100), n: nh, what: "Wall horizontal bars (ring)" },
      ...floor.groups.map((g) => ({ ...g, what: `Floor: ${g.what.toLowerCase()}` })),
      ...roof.groups.map((g) => ({ ...g, what: `Roof: ${g.what.toLowerCase()}` })),
    ];
    const bars = buyBars(groups, stock), wire = wireKg(Math.floor(pc / s + 1e-9) * (Math.floor(H / s + 1e-9) + 1) * wm + floor.inter + roof.inter, n(i.tie));
    const fa = (2 * (L + W) * H + 2 * (Lo + Wo) * H) + L * W + 2 * (Lo + Wo) * (tf + tr);
    const cap = L * W * Math.max(0, H - n(i.free)) * 1000;
    return {
      results: [
        { label: "Water capacity", value: Math.round(cap).toLocaleString("en-US"), unit: "liters", main: true },
        { label: "Concrete", value: r(cn.Vw, 3), unit: "m³", main: true },
        { label: "Cement (40 kg)", value: cn.cement, unit: "bags", main: true },
        { label: "Sand", value: cn.sand, unit: "m³" }, { label: "Gravel", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock), { label: "Tie wire No. 16", value: wire, unit: "kg" }, { label: "Formwork", value: r(fa, 2), unit: "m²" },
      ],
      checks: [
        { label: "Water-retaining structure", ok: true, detail: "Use dense, well-cured concrete; waterstops at joints; waterproof the inside. Thickness and bars from a structural design (water pressure + soil)" },
        { label: "Concrete split", ok: true, detail: `Walls ${r(Vw, 3)} m³ · floor ${r(Vf, 3)} m³ · roof ${r(Vr, 3)} m³` },
      ],
      steps: [`Capacity = ${L} × ${W} × (${H} − ${n(i.free)}) × 1000 = ${Math.round(cap)} L`,
        `Outside plan = ${r(Lo, 3)} × ${r(Wo, 3)} m; wall centerline perimeter = 2(${L}+${W}) + 4×${tw} = ${r(pc, 3)} m`,
        ...concSteps(cn, i, `walls ${r(pc, 3)}×${H}×${tw} + floor ${r(Lo, 2)}×${r(Wo, 2)}×${tf} + roof ×${tr}`),
        `Wall vertical: ⌊${r(pc, 3)}/${s}⌋ × ${wm} mat = ${nv} @ ${r(H + n(i.anch), 3)} m; horizontal rings: (⌊${H}/${s}⌋ + 1) × ${wm} = ${nh} @ ${r(pc * (1 + n(i.lap) / 100), 3)} m`,
        ...buySteps(bars, stock), `Formwork = inner + outer wall faces + roof soffit + slab edges = ${r(fa, 3)} m²`],
      table: barTable(groups),
      materials: mergeMaterials([...concMaterials(cn), ...barMaterials(bars, stock), wireMat(wire), ...formMats(fa, n(i.reuse))]),
    };
  },
};

/* 11. Septic tank (CHB walls, concrete floor and cover) */
const septic: Calc = {
  key: "est-septic", title: "Septic tank (CHB walls, concrete slabs)", clauses: [],
  presets: [mixPreset, chbPreset],
  fields: [
    { key: "L", label: "Inside length (all chambers)", unit: "m", type: "number", default: 2.4, group: "Tank size (inside)" },
    { key: "W", label: "Inside width", unit: "m", type: "number", default: 1.2, group: "Tank size (inside)" },
    { key: "H", label: "Inside depth", unit: "m", type: "number", default: 1.5, group: "Tank size (inside)" },
    { key: "liq", label: "Liquid depth", unit: "m", type: "number", default: 1.2, group: "Tank size (inside)" },
    { key: "ch", label: "Chambers", type: "select", default: "2", group: "Tank size (inside)", options: [{ value: "2", label: "2 chambers (1 baffle wall)" }, { value: "3", label: "3 chambers (2 baffle walls)" }] },
    { key: "tf", label: "Floor slab thickness", unit: "m", type: "number", default: 0.1, group: "Slabs" },
    { key: "tc", label: "Cover slab thickness", unit: "m", type: "number", default: 0.1, group: "Slabs" },
    ...mixFields(),
    ...chbFields("CHB walls & mortar (PH practice, editable)").map((f) => (f.key === "size" ? { ...f, default: "150" } : f.key === "mcf" ? { ...f, default: 1.018 } : f.key === "msf" ? { ...f, default: 0.0844 } : f.key === "waste" ? { ...f, key: "chbwaste" } : f)) as Field[],
    ...chbBarFields("CHB wall reinforcement"),
    diaField("d", "Slab bar Ø", 10, "Slab reinforcement"), { key: "s", label: "Slab bar spacing both ways", unit: "m", type: "number", default: 0.2, group: "Slab reinforcement" },
    { key: "cover", label: "Slab edge cover", unit: "m", type: "number", default: 0.025, group: "Slab reinforcement" },
    { key: "pth", label: "Plaster thickness (inside faces + baffles)", unit: "mm", type: "number", default: 16, group: "Plaster" },
    { key: "pcf", label: "Plaster cement per m³ (Class B 1:3)", unit: "bags", type: "number", default: 12, group: "Plaster" },
    stockField("Slab reinforcement"), tieField("Slab reinforcement"),
  ],
  compute(i) {
    const L = n(i.L), W = n(i.W), H = n(i.H), stock = n(i.stock), ch = Math.round(n(i.ch)), t = n(i.size) / 1000;
    const pc = 2 * (L + W) + 4 * t, Lo = L + 2 * t, Wo = W + 2 * t;
    const wallArea = pc * H + (ch - 1) * W * H;
    const chb = { ...i, waste: n(i.chbwaste) };
    const cw = chbParts(wallArea, pc + (ch - 1) * W, H, String(i.size), chb);
    const slabV = Lo * Wo * (n(i.tf) + n(i.tc));
    const cn = concrete(slabV, i);
    const fl = slabParts(Lo, Wo, n(i.tf), n(i.d), n(i.s), n(i.s), n(i.cover), 1, 0), cv = slabParts(Lo, Wo, n(i.tc), n(i.d), n(i.s), n(i.s), n(i.cover), 1, 0);
    const groups: BarGroup[] = [...cw.groups.map((g) => ({ ...g, what: `Walls: ${g.what}` })), ...fl.groups.map((g) => ({ ...g, what: `Floor: ${g.what.toLowerCase()}` })), ...cv.groups.map((g) => ({ ...g, what: `Cover: ${g.what.toLowerCase()}` }))];
    const bars = buyBars(groups, stock), wire = wireKg(cw.inter + fl.inter + cv.inter, n(i.tie));
    const plasterA = 2 * (L + W) * H + (ch - 1) * 2 * W * H + L * W;   // inside faces, both baffle faces, floor topping
    const pv = plasterA * n(i.pth) / 1000, pCement = Math.ceil(pv * n(i.pcf) - 1e-9), pSand = up(pv * 1.0);
    const sizeIn = { "100": "4\"", "150": "6\"", "200": "8\"" }[String(i.size)] ?? String(i.size);
    const cementTotal = cn.cement + cw.cement + pCement;
    return {
      results: [
        { label: "Liquid capacity", value: Math.round(L * W * n(i.liq) * 1000).toLocaleString("en-US"), unit: "liters", main: true },
        { label: `CHB ${sizeIn}`, value: cw.chb, unit: "pcs", main: true },
        { label: "Cement total (40 kg)", value: cementTotal, unit: "bags", main: true },
        { label: "Sand total", value: up(cn.sand + cw.sand + pSand), unit: "m³" },
        { label: "Gravel (slabs)", value: cn.gravel, unit: "m³" },
        ...buyResults(bars, stock), { label: "Tie wire No. 16", value: wire, unit: "kg" },
      ],
      checks: [
        { label: "Sizing", ok: true, detail: "Size the tank from the plumbing code / sanitary permit requirements for the number of users; this tool takes off materials for the size you enter" },
        { label: "Watertight", ok: true, detail: "Fill CHB cores with mortar or grout, plaster inside with waterproofing, and keep the outlet below the inlet" },
      ],
      steps: [`Wall centerline = 2(${L}+${W}) + 4×${t} = ${r(pc, 3)} m; wall area = ${r(pc, 3)}×${H} + ${ch - 1} baffle × ${W}×${H} = ${r(wallArea, 3)} m²`,
        `CHB = ${r(wallArea, 3)} × ${CHB_PER_M2} × (1 + ${n(i.chbwaste)}%) → ${cw.chb} pcs; mortar ${cw.cement} bags + ${cw.sand} m³ sand`,
        ...concSteps(cn, i, `${r(Lo, 2)} × ${r(Wo, 2)} × (${n(i.tf)} + ${n(i.tc)})`),
        `Plaster = ${r(plasterA, 3)} m² × ${n(i.pth)} mm = ${r(pv, 4)} m³ → ${pCement} bags + ${pSand} m³ sand`,
        `Cement total = ${cn.cement} (slabs) + ${cw.cement} (CHB mortar) + ${pCement} (plaster) = ${cementTotal} bags`, ...buySteps(bars, stock)],
      table: barTable(groups),
      materials: mergeMaterials([
        { key: `chb-${i.size}`, name: `Concrete hollow block ${sizeIn}`, unit: "pcs", qty: cw.chb },
        { key: "cement-40kg", name: "Portland cement (40 kg)", unit: "bags", qty: cementTotal },
        { key: "sand", name: "Sand", unit: "m³", qty: up(cn.sand + cw.sand + pSand) },
        { key: "gravel", name: "Gravel (¾\")", unit: "m³", qty: cn.gravel },
        ...barMaterials(bars, stock), wireMat(wire),
      ]),
    };
  },
};

/* 12. Steel stand for an overhead tank */
export const ANGLES: Record<string, { label: string; kgm: number; b: number }> = {
  "50x5": { label: "L50 × 50 × 5 mm", kgm: 3.77, b: 0.05 },
  "65x6": { label: "L65 × 65 × 6 mm", kgm: 5.91, b: 0.065 },
  "75x6": { label: "L75 × 75 × 6 mm", kgm: 6.85, b: 0.075 },
  "75x9": { label: "L75 × 75 × 9 mm", kgm: 9.96, b: 0.075 },
};
const angleOpts = Object.entries(ANGLES).map(([k, v]) => ({ value: k, label: v.label }));
const stand: Calc = {
  key: "est-tank-stand", title: "Steel stand for an overhead tank", clauses: [],
  fields: [
    { key: "Hs", label: "Stand height (platform level)", unit: "m", type: "number", default: 1.0, group: "Stand" },
    { key: "a", label: "Plan size (square, leg to leg)", unit: "m", type: "number", default: 1.0, group: "Stand" },
    { key: "panel", label: "Max height between horizontal ties", unit: "m", type: "number", default: 1.0, group: "Stand" },
    { key: "brace", label: "Bracing", type: "select", default: "X", group: "Stand", options: [{ value: "X", label: "X-bracing each face" }, { value: "single", label: "Single diagonal each face" }, { value: "none", label: "No diagonals" }] },
    { key: "tankL", label: "Tank capacity", unit: "liters", type: "number", default: 500, group: "Tank" },
    { key: "tankKg", label: "Empty tank weight", unit: "kg", type: "number", default: 40, group: "Tank" },
    { key: "leg", label: "Legs", type: "select", default: "65x6", group: "Sections", options: angleOpts },
    { key: "mem", label: "Ties, braces & platform", type: "select", default: "50x5", group: "Sections", options: angleOpts },
    { key: "joists", label: "Platform cross members", type: "number", default: 2, group: "Sections" },
    { key: "bp", label: "Base plate size (square) × thickness", unit: "mm", type: "select", default: "200x10", group: "Base", options: [{ value: "150x8", label: "150 × 150 × 8" }, { value: "200x10", label: "200 × 200 × 10" }, { value: "250x12", label: "250 × 250 × 12" }] },
    { key: "bolts", label: "Anchor bolts per leg", type: "number", default: 4, group: "Base" },
    { key: "stock", label: "Steel stock length", type: "select", default: "6", group: "Sections", options: [{ value: "6", label: "6 m" }] },
  ],
  compute(i) {
    const Hs = n(i.Hs), a = n(i.a), panel = n(i.panel), stock = n(i.stock), jo = Math.round(n(i.joists));
    const levels = Math.max(1, Math.ceil(Hs / panel - 1e-9));          // panels; ties at each level incl. top frame
    const ph = Hs / levels;
    const diag = Math.hypot(a, ph), perPanel = i.brace === "X" ? 2 : i.brace === "single" ? 1 : 0;
    const legLen = 4 * Hs;
    const ties = 4 * a * levels;                        // a ring at every level above the base (top ring = platform frame)
    const braces = 4 * levels * perPanel * diag;
    const platform = jo * a;
    const memLen = ties + braces + platform;
    const legA = ANGLES[String(i.leg)], memA = ANGLES[String(i.mem)];
    const legPcs = Math.ceil(legLen / stock - 1e-9), memPcs = Math.ceil(memLen / stock - 1e-9);
    const kg = legLen * legA.kgm + memLen * memA.kgm;
    const [bpS, bpT] = String(i.bp).split("x").map(Number);
    const bpKg = 4 * (bpS / 1000) ** 2 * (bpT / 1000) * 7850;
    const paint = legLen * 4 * legA.b + memLen * 4 * memA.b;        // both faces of both legs of each angle
    const load = n(i.tankL) * 1.0 + n(i.tankKg);
    return {
      results: [
        { label: `Legs ${legA.label}`, value: legPcs, unit: `pcs × ${stock} m`, main: true },
        { label: `Ties/braces/platform ${memA.label}`, value: memPcs, unit: `pcs × ${stock} m`, main: true },
        { label: "Steel weight (members)", value: r(kg, 1), unit: "kg" },
        { label: "Base plates", value: `4 pcs ${String(i.bp).replace("x", " × ")} mm (${r(bpKg, 1)} kg)` },
        { label: "Anchor bolts", value: 4 * Math.round(n(i.bolts)), unit: "pcs" },
        { label: "Paint area (primer + finish)", value: r(paint, 2), unit: "m²" },
        { label: "Full tank load on platform", value: r(load, 0), unit: "kg" },
      ],
      checks: [
        { label: "Structural check needed", ok: true, detail: `Full tank ≈ ${r(load, 0)} kg (${r(load * 9.81 / 1000 / 4, 2)} kN per leg before wind). Have the leg, bracing, base plate and footing sizes checked by design, including wind on the full tank` },
        { label: "Panel height", ok: ph <= panel + 1e-9, detail: `${levels} panel(s) of ${r(ph, 3)} m` },
      ],
      steps: [`Panels = ⌈${Hs}/${panel}⌉ = ${levels} of ${r(ph, 3)} m; diagonal = √(${a}² + ${r(ph, 3)}²) = ${r(diag, 3)} m`,
        `Legs: 4 × ${Hs} = ${r(legLen, 2)} m → ${legPcs} pcs of ${stock} m`,
        `Ties: 4 × ${a} × ${levels} level(s) = ${r(ties, 2)} m; braces: 4 faces × ${levels} × ${perPanel} × ${r(diag, 3)} = ${r(braces, 2)} m; platform: ${jo} × ${a} = ${r(platform, 2)} m`,
        `Members total ${r(memLen, 2)} m → ${memPcs} pcs; weight = ${r(legLen, 2)}×${legA.kgm} + ${r(memLen, 2)}×${memA.kgm} = ${r(kg, 1)} kg`],
      table: { columns: ["Part", "Section", "Length (m)", "kg"], rows: [
        ["Legs", legA.label, r(legLen, 2), r(legLen * legA.kgm, 1)], ["Horizontal ties", memA.label, r(ties, 2), r(ties * memA.kgm, 1)],
        ["Diagonal braces", memA.label, r(braces, 2), r(braces * memA.kgm, 1)], ["Platform members", memA.label, r(platform, 2), r(platform * memA.kgm, 1)]] },
      materials: [
        { key: `angle-${i.leg}-${stock}`, name: `Angle bar ${legA.label} × ${stock} m`, unit: "pcs", qty: legPcs },
        { key: `angle-${i.mem}-${stock}`, name: `Angle bar ${memA.label} × ${stock} m`, unit: "pcs", qty: memPcs },
        { key: `base-plate-${i.bp}`, name: `Base plate ${String(i.bp).replace("x", " × ")} mm`, unit: "pcs", qty: 4 },
        { key: "anchor-bolt", name: "Anchor bolt with nut & washer", unit: "pcs", qty: 4 * Math.round(n(i.bolts)) },
        { key: "paint-area", name: "Steel paint area (primer + finish)", unit: "m²", qty: up(paint) },
      ],
    };
  },
};

/* 13. Lumber board feet */
const lumber: Calc = {
  key: "est-lumber", title: "Lumber: board feet & cost", clauses: [],
  fields: [
    { key: "list", label: "Pieces: count, thickness (in), width (in), length (ft), description", type: "text", rows: 6, group: "Lumber list",
      default: "20, 2, 2, 12, Studs / form frames\n10, 2, 3, 12, Joists\n8, 2, 4, 10, Posts", help: "One line per item. Lengths in feet (8, 10, 12, 14, 16)." },
    { key: "price", label: "Price per board foot", unit: "₱", type: "number", default: 55, group: "Price" },
    { key: "waste", label: "Waste allowance", unit: "%", type: "number", default: 5, group: "Price" },
  ],
  compute(i) {
    const rows = String(i.list).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const [c, t, w, L, ...d] = l.split(",").map((x) => x.trim());
      return { c: Number(c), t: Number(t), w: Number(w), L: Number(L), d: d.join(", ") || "Lumber" };
    });
    const bad = rows.filter((x) => [x.c, x.t, x.w, x.L].some((v) => !Number.isFinite(v) || v <= 0));
    if (!rows.length || bad.length) return { results: [{ label: "Input error", value: "Each line: count, thickness, width, length[, description]", main: true }], checks: [], steps: [] };
    const bf = rows.map((x) => (x.c * x.t * x.w * x.L) / 12);
    const total = bf.reduce((s, x) => s + x, 0), withW = total * (1 + n(i.waste) / 100), cost = withW * n(i.price);
    return {
      results: [
        { label: "Board feet (net)", value: r(total, 2), unit: "bd ft", main: true },
        { label: `With ${n(i.waste)}% waste`, value: r(withW, 2), unit: "bd ft", main: true },
        { label: "Cost", value: `₱${cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, main: true },
      ],
      checks: [{ label: "Nominal sizes", ok: true, detail: "Board feet use nominal inches (2 × 4 is billed as 2 × 4 even if it measures less)" }],
      steps: [`Board feet = pcs × t(in) × w(in) × L(ft) / 12`, ...rows.map((x, k) => `${x.d}: ${x.c} × ${x.t} × ${x.w} × ${x.L} / 12 = ${r(bf[k], 2)} bd ft`)],
      table: { columns: ["Item", "Pcs", "Size", "Length (ft)", "Bd ft"], rows: rows.map((x, k) => [x.d, x.c, `${x.t}" × ${x.w}"`, x.L, r(bf[k], 2)]) },
      materials: [
        ...rows.map((x) => ({ key: `lumber-${x.t}x${x.w}x${x.L}`, name: `Lumber ${x.t}" × ${x.w}" × ${x.L}'`, unit: "pcs", qty: x.c })),
        { key: "lumber-bdft", name: "Lumber, total board feet (incl. waste)", unit: "bd ft", qty: up(withW) },
      ],
    };
  },
};

/** Catalog metadata for the Estimate workspace. */
export type EstimatorMeta = { key: string; group: string; category: string; icon: string; sketch: string; blurb: string };
export const ESTIMATOR_META: EstimatorMeta[] = [
  { key: "est-footing", group: "Structural concrete", category: "earthworks-foundations", icon: "footing", sketch: "footing", blurb: "Isolated footing: concrete, bars both ways, tie wire, forms" },
  { key: "est-wall-footing", group: "Structural concrete", category: "earthworks-foundations", icon: "strip", sketch: "strip", blurb: "Continuous footing under walls" },
  { key: "est-beam", group: "Structural concrete", category: "concrete-design", icon: "beam", sketch: "beam", blurb: "Tie beam, girder or lintel with stirrups" },
  { key: "est-column", group: "Structural concrete", category: "concrete-design", icon: "column", sketch: "column", blurb: "Columns with ties and dowels" },
  { key: "est-slab", group: "Structural concrete", category: "concrete-design", icon: "slab", sketch: "slab", blurb: "Suspended slab or slab on grade" },
  { key: "est-wall", group: "Structural concrete", category: "concrete-design", icon: "wall", sketch: "wall", blurb: "Concrete wall, single or double mat" },
  { key: "est-stairs", group: "Structural concrete", category: "concrete-design", icon: "stairs", sketch: "stairs", blurb: "One flight: waist slab + steps" },
  { key: "est-chb", group: "Masonry & finishes", category: "masonry-chb", icon: "chb", sketch: "chb", blurb: "Blocks, mortar, vertical & horizontal bars" },
  { key: "est-plaster", group: "Masonry & finishes", category: "masonry-plaster", icon: "plaster", sketch: "plaster", blurb: "Cement & sand for plaster by thickness" },
  { key: "est-water-tank", group: "Tanks & sanitary", category: "water-tanks", icon: "tank", sketch: "tank", blurb: "Concrete ground tank: capacity, concrete, bars" },
  { key: "est-septic", group: "Tanks & sanitary", category: "water-septic", icon: "septic", sketch: "septic", blurb: "CHB walls, baffles, floor & cover slabs, plaster" },
  { key: "est-tank-stand", group: "Tanks & sanitary", category: "steel-stands", icon: "stand", sketch: "stand", blurb: "Angle-bar stand for an overhead tank" },
  { key: "est-lumber", group: "Lumber", category: "lumber-general", icon: "lumber", sketch: "lumber", blurb: "Board feet and cost from a cutting list" },
  { key: "est-tiles", group: "Masonry & finishes", category: "masonry-finishes", icon: "tiles", sketch: "tiles", blurb: "Tiles, boxes, adhesive or mortar bed, grout" },
  { key: "est-paint", group: "Masonry & finishes", category: "masonry-finishes", icon: "paint", sketch: "paint", blurb: "Primer and finish paint by coats and coverage" },
  { key: "est-ceiling", group: "Masonry & finishes", category: "masonry-finishes", icon: "ceiling", sketch: "ceiling", blurb: "Gypsum boards, furring, channels, hangers, screws" },
  { key: "est-waterproof", group: "Masonry & finishes", category: "masonry-finishes", icon: "waterproof", sketch: "waterproof", blurb: "Floors and decks with wall upturns, kits, corner tape" },
  { key: "est-gutter", group: "Roof drainage", category: "water-plumbing", icon: "gutter", sketch: "gutter", blurb: "Gutter pieces, brackets, downspouts, elbows, sealant" },
];

export const ESTIMATE_CALCS: Calc[] = [footing, wallFooting, beam, column, slab, wall, stairs, chbWall, plaster, tank, septic, stand, lumber];
