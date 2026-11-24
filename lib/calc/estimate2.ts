// v1.3.0 estimating calculators: finishes, ceiling, waterproofing, roof drainage.
// Quantities are geometric; consumption rates are editable defaults (check the product data sheet you will buy).
import { type Calc, type Inputs, n, r } from "./core";
import { MORTAR } from "./estimate";

const up = (x: number, d = 2) => Math.ceil(x * 10 ** d - 1e-9) / 10 ** d;
const ceil = (x: number) => Math.ceil(x - 1e-9);
const opt = (v: string, label: string) => ({ value: v, label });

/* 14. Floor / wall tiles */
export const TILES: Record<string, { label: string; a: number; b: number; perBox: number }> = {
  "200x250": { label: "200 × 250 mm (wall)", a: 200, b: 250, perBox: 20 },
  "300x300": { label: "300 × 300 mm", a: 300, b: 300, perBox: 11 },
  "300x600": { label: "300 × 600 mm", a: 300, b: 600, perBox: 8 },
  "400x400": { label: "400 × 400 mm", a: 400, b: 400, perBox: 6 },
  "600x600": { label: "600 × 600 mm", a: 600, b: 600, perBox: 4 },
};
/** Grout use, kg/m² = (A + B)/(A·B) × joint width × joint depth × density (all mm; density ≈ 1.6). */
export const groutKgM2 = (a: number, b: number, w: number, dpt: number, rho = 1.6) => ((a + b) / (a * b)) * w * dpt * rho;
const tiles: Calc = {
  key: "est-tiles", title: "Floor & wall tiles", clauses: [],
  presets: [{ from: ["size"], label: "Typical pieces per box", map: Object.fromEntries(Object.entries(TILES).map(([k, v]) => [k, { perBox: v.perBox, tt: Math.min(v.a, v.b) >= 400 ? 10 : 8 }])) }],
  fields: [
    { key: "area", label: "Area to tile", unit: "m²", type: "number", default: 20, group: "Area" },
    { key: "size", label: "Tile size", type: "select", default: "600x600", group: "Tile", options: Object.entries(TILES).map(([k, v]) => opt(k, v.label)) },
    { key: "perBox", label: "Pieces per box", unit: "pcs", type: "number", default: 4, group: "Tile", help: "Check the box label" },
    { key: "waste", label: "Cutting & breakage allowance", unit: "%", type: "number", default: 7, group: "Tile", help: "5% simple rooms, 10%+ diagonal or many cuts" },
    { key: "method", label: "Setting method", type: "select", default: "adh", group: "Setting", options: [opt("adh", "Tile adhesive (thin bed)"), opt("mortar", "Cement mortar bed")] },
    { key: "cov", label: "Adhesive coverage per 25 kg bag", unit: "m²", type: "number", default: 4, group: "Setting", help: "Depends on notch size; ~4–5 m² for 6–8 mm notch" },
    { key: "bed", label: "Mortar bed thickness", unit: "mm", type: "number", default: 25, group: "Setting" },
    { key: "mclass", label: "Mortar class", type: "select", default: "B", group: "Setting", options: Object.entries(MORTAR).map(([k, v]) => opt(k, v.label)) },
    { key: "jw", label: "Joint width", unit: "mm", type: "number", default: 3, group: "Grout" },
    { key: "tt", label: "Tile thickness (joint depth)", unit: "mm", type: "number", default: 10, group: "Grout" },
    { key: "pack", label: "Grout pack", unit: "kg", type: "number", default: 2, group: "Grout" },
  ],
  compute(i) {
    const A = n(i.area), T = TILES[String(i.size)] ?? TILES["600x600"], at = (T.a * T.b) / 1e6;
    const pcs = ceil((A / at) * (1 + n(i.waste) / 100)), boxes = ceil(pcs / Math.max(1, n(i.perBox)));
    const gk = groutKgM2(T.a, T.b, n(i.jw), n(i.tt)), grout = up(A * gk * 1.05, 1), gp = ceil(grout / Math.max(0.1, n(i.pack)));
    const adh = i.method === "adh", m = MORTAR[String(i.mclass)] ?? MORTAR.B;
    const bags = adh ? ceil(A / Math.max(0.1, n(i.cov))) : 0;
    const Vm = adh ? 0 : A * (n(i.bed) / 1000) * 1.05, cement = adh ? 0 : ceil(Vm * m.c), sand = adh ? 0 : up(Vm * m.s);
    return {
      results: [
        { label: "Tiles", value: pcs, unit: "pcs", main: true }, { label: "Boxes", value: boxes, unit: "boxes", main: true },
        ...(adh ? [{ label: "Tile adhesive (25 kg)", value: bags, unit: "bags", main: true }]
          : [{ label: "Cement (40 kg)", value: cement, unit: "bags", main: true }, { label: "Sand", value: sand, unit: "m³" }]),
        { label: "Grout", value: grout, unit: "kg" }, { label: `Grout packs (${n(i.pack)} kg)`, value: gp, unit: "packs" },
      ],
      checks: [{ label: "Allowance", ok: n(i.waste) >= 5, detail: "Keep at least 5% for cuts and breakage, plus a few spare tiles from the same batch" }],
      steps: [
        `Tile area = ${T.a} × ${T.b} mm = ${r(at, 4)} m²`,
        `Tiles = ${A} / ${r(at, 4)} × (1 + ${n(i.waste)}%) = ${r((A / at) * (1 + n(i.waste) / 100), 2)} → ${pcs} pcs → ${boxes} boxes of ${n(i.perBox)}`,
        adh ? `Adhesive = ${A} / ${n(i.cov)} m² per bag = ${r(A / n(i.cov), 2)} → ${bags} bags`
          : `Mortar bed = ${A} × ${n(i.bed)}/1000 × 1.05 = ${r(Vm, 3)} m³ → cement ${r(Vm * m.c, 2)} → ${cement} bags, sand ${sand} m³ (${m.label})`,
        `Grout = (${T.a}+${T.b})/(${T.a}×${T.b}) × ${n(i.jw)} × ${n(i.tt)} × 1.6 = ${r(gk, 3)} kg/m² → × ${A} × 1.05 = ${grout} kg → ${gp} packs`,
      ],
      materials: [
        { key: `tile-${i.size}`, name: `Tiles ${T.label}`, unit: "pcs", qty: pcs },
        ...(adh ? [{ key: "tile-adhesive-25kg", name: "Tile adhesive (25 kg)", unit: "bags", qty: bags }]
          : [{ key: "cement-40kg", name: "Portland cement (40 kg)", unit: "bags", qty: cement }, { key: "sand", name: "Sand", unit: "m³", qty: sand }]),
        { key: "tile-grout", name: "Tile grout", unit: "kg", qty: grout },
      ],
    };
  },
};

