// Steel calculators (v0.4.0). LRFD per NSCP 2015 Chapter 5 (= AISC 360-10/16 provisions).
// Units: mm, MPa, N → reported in kN / kN·m. Section properties from plate dimensions (fillets neglected).
import { type Calc, n, r, ES } from "./core";

const E = ES;
const FY = { key: "fy", label: "Fy", unit: "MPa", type: "number" as const, default: 248, help: "A36 = 248, A572 Gr 50 = 345" };
const DIMS = [
  { key: "d", label: "Depth d", unit: "mm", type: "number" as const, default: 254 },
  { key: "bf", label: "Flange width bf", unit: "mm", type: "number" as const, default: 254 },
  { key: "tf", label: "Flange thickness tf", unit: "mm", type: "number" as const, default: 14.2 },
  { key: "tw", label: "Web thickness tw", unit: "mm", type: "number" as const, default: 8.6 },
];

/** Doubly symmetric I-shape properties from plate dimensions (no fillets → slightly conservative). */
export function iShape(d: number, bf: number, tf: number, tw: number) {
  const hw = d - 2 * tf;
  const A = 2 * bf * tf + hw * tw;
  const Ix = (bf * d ** 3 - (bf - tw) * hw ** 3) / 12;
  const Iy = (2 * tf * bf ** 3 + hw * tw ** 3) / 12;
  const Sx = (2 * Ix) / d;
  const Zx = bf * tf * (d - tf) + (tw * hw * hw) / 4;
  const ho = d - tf;
  const J = (2 * bf * tf ** 3 + ho * tw ** 3) / 3;
  const Cw = (Iy * ho * ho) / 4;
  const rts = Math.sqrt(Math.sqrt(Iy * Cw) / Sx);
  return { hw, A, Ix, Iy, Sx, Zx, ho, J, Cw, rts, rx: Math.sqrt(Ix / A), ry: Math.sqrt(Iy / A) };
}
const propSteps = (p: ReturnType<typeof iShape>) =>
  `Properties (fillets neglected): A = ${r(p.A, 0)} mm², Ix = ${r(p.Ix / 1e6, 2)}×10⁶ mm⁴, Iy = ${r(p.Iy / 1e6, 2)}×10⁶ mm⁴, Sx = ${r(p.Sx / 1e3, 1)}×10³ mm³, Zx = ${r(p.Zx / 1e3, 1)}×10³ mm³, rx = ${r(p.rx, 1)} mm, ry = ${r(p.ry, 1)} mm`;

/* 1. Plate in tension: yielding on gross section vs rupture on net section */
const tensionPlate: Calc = {
  key: "steel-tension-plate",
  title: "Steel plate in tension: yielding and rupture",
  clauses: ["504.2", "504.3"],
  fields: [
    { key: "b", label: "Plate width b", unit: "mm", type: "number", default: 150 },
    { key: "t", label: "Plate thickness t", unit: "mm", type: "number", default: 10 },
    { key: "nh", label: "Bolt holes across the section", type: "number", default: 2 },
    { key: "db", label: "Bolt diameter", unit: "mm", type: "number", default: 20 },
    { key: "U", label: "Shear lag factor U", type: "number", default: 1, help: "1.0 when all elements are connected (plates)" },
    FY,
    { key: "fu", label: "Fu", unit: "MPa", type: "number", default: 400, help: "A36 = 400, A572 Gr 50 = 450" },
  ],
  compute(i) {
    const b = n(i.b), t = n(i.t), nh = n(i.nh), db = n(i.db), U = n(i.U), fy = n(i.fy), fu = n(i.fu);
    const dh = db <= 24 ? db + 2 : db + 3;
    const Ag = b * t, An = (b - nh * (dh + 2)) * t, Ae = U * An;
    const Ty = (0.9 * fy * Ag) / 1000, Tr = (0.75 * fu * Ae) / 1000;
    const phiTn = Math.min(Ty, Tr);
    return {
      results: [
        { label: "φTn (governing)", value: r(phiTn, 1), unit: "kN", main: true },
        { label: "Yielding: 0.90 Fy Ag", value: r(Ty, 1), unit: "kN" },
        { label: "Rupture: 0.75 Fu Ae", value: r(Tr, 1), unit: "kN" },
        { label: "Governs", value: Ty <= Tr ? "Yielding" : "Rupture" },
      ],
      checks: [
        { label: "An ≤ 0.85 Ag for splice plates (bolted)", ok: An <= 0.85 * Ag, detail: `An/Ag = ${r(An / Ag, 3)}; if a splice plate, An is limited to 0.85Ag` },
        { label: "Net area positive", ok: An > 0, detail: `An = ${r(An, 0)} mm²` },
      ],
      steps: [
        `Standard hole dh = ${dh} mm; width deducted per hole = dh + 2 = ${dh + 2} mm`,
        `Ag = ${b} × ${t} = ${r(Ag, 0)} mm²; An = (${b} − ${nh} × ${dh + 2}) × ${t} = ${r(An, 0)} mm²; Ae = U·An = ${r(Ae, 0)} mm²`,
        `Yielding: φTn = 0.90 × ${fy} × ${r(Ag, 0)} = ${r(Ty, 1)} kN`,
        `Rupture: φTn = 0.75 × ${fu} × ${r(Ae, 0)} = ${r(Tr, 1)} kN`,
        `φTn = min = ${r(phiTn, 1)} kN (block shear checked separately)`,
      ],
    };
  },
};