/* 15. Painting */
const paint: Calc = {
  key: "est-paint", title: "Painting: walls & ceilings", clauses: [],
  fields: [
    { key: "area", label: "Area to paint", unit: "m²", type: "number", default: 100, group: "Area", help: "Wall area minus large openings" },
    { key: "pcoats", label: "Primer / sealer coats", type: "number", default: 1, group: "Primer" },
    { key: "pcov", label: "Primer coverage per gallon per coat", unit: "m²", type: "number", default: 25, group: "Primer", help: "Gallon = 4 L. Check the can" },
    { key: "fcoats", label: "Finish coats", type: "number", default: 2, group: "Finish" },
    { key: "fcov", label: "Finish coverage per gallon per coat", unit: "m²", type: "number", default: 30, group: "Finish" },
    { key: "putty", label: "Skim coat / putty", unit: "kg/m²", type: "number", default: 0, group: "Surface prep", help: "0 = none; ~0.5–1.0 for a full skim coat" },
    { key: "waste", label: "Waste allowance", unit: "%", type: "number", default: 5, group: "Surface prep" },
  ],
  compute(i) {
    const A = n(i.area), w = 1 + n(i.waste) / 100;
    const pg = (A * n(i.pcoats) * w) / Math.max(1, n(i.pcov)), fg = (A * n(i.fcoats) * w) / Math.max(1, n(i.fcov));
    const P = ceil(pg), F = ceil(fg), putty = up(A * n(i.putty) * w, 1);
    return {
      results: [
        { label: "Primer / sealer", value: P, unit: "gal", main: true }, { label: "Finish paint", value: F, unit: "gal", main: true },
        ...(putty > 0 ? [{ label: "Skim coat / putty", value: putty, unit: "kg" }] : []),
      ],
      checks: [{ label: "Coats", ok: n(i.fcoats) >= 2, detail: "Two finish coats is normal; one coat rarely hides the primer evenly" }],
      steps: [`Primer = ${A} × ${n(i.pcoats)} coat(s) × ${w} / ${n(i.pcov)} = ${r(pg, 2)} → ${P} gal`,
        `Finish = ${A} × ${n(i.fcoats)} coat(s) × ${w} / ${n(i.fcov)} = ${r(fg, 2)} → ${F} gal`,
        ...(putty > 0 ? [`Putty = ${A} × ${n(i.putty)} × ${w} = ${putty} kg`] : [])],
      materials: [
        { key: "paint-primer-gal", name: "Primer / sealer", unit: "gal", qty: P }, { key: "paint-finish-gal", name: "Finish paint", unit: "gal", qty: F },
        ...(putty > 0 ? [{ key: "skim-coat", name: "Skim coat / putty", unit: "kg", qty: putty }] : []),
      ],
    };
  },
};