/* 2. W-shape column: flexural buckling (E3) */
const compressionW: Calc = {
  key: "steel-compression-w",
  title: "Steel W-shape column: compressive strength φPn",
  clauses: ["505.3", "502.4.1"],
  fields: [
    ...DIMS,
    { key: "klx", label: "KxLx (strong axis)", unit: "mm", type: "number", default: 3000 },
    { key: "kly", label: "KyLy (weak axis)", unit: "mm", type: "number", default: 3000 },
    FY,
  ],
  compute(i) {
    const p = iShape(n(i.d), n(i.bf), n(i.tf), n(i.tw));
    const fy = n(i.fy), klx = n(i.klx), kly = n(i.kly);
    const slx = klx / p.rx, sly = kly / p.ry, sl = Math.max(slx, sly);
    const Fe = (Math.PI ** 2 * E) / sl ** 2;
    const limit = 4.71 * Math.sqrt(E / fy);
    const Fcr = sl <= limit ? 0.658 ** (fy / Fe) * fy : 0.877 * Fe;
    const phiPn = (0.9 * Fcr * p.A) / 1000;
    const lf = n(i.bf) / (2 * n(i.tf)), lfLim = 0.56 * Math.sqrt(E / fy);
    const lw = p.hw / n(i.tw), lwLim = 1.49 * Math.sqrt(E / fy);
    return {
      results: [
        { label: "φPn", value: r(phiPn, 1), unit: "kN", main: true },
        { label: "Governing KL/r", value: r(sl, 1) },
        { label: "Fe", value: r(Fe, 1), unit: "MPa" },
        { label: "Fcr", value: r(Fcr, 1), unit: "MPa" },
        { label: "A", value: r(p.A, 0), unit: "mm²" },
      ],
      checks: [
        { label: "Flange not slender (bf/2tf ≤ 0.56√(E/Fy))", ok: lf <= lfLim, detail: `${r(lf, 2)} vs ${r(lfLim, 2)}${lf > lfLim ? ": slender, E7 applies (not covered)" : ""}` },
        { label: "Web not slender (h/tw ≤ 1.49√(E/Fy))", ok: lw <= lwLim, detail: `${r(lw, 2)} vs ${r(lwLim, 2)}${lw > lwLim ? ": slender, E7 applies (not covered)" : ""}` },
        { label: "KL/r ≤ 200 (recommended)", ok: sl <= 200, detail: `KL/r = ${r(sl, 1)}` },
        { label: "Inelastic buckling range", ok: true, detail: sl <= limit ? `KL/r ≤ 4.71√(E/Fy) = ${r(limit, 1)}: Fcr = 0.658^(Fy/Fe)·Fy` : `KL/r > ${r(limit, 1)}: Fcr = 0.877Fe` },
      ],
      steps: [
        propSteps(p),
        `KxLx/rx = ${klx}/${r(p.rx, 1)} = ${r(slx, 1)}; KyLy/ry = ${kly}/${r(p.ry, 1)} = ${r(sly, 1)} → use ${r(sl, 1)}`,
        `Fe = π²E/(KL/r)² = π² × ${E} / ${r(sl, 1)}² = ${r(Fe, 1)} MPa`,
        sl <= limit ? `Fcr = 0.658^(${fy}/${r(Fe, 1)}) × ${fy} = ${r(Fcr, 1)} MPa` : `Fcr = 0.877 × ${r(Fe, 1)} = ${r(Fcr, 1)} MPa`,
        `φPn = 0.90 × ${r(Fcr, 1)} × ${r(p.A, 0)} = ${r(phiPn, 1)} kN`,
      ],
    };
  },
};

/* 3. W-shape beam: flexure with lateral-torsional buckling (F2) + web shear (G2) */
const flexureW: Calc = {
  key: "steel-flexure-w",
  title: "Steel W-shape beam: flexure (LTB) and shear",
  clauses: ["506.2", "507.2", "502.4.1"],
  fields: [
    { key: "d", label: "Depth d", unit: "mm", type: "number", default: 307 },
    { key: "bf", label: "Flange width bf", unit: "mm", type: "number", default: 165 },
    { key: "tf", label: "Flange thickness tf", unit: "mm", type: "number", default: 11.8 },
    { key: "tw", label: "Web thickness tw", unit: "mm", type: "number", default: 6.6 },
    { key: "lb", label: "Unbraced length Lb", unit: "mm", type: "number", default: 3000 },
    { key: "cb", label: "Cb (1.0 = conservative)", type: "number", default: 1 },
    FY,
  ],
  compute(i) {
    const d = n(i.d), bf = n(i.bf), tf = n(i.tf), tw = n(i.tw), lb = n(i.lb), cb = n(i.cb), fy = n(i.fy);
    const p = iShape(d, bf, tf, tw);
    const Mp = (fy * p.Zx) / 1e6;
    const Lp = 1.76 * p.ry * Math.sqrt(E / fy);
    const jc = (p.J * 1) / (p.Sx * p.ho);
    const Lr = 1.95 * p.rts * (E / (0.7 * fy)) * Math.sqrt(jc + Math.sqrt(jc ** 2 + 6.76 * ((0.7 * fy) / E) ** 2));
    let Mn: number, zone: string;
    if (lb <= Lp) { Mn = Mp; zone = "Lb ≤ Lp: yielding, Mn = Mp"; }
    else if (lb <= Lr) {
      Mn = Math.min(cb * (Mp - (Mp - (0.7 * fy * p.Sx) / 1e6) * ((lb - Lp) / (Lr - Lp))), Mp);
      zone = "Lp < Lb ≤ Lr: inelastic LTB";
    } else {
      const Fcr = ((cb * Math.PI ** 2 * E) / (lb / p.rts) ** 2) * Math.sqrt(1 + 0.078 * jc * (lb / p.rts) ** 2);
      Mn = Math.min((Fcr * p.Sx) / 1e6, Mp);
      zone = "Lb > Lr: elastic LTB";
    }
    const Vn = (0.6 * fy * d * tw) / 1000;
    const hw = p.hw / tw, shearLim = 2.24 * Math.sqrt(E / fy);
    const lf = bf / (2 * tf), lfLim = 0.38 * Math.sqrt(E / fy), lwLim = 3.76 * Math.sqrt(E / fy);
    return {
      results: [
        { label: "φMn", value: r(0.9 * Mn, 1), unit: "kN·m", main: true },
        { label: "φVn (φ = 1.0)", value: r(Vn, 1), unit: "kN", main: true },
        { label: "Mp", value: r(Mp, 1), unit: "kN·m" },
        { label: "Lp", value: r(Lp, 0), unit: "mm" },
        { label: "Lr", value: r(Lr, 0), unit: "mm" },
        { label: "Zone", value: zone },
      ],
      checks: [
        { label: "Compact flange (bf/2tf ≤ 0.38√(E/Fy))", ok: lf <= lfLim, detail: `${r(lf, 2)} vs ${r(lfLim, 2)}${lf > lfLim ? ": noncompact, F3 applies (not covered)" : ""}` },
        { label: "Compact web (h/tw ≤ 3.76√(E/Fy))", ok: hw <= lwLim, detail: `${r(hw, 1)} vs ${r(lwLim, 1)}` },
        { label: "Shear: h/tw ≤ 2.24√(E/Fy) → φv = 1.0, Cv1 = 1.0", ok: hw <= shearLim, detail: `${r(hw, 1)} vs ${r(shearLim, 1)}${hw > shearLim ? ": use φv = 0.9 and Cv1 < 1 (not covered)" : ""}` },
      ],
      steps: [
        propSteps(p),
        `J = ${r(p.J / 1e3, 1)}×10³ mm⁴, ho = ${r(p.ho, 1)} mm, rts = ${r(p.rts, 1)} mm`,
        `Mp = Fy·Zx = ${fy} × ${r(p.Zx, 0)} = ${r(Mp, 1)} kN·m`,
        `Lp = 1.76·ry·√(E/Fy) = 1.76 × ${r(p.ry, 1)} × ${r(Math.sqrt(E / fy), 2)} = ${r(Lp, 0)} mm`,
        `Lr = 1.95·rts·(E/0.7Fy)·√(Jc/(Sx·ho) + √((Jc/(Sx·ho))² + 6.76(0.7Fy/E)²)) = ${r(Lr, 0)} mm`,
        `${zone} → Mn = ${r(Mn, 1)} kN·m (Cb = ${cb}); φMn = 0.90 × ${r(Mn, 1)} = ${r(0.9 * Mn, 1)} kN·m`,
        `Vn = 0.6·Fy·d·tw = 0.6 × ${fy} × ${d} × ${tw} = ${r(Vn, 1)} kN`,
      ],
    };
  },
};