/* 16. Gypsum board ceiling on metal furring */
export const BOARD_M2 = 1.22 * 2.44;
const lines = (w: number, s: number) => (s > 0 ? ceil(w / s) + 1 : 0);  // lines at spacing s across width w, both edges included
const ceiling: Calc = {
  key: "est-ceiling", title: "Ceiling: gypsum board on metal furring", clauses: [],
  fields: [
    { key: "L", label: "Room length", unit: "m", type: "number", default: 6, group: "Room" },
    { key: "W", label: "Room width", unit: "m", type: "number", default: 4, group: "Room" },
    { key: "count", label: "Number of identical rooms", type: "number", default: 1, group: "Room", min: 1 },
    { key: "bwaste", label: "Board waste", unit: "%", type: "number", default: 10, group: "Board (1.22 × 2.44 m)" },
    { key: "screws", label: "Screws per board", unit: "pcs", type: "number", default: 30, group: "Board (1.22 × 2.44 m)" },
    { key: "sf", label: "Furring spacing", unit: "m", type: "number", default: 0.40, group: "Framing", help: "Runs along the length" },
    { key: "sc", label: "Carrying channel spacing", unit: "m", type: "number", default: 1.20, group: "Framing", help: "Runs across the width" },
    { key: "sh", label: "Hanger spacing along channels", unit: "m", type: "number", default: 1.20, group: "Framing" },
    { key: "stock", label: "Furring / channel length", unit: "m", type: "number", default: 5, group: "Framing", help: "Check supplier length" },
    { key: "astock", label: "Wall angle length", unit: "m", type: "number", default: 3, group: "Framing" },
    { key: "lap", label: "Lap/waste on framing", unit: "%", type: "number", default: 5, group: "Framing" },
    { key: "jc", label: "Joint compound", unit: "kg/m²", type: "number", default: 0.35, group: "Joints" },
  ],
  compute(i) {
    const L = n(i.L), Wd = n(i.W), N = Math.max(1, Math.round(n(i.count))), A = L * Wd * N, lw = 1 + n(i.lap) / 100, st = Math.max(0.5, n(i.stock));
    const boards = ceil((A / BOARD_M2) * (1 + n(i.bwaste) / 100));
    const nf = lines(Wd, n(i.sf)), nc = lines(L, n(i.sc)), nh = lines(Wd, n(i.sh)) - 0;
    const furM = nf * L * N * lw, chM = nc * Wd * N * lw, angM = 2 * (L + Wd) * N * lw;
    const fur = ceil(furM / st), ch = ceil(chM / st), ang = ceil(angM / Math.max(0.5, n(i.astock)));
    const hangers = nc * nh * N, screws = boards * Math.round(n(i.screws));
    const tape = up(A * (1 / 1.22 + 1 / 2.44), 1), jc = up(A * n(i.jc), 1);
    return {
      results: [
        { label: "Gypsum boards 1.22 × 2.44", value: boards, unit: "pcs", main: true },
        { label: `Metal furring (${st} m)`, value: fur, unit: "pcs", main: true },
        { label: `Carrying channel (${st} m)`, value: ch, unit: "pcs", main: true },
        { label: `Wall angle (${n(i.astock)} m)`, value: ang, unit: "pcs" },
        { label: "Hangers (rod/wire + clip)", value: hangers, unit: "sets" },
        { label: "Board screws", value: screws, unit: "pcs" },
        { label: "Joint tape", value: tape, unit: "m" }, { label: "Joint compound", value: jc, unit: "kg" },
      ],
      checks: [{ label: "Framing spacing", ok: n(i.sf) <= 0.6 && n(i.sc) <= 1.2, detail: "Furring ≤ 0.60 m for 12 mm board (0.40 m typical); channels and hangers ≤ 1.20 m" }],
      steps: [
        `Area = ${L} × ${Wd} × ${N} = ${r(A, 2)} m²; boards = ${r(A, 2)} / ${r(BOARD_M2, 4)} × (1 + ${n(i.bwaste)}%) → ${boards} pcs`,
        `Furring lines = ⌈${Wd}/${n(i.sf)}⌉ + 1 = ${nf}, each ${L} m → ${r(furM, 2)} m with lap → ${fur} pcs`,
        `Carrying channels = ⌈${L}/${n(i.sc)}⌉ + 1 = ${nc}, each ${Wd} m → ${r(chM, 2)} m → ${ch} pcs`,
        `Wall angle = 2(${L} + ${Wd}) × ${N} × ${lw} = ${r(angM, 2)} m → ${ang} pcs`,
        `Hangers = ${nc} channels × (⌈${Wd}/${n(i.sh)}⌉ + 1 = ${nh}) × ${N} = ${hangers}; screws = ${boards} × ${n(i.screws)} = ${screws}`,
        `Tape ≈ A × (1/1.22 + 1/2.44) = ${tape} m; compound = ${r(A, 2)} × ${n(i.jc)} = ${jc} kg`,
      ],
      materials: [
        { key: "gypsum-board-12mm", name: "Gypsum board 1.22 × 2.44 m", unit: "pcs", qty: boards },
        { key: `metal-furring-${st}`, name: `Metal furring ${st} m`, unit: "pcs", qty: fur },
        { key: `carrying-channel-${st}`, name: `Carrying channel ${st} m`, unit: "pcs", qty: ch },
        { key: `wall-angle-${n(i.astock)}`, name: `Wall angle ${n(i.astock)} m`, unit: "pcs", qty: ang },
        { key: "ceiling-hanger", name: "Ceiling hanger set", unit: "sets", qty: hangers },
        { key: "gypsum-screw", name: "Gypsum board screws", unit: "pcs", qty: screws },
        { key: "joint-tape", name: "Joint tape", unit: "m", qty: tape },
        { key: "joint-compound", name: "Joint compound", unit: "kg", qty: jc },
      ],
    };
  },
};