/* 4. Bolt group in shear: concentric or eccentric (elastic method) */
const FNV: Record<string, number> = { "A325-N": 372, "A325-X": 469, "A490-N": 469, "A490-X": 579 };
const boltGroup: Calc = {
  key: "steel-bolt-group",
  title: "Bolt group in shear: concentric or eccentric (elastic method)",
  clauses: ["510.3"],
  fields: [
    { key: "db", label: "Bolt diameter", unit: "mm", type: "number", default: 20 },
    { key: "grade", label: "Bolt grade / threads", type: "select", default: "A325-N",
      options: [{ value: "A325-N", label: "A325 / Gr 8.8, threads included (Fnv 372)" }, { value: "A325-X", label: "A325, threads excluded (Fnv 469)" },
        { value: "A490-N", label: "A490 / Gr 10.9, threads included (Fnv 469)" }, { value: "A490-X", label: "A490, threads excluded (Fnv 579)" }] },
    { key: "planes", label: "Shear planes", type: "number", default: 1 },
    { key: "cols", label: "Columns of bolts (horizontal)", type: "number", default: 2 },
    { key: "rows", label: "Rows of bolts (vertical)", type: "number", default: 3 },
    { key: "sx", label: "Column spacing (gauge)", unit: "mm", type: "number", default: 75 },
    { key: "sy", label: "Row spacing (pitch)", unit: "mm", type: "number", default: 75 },
    { key: "e", label: "Eccentricity of load from group centroid", unit: "mm", type: "number", default: 150, help: "0 = concentric" },
    { key: "t", label: "Thinnest connected plate t", unit: "mm", type: "number", default: 10 },
    { key: "fu", label: "Plate Fu", unit: "MPa", type: "number", default: 400 },
    { key: "le", label: "Edge distance in direction of load", unit: "mm", type: "number", default: 40 },
  ],
  compute(i) {
    const db = n(i.db), planes = n(i.planes), cols = n(i.cols), rows = n(i.rows), sx = n(i.sx), sy = n(i.sy), e = n(i.e), t = n(i.t), fu = n(i.fu), le = n(i.le);
    const fnv = FNV[String(i.grade)] ?? 372;
    const Ab = (Math.PI * db * db) / 4;
    const dh = db <= 24 ? db + 2 : db + 3;
    const shear = (0.75 * fnv * Ab * planes) / 1000;
    const lc = Math.max(Math.min(le - dh / 2, sy - dh), 0);
    const bear = (0.75 * Math.min(1.2 * lc * t * fu, 2.4 * db * t * fu)) / 1000;
    const rn = Math.min(shear, bear);
    const N = cols * rows;
    const pts: [number, number][] = [];
    for (let c = 0; c < cols; c++) for (let w = 0; w < rows; w++) pts.push([(c - (cols - 1) / 2) * sx, (w - (rows - 1) / 2) * sy]);
    const J = pts.reduce((s, [x, y]) => s + x * x + y * y, 0);
    let cmax = 1 / N, crit = "all bolts equal";
    if (e > 0 && J > 0) {
      cmax = 0;
      for (const [x, y] of pts) {
        const rv = 1 / N + (e * Math.abs(x)) / J, rh = (e * Math.abs(y)) / J;
        const c = Math.hypot(rv, rh);
        if (c > cmax) { cmax = c; crit = `corner bolt at (${r(x, 1)}, ${r(y, 1)}) mm`; }
      }
    }
    const phiPn = rn / cmax;
    return {
      results: [
        { label: "φPn of group", value: r(phiPn, 1), unit: "kN", main: true },
        { label: "φrn per bolt (governing)", value: r(rn, 1), unit: "kN" },
        { label: "Bolt shear φrn", value: r(shear, 1), unit: "kN" },
        { label: "Bearing/tearout φrn", value: r(bear, 1), unit: "kN" },
        { label: "Effective number of bolts (1/Cmax)", value: r(1 / cmax, 2) },
      ],
      checks: [
        { label: "Spacing ≥ 3d (preferred; min 2.67d)", ok: Math.min(sx, sy) >= 2.67 * db, detail: `min spacing ${Math.min(sx, sy)} mm vs 2.67d = ${r(2.67 * db, 1)} mm, 3d = ${3 * db} mm` },
        { label: "Elastic method is conservative", ok: true, detail: "The instantaneous-center method gives higher capacity for eccentric groups" },
        { label: "Edge distance ≥ table minimum", ok: true, detail: "Check against the hole/spacing/edge card" },
      ],
      steps: [
        `Ab = π${db}²/4 = ${r(Ab, 1)} mm²; Fnv = ${fnv} MPa; dh = ${dh} mm`,
        `Shear: φrn = 0.75 × ${fnv} × ${r(Ab, 1)} × ${planes} = ${r(shear, 1)} kN`,
        `lc = min(le − dh/2, s − dh) = ${r(lc, 1)} mm; Bearing: φrn = 0.75 × min(1.2·lc·t·Fu, 2.4·d·t·Fu) = ${r(bear, 1)} kN`,
        `Group: n = ${N}, Σ(x²+y²) = ${r(J, 0)} mm²`,
        e > 0 ? `Per unit load P: critical ${crit}, C = √((1/n + e·x/Σr²)² + (e·y/Σr²)²) = ${r(cmax, 4)}` : `Concentric: each bolt carries P/n`,
        `φPn = φrn / C = ${r(rn, 1)} / ${r(cmax, 4)} = ${r(phiPn, 1)} kN`,
      ],
    };
  },
};

/* 5. Fillet weld: strength + size limits (J2) */
const filletWeld: Calc = {
  key: "steel-fillet-weld",
  title: "Fillet weld: strength and size limits",
  clauses: ["510.2"],
  fields: [
    { key: "w", label: "Leg size w", unit: "mm", type: "number", default: 6 },
    { key: "L", label: "Total effective length L", unit: "mm", type: "number", default: 200 },
    { key: "fexx", label: "Electrode", type: "select", default: "482.6",
      options: [{ value: "482.6", label: "E70XX (FEXX = 482.6 MPa)" }, { value: "413.7", label: "E60XX (FEXX = 413.7 MPa)" }] },
    { key: "t", label: "Thinner part joined t", unit: "mm", type: "number", default: 10 },
    { key: "tedge", label: "Thickness of the edge being welded along", unit: "mm", type: "number", default: 10 },
  ],
  compute(i) {
    const w = n(i.w), L = n(i.L), fexx = n(i.fexx), t = n(i.t), te = n(i.tedge);
    const minW = t <= 6 ? 3 : t <= 13 ? 5 : t <= 19 ? 6 : 8;
    const maxW = te < 6 ? te : te - 2;
    const throat = 0.707 * w;
    const phiRn = (0.75 * 0.6 * fexx * throat * L) / 1000;
    return {
      results: [
        { label: "φRn of weld", value: r(phiRn, 1), unit: "kN", main: true },
        { label: "φRn per mm", value: r(phiRn / L, 3), unit: "kN/mm" },
        { label: "Effective throat", value: r(throat, 2), unit: "mm" },
        { label: "Minimum leg size", value: minW, unit: "mm" },
        { label: "Maximum leg size along edge", value: r(maxW, 1), unit: "mm" },
      ],
      checks: [
        { label: "w ≥ minimum size", ok: w >= minW, detail: `${w} vs ${minW} mm (based on thinner part ${t} mm)` },
        { label: "w ≤ maximum size along edge", ok: w <= maxW, detail: `${w} vs ${r(maxW, 1)} mm` },
        { label: "Length ≥ 4w", ok: L >= 4 * w, detail: `${L} vs ${4 * w} mm${L < 4 * w ? ": effective size limited to L/4" : ""}` },
        { label: "Base metal checked separately", ok: true, detail: "Check shear yielding/rupture of the connected parts" },
      ],
      steps: [
        `Throat = 0.707 × ${w} = ${r(throat, 3)} mm`,
        `φRn = 0.75 × 0.60 × FEXX × throat × L = 0.75 × 0.60 × ${fexx} × ${r(throat, 3)} × ${L} = ${r(phiRn, 1)} kN`,
        `Min size (thinner part ${t} mm) = ${minW} mm; max size along a ${te} mm edge = ${r(maxW, 1)} mm`,
      ],
    };
  },
};

export const STEEL_CALCS: Calc[] = [tensionPlate, compressionW, flexureW, boltGroup, filletWeld];