/* 17. Waterproofing (toilet, roof deck, tank) */
const waterproof: Calc = {
  key: "est-waterproof", title: "Waterproofing: floors, decks & upturns", clauses: [],
  fields: [
    { key: "L", label: "Length", unit: "m", type: "number", default: 2.4, group: "Area" },
    { key: "W", label: "Width", unit: "m", type: "number", default: 1.5, group: "Area" },
    { key: "up", label: "Upturn height on walls", unit: "m", type: "number", default: 0.3, group: "Area", help: "Toilets: 0.30 m typical; 1.8 m+ at showers" },
    { key: "count", label: "Number of identical areas", type: "number", default: 1, group: "Area", min: 1 },
    { key: "coats", label: "Coats", type: "number", default: 2, group: "Product (check data sheet)" },
    { key: "rate", label: "Consumption per coat", unit: "kg/m²", type: "number", default: 1.0, group: "Product (check data sheet)" },
    { key: "kit", label: "Kit / pail size", unit: "kg", type: "number", default: 20, group: "Product (check data sheet)" },
    { key: "waste", label: "Waste allowance", unit: "%", type: "number", default: 10, group: "Product (check data sheet)" },
    { key: "tape", label: "Corner reinforcing tape/fabric", type: "select", default: "1", group: "Details", options: [opt("1", "Yes, at wall–floor corners"), opt("0", "No")] },
  ],
  compute(i) {
    const L = n(i.L), Wd = n(i.W), N = Math.max(1, Math.round(n(i.count))), P = 2 * (L + Wd);
    const A = (L * Wd + P * n(i.up)) * N, kg = up(A * n(i.coats) * n(i.rate) * (1 + n(i.waste) / 100), 1);
    const kits = ceil(kg / Math.max(1, n(i.kit))), tape = n(i.tape) ? up(P * N * 1.05, 1) : 0;
    return {
      results: [
        { label: "Area incl. upturns", value: r(A, 2), unit: "m²", main: true },
        { label: "Waterproofing", value: kg, unit: "kg", main: true }, { label: `Kits (${n(i.kit)} kg)`, value: kits, unit: "kits", main: true },
        ...(tape ? [{ label: "Corner tape / fabric", value: tape, unit: "m" }] : []),
      ],
      checks: [{ label: "Upturn", ok: n(i.up) >= 0.15, detail: "Turn the membrane up the walls (≥ 150 mm; more at showers) and test with a 24–48 h flood test before tiling" }],
      steps: [`Perimeter = 2(${L} + ${Wd}) = ${r(P, 2)} m`, `Area = (${L}×${Wd} + ${r(P, 2)}×${n(i.up)}) × ${N} = ${r(A, 3)} m²`,
        `Material = ${r(A, 3)} × ${n(i.coats)} × ${n(i.rate)} × (1 + ${n(i.waste)}%) = ${kg} kg → ${kits} kits`, ...(tape ? [`Corner tape = ${r(P, 2)} × ${N} × 1.05 = ${tape} m`] : [])],
      materials: [{ key: "waterproofing-kg", name: "Waterproofing compound", unit: "kg", qty: kg }, ...(tape ? [{ key: "wp-corner-tape", name: "Waterproofing corner tape/fabric", unit: "m", qty: tape }] : [])],
    };
  },
};

/* 18. Roof gutter & downspout */
const gutter: Calc = {
  key: "est-gutter", title: "Roof gutter & downspout", clauses: [],
  fields: [
    { key: "eave", label: "Total gutter (eave) length", unit: "m", type: "number", default: 24, group: "Gutter" },
    { key: "runs", label: "Separate gutter runs", type: "number", default: 2, group: "Gutter", help: "Each run has 2 end caps" },
    { key: "gstock", label: "Gutter piece length", unit: "m", type: "number", default: 3, group: "Gutter" },
    { key: "bs", label: "Bracket / hanger spacing", unit: "m", type: "number", default: 0.6, group: "Gutter" },
    { key: "ds", label: "Max gutter length per downspout", unit: "m", type: "number", default: 12, group: "Downspout", help: "Set from the drainage design or the plumbing plans" },
    { key: "h", label: "Downspout height (eave to ground/drain)", unit: "m", type: "number", default: 3.5, group: "Downspout" },
    { key: "pstock", label: "Downspout pipe length", unit: "m", type: "number", default: 3, group: "Downspout" },
    { key: "elb", label: "Elbows per downspout", type: "number", default: 3, group: "Downspout" },
    { key: "seal", label: "Sealant: metres of gutter per tube", unit: "m", type: "number", default: 6, group: "Sealant" },
  ],
  compute(i) {
    const E = n(i.eave), runs = Math.max(1, Math.round(n(i.runs)));
    const gp = ceil((E * 1.05) / Math.max(0.5, n(i.gstock))), joints = Math.max(0, gp - runs);
    const br = ceil(E / Math.max(0.1, n(i.bs))) + runs;
    const nd = Math.max(runs, ceil(E / Math.max(1, n(i.ds))));
    const pipe = ceil((nd * n(i.h) * 1.05) / Math.max(0.5, n(i.pstock))), elb = nd * Math.round(n(i.elb));
    const tubes = ceil(E / Math.max(1, n(i.seal)));
    return {
      results: [
        { label: `Gutter (${n(i.gstock)} m)`, value: gp, unit: "pcs", main: true }, { label: "Brackets / hangers", value: br, unit: "pcs" },
        { label: "End caps", value: 2 * runs, unit: "pcs" }, { label: "Gutter joints / connectors", value: joints, unit: "pcs" },
        { label: "Downspouts", value: nd, unit: "nos", main: true }, { label: `Downspout pipe (${n(i.pstock)} m)`, value: pipe, unit: "pcs", main: true },
        { label: "Outlets", value: nd, unit: "pcs" }, { label: "Elbows", value: elb, unit: "pcs" }, { label: "Sealant", value: tubes, unit: "tubes" },
      ],
      checks: [{ label: "Downspout count", ok: nd >= runs, detail: "At least one downspout per gutter run; size and count per the plumbing/drainage design" },
        { label: "Gutter slope", ok: true, detail: "Set gutters to fall toward the outlets (commonly about 1:200 to 1:500)" }],
      steps: [`Gutter = ${E} × 1.05 / ${n(i.gstock)} → ${gp} pcs; joints = ${gp} − ${runs} runs = ${joints}`,
        `Brackets = ⌈${E}/${n(i.bs)}⌉ + ${runs} = ${br}; end caps = 2 × ${runs}`,
        `Downspouts = max(${runs} runs, ⌈${E}/${n(i.ds)}⌉) = ${nd}; pipe = ${nd} × ${n(i.h)} × 1.05 / ${n(i.pstock)} → ${pipe} pcs; elbows = ${nd} × ${n(i.elb)} = ${elb}`,
        `Sealant = ⌈${E}/${n(i.seal)}⌉ = ${tubes} tubes`],
      materials: [
        { key: `gutter-${n(i.gstock)}`, name: `Gutter ${n(i.gstock)} m`, unit: "pcs", qty: gp }, { key: "gutter-bracket", name: "Gutter bracket / hanger", unit: "pcs", qty: br },
        { key: "gutter-end-cap", name: "Gutter end cap", unit: "pcs", qty: 2 * runs }, { key: "gutter-connector", name: "Gutter connector", unit: "pcs", qty: joints },
        { key: "gutter-outlet", name: "Gutter outlet", unit: "pcs", qty: nd }, { key: `downspout-${n(i.pstock)}`, name: `Downspout pipe ${n(i.pstock)} m`, unit: "pcs", qty: pipe },
        { key: "downspout-elbow", name: "Downspout elbow", unit: "pcs", qty: elb }, { key: "sealant-tube", name: "Sealant", unit: "tubes", qty: tubes },
      ],
    };
  },
};

export const ESTIMATE_CALCS_2: Calc[] = [tiles, paint, ceiling, waterproof, gutter];
export type { Inputs };
