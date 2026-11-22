// CEMP calculation library (v0.3.0). Pure functions, SI units (mm, MPa, N, kN·m).
// Equations follow NSCP 2015 Vol. 1 Chapter 4 (= ACI 318-14 numbering with a "4" prefix).
// Every calc returns step-by-step substitutions so results can be hand-checked.

import { type Calc, type Inputs, n, r, ES, barArea, beta1, phiFlexure } from "./core";
import { STEEL_CALCS } from "./steel";
import { CM_CALCS } from "./cm";
import { QAQC_CALCS } from "./qaqc";
import { SAFETY_CALCS } from "./safety";
export * from "./core";

const LAMBDA = { type: "select" as const, key: "lambda", label: "Concrete type (λ)", default: "1",
  options: [{ value: "1", label: "Normal weight (λ = 1.0)" }, { value: "0.75", label: "Lightweight (λ = 0.75)" }] };

/* 1. Development length + tension lap splice (NSCP 425.4.2.3 general equation, 425.5.2) */
const devLength: Calc = {
  key: "dev-length-tension",
  title: "Development length & tension lap splice",
  clauses: ["425.4.2", "425.5.2"],
  fields: [
    { key: "db", label: "Bar diameter db", unit: "mm", type: "number", default: 20, min: 6 },
    { key: "fy", label: "Steel yield strength fy", unit: "MPa", type: "number", default: 415 },
    { key: "fc", label: "Concrete strength f'c", unit: "MPa", type: "number", default: 21 },
    LAMBDA,
    { key: "top", label: "Casting position (ψt)", type: "select", default: "1",
      options: [{ value: "1", label: "Other bars (ψt = 1.0)" }, { value: "1.3", label: "Top bars: >300 mm fresh concrete below (ψt = 1.3)" }] },
    { key: "psie", label: "Coating (ψe)", type: "select", default: "1",
      options: [{ value: "1", label: "Uncoated / galvanized (1.0)" }, { value: "1.2", label: "Epoxy, other cases (1.2)" }, { value: "1.5", label: "Epoxy, cover < 3db or spacing < 6db (1.5)" }] },
    { key: "cb", label: "cb: smaller of cover to bar center or ½ c/c spacing", unit: "mm", type: "number", default: 60,
      help: "e.g. 40 cover + 10 stirrup + db/2" },
    { key: "ktr", label: "Ktr: transverse reinforcement index (0 = conservative)", unit: "mm", type: "number", default: 0 },
  ],
  compute(i) {
    const db = n(i.db), fy = n(i.fy), fc = n(i.fc), lam = n(i.lambda), pt = n(i.top), pe = n(i.psie), cb = n(i.cb), ktr = n(i.ktr);
    const ps = db <= 19 ? 0.8 : 1.0;
    const ptpe = Math.min(pt * pe, 1.7);
    const sfc = Math.min(Math.sqrt(fc), 8.3);
    const conf = Math.min((cb + ktr) / db, 2.5);
    const ldCalc = (fy / (1.1 * lam * sfc)) * ((ptpe * ps) / conf) * db;
    const ld = Math.max(ldCalc, 300);
    const lapA = Math.max(ld, 300), lapB = Math.max(1.3 * ld, 300);
    return {
      results: [
        { label: "Development length ld", value: r(ld, 0), unit: "mm", main: true },
        { label: "Class A lap (1.0 ld)", value: r(lapA, 0), unit: "mm" },
        { label: "Class B lap (1.3 ld), the usual case", value: r(lapB, 0), unit: "mm", main: true },
        { label: "ld / db", value: r(ld / db, 1) },
      ],
      checks: [
        { label: "ψt·ψe ≤ 1.7", ok: true, detail: `ψt·ψe = ${r(pt * pe, 2)}${pt * pe > 1.7 ? " → capped at 1.7" : ""}` },
        { label: "√f'c ≤ 8.3 MPa", ok: Math.sqrt(fc) <= 8.3, detail: `√f'c = ${r(Math.sqrt(fc), 3)} MPa` },
        { label: "(cb + Ktr)/db ≤ 2.5", ok: true, detail: `${r((cb + ktr) / db, 2)}${(cb + ktr) / db > 2.5 ? " → capped at 2.5" : ""}` },
        { label: "ld ≥ 300 mm", ok: ldCalc >= 300, detail: ldCalc >= 300 ? "governs by equation" : "300 mm minimum governs" },
      ],
      steps: [
        `ψs = ${ps} (${db <= 19 ? "db ≤ 19 mm" : "db > 19 mm"}); ψt·ψe = ${r(ptpe, 2)}; λ = ${lam}`,
        `√f'c = √${fc} = ${r(sfc, 3)} MPa`,
        `(cb + Ktr)/db = (${cb} + ${ktr})/${db} = ${r((cb + ktr) / db, 3)} → use ${r(conf, 3)}`,
        `ld = [fy / (1.1 λ √f'c)] × [ψt ψe ψs / ((cb+Ktr)/db)] × db`,
        `ld = [${fy} / (1.1 × ${lam} × ${r(sfc, 3)})] × [${r(ptpe, 2)} × ${ps} / ${r(conf, 3)}] × ${db} = ${r(ldCalc, 1)} mm`,
        `ld = max(${r(ldCalc, 1)}, 300) = ${r(ld, 1)} mm`,
        `Class B lap = 1.3 × ${r(ld, 1)} = ${r(1.3 * ld, 1)} mm (≥ 300 mm)`,
      ],
    };
  },
};

/* 2. Standard hook development length (NSCP 425.4.3.1) */
const hookLength: Calc = {
  key: "dev-length-hook",
  title: "Development length of standard hooks in tension",
  clauses: ["425.4.3", "425.3"],
  fields: [
    { key: "db", label: "Bar diameter db", unit: "mm", type: "number", default: 20 },
    { key: "fy", label: "Steel yield strength fy", unit: "MPa", type: "number", default: 415 },
    { key: "fc", label: "Concrete strength f'c", unit: "MPa", type: "number", default: 21 },
    LAMBDA,
    { key: "psie", label: "Coating (ψe)", type: "select", default: "1", options: [{ value: "1", label: "Uncoated (1.0)" }, { value: "1.2", label: "Epoxy-coated (1.2)" }] },
    { key: "psic", label: "Cover (ψc)", type: "select", default: "1",
      options: [{ value: "1", label: "Other (1.0)" }, { value: "0.7", label: "≤ 36 mm bar, side cover ≥ 65 mm (and 50 mm beyond 90° hook) (0.7)" }] },
    { key: "psir", label: "Confining ties (ψr)", type: "select", default: "1",
      options: [{ value: "1", label: "Other (1.0)" }, { value: "0.8", label: "≤ 36 mm bar enclosed by ties at ≤ 3db (0.8)" }] },
  ],
  compute(i) {
    const db = n(i.db), fy = n(i.fy), fc = n(i.fc), lam = n(i.lambda), pe = n(i.psie), pc = n(i.psic), pr = n(i.psir);
    const sfc = Math.min(Math.sqrt(fc), 8.3);
    const calc = ((0.24 * fy * pe * pc * pr) / (lam * sfc)) * db;
    const min = Math.max(8 * db, 150);
    const ldh = Math.max(calc, min);
    return {
      results: [
        { label: "Hook development length ldh", value: r(ldh, 0), unit: "mm", main: true },
        { label: "Minimum (8db, 150 mm)", value: r(min, 0), unit: "mm" },
        { label: "Tail: 90° hook = 12db", value: r(12 * db, 0), unit: "mm" },
        { label: "Tail: 180° hook = max(4db, 65)", value: r(Math.max(4 * db, 65), 0), unit: "mm" },
      ],
      checks: [{ label: "ldh ≥ max(8db, 150 mm)", ok: calc >= min, detail: calc >= min ? "equation governs" : "minimum governs" }],
      steps: [
        `√f'c = ${r(sfc, 3)} MPa`,
        `ldh = (0.24 fy ψe ψc ψr / (λ √f'c)) × db`,
        `ldh = (0.24 × ${fy} × ${pe} × ${pc} × ${pr} / (${lam} × ${r(sfc, 3)})) × ${db} = ${r(calc, 1)} mm`,
        `ldh = max(${r(calc, 1)}, 8 × ${db}, 150) = ${r(ldh, 1)} mm`,
      ],
    };
  },
};

/* 3. Singly reinforced rectangular beam: analysis (φMn) */
const beamAnalysis: Calc = {
  key: "beam-flexure-analysis",
  title: "Rectangular beam: flexural capacity φMn (singly reinforced)",
  clauses: ["422.2", "421.2", "409.6.1"],
  fields: [
    { key: "b", label: "Width b", unit: "mm", type: "number", default: 300 },
    { key: "d", label: "Effective depth d", unit: "mm", type: "number", default: 450 },
    { key: "nbars", label: "Number of tension bars", type: "number", default: 4, min: 1 },
    { key: "db", label: "Bar diameter", unit: "mm", type: "number", default: 20 },
    { key: "fc", label: "f'c", unit: "MPa", type: "number", default: 21 },
    { key: "fy", label: "fy", unit: "MPa", type: "number", default: 415 },
  ],
  compute(i) {
    const b = n(i.b), d = n(i.d), nb = n(i.nbars), db = n(i.db), fc = n(i.fc), fy = n(i.fy);
    const As = nb * barArea(db);
    const b1 = beta1(fc);
    const a = (As * fy) / (0.85 * fc * b);
    const c = a / b1;
    const et = (0.003 * (d - c)) / c;
    const phi = phiFlexure(et, fy);
    const Mn = (As * fy * (d - a / 2)) / 1e6;
    const asmin = Math.max((0.25 * Math.sqrt(fc)) / fy, 1.4 / fy) * b * d;
    return {
      results: [
        { label: "φMn", value: r(phi * Mn, 1), unit: "kN·m", main: true },
        { label: "Mn", value: r(Mn, 1), unit: "kN·m" },
        { label: "φ", value: r(phi, 3) },
        { label: "As provided", value: r(As, 1), unit: "mm²" },
        { label: "a", value: r(a, 1), unit: "mm" },
        { label: "c", value: r(c, 1), unit: "mm" },
        { label: "εt", value: r(et, 5) },
      ],
      checks: [
        { label: "Tension-controlled (εt ≥ 0.005)", ok: et >= 0.005, detail: `εt = ${r(et, 5)}` },
        { label: "Beam εt ≥ 0.004 (409.3.3)", ok: et >= 0.004, detail: et >= 0.004 ? "OK" : "Section over-reinforced for a beam" },
        { label: "As ≥ As,min", ok: As >= asmin, detail: `As,min = max(0.25√f'c/fy, 1.4/fy)·b·d = ${r(asmin, 1)} mm²` },
      ],
      steps: [
        `As = ${nb} × π(${db})²/4 = ${r(As, 1)} mm²`,
        `β1 = ${r(b1, 3)}`,
        `a = As·fy / (0.85·f'c·b) = ${r(As, 1)} × ${fy} / (0.85 × ${fc} × ${b}) = ${r(a, 2)} mm`,
        `c = a/β1 = ${r(c, 2)} mm`,
        `εt = 0.003 (d − c)/c = 0.003 × (${d} − ${r(c, 2)}) / ${r(c, 2)} = ${r(et, 5)} → φ = ${r(phi, 3)}`,
        `Mn = As·fy·(d − a/2) = ${r(As, 1)} × ${fy} × (${d} − ${r(a / 2, 2)}) = ${r(Mn, 2)} kN·m`,
        `φMn = ${r(phi, 3)} × ${r(Mn, 2)} = ${r(phi * Mn, 2)} kN·m`,
      ],
    };
  },
};

/* 4. Singly reinforced rectangular beam: design (required As for Mu) */
const beamDesign: Calc = {
  key: "beam-flexure-design",
  title: "Rectangular beam: required tension steel for Mu",
  clauses: ["422.2", "421.2", "409.6.1"],
  fields: [
    { key: "mu", label: "Factored moment Mu", unit: "kN·m", type: "number", default: 150 },
    { key: "b", label: "Width b", unit: "mm", type: "number", default: 300 },
    { key: "d", label: "Effective depth d", unit: "mm", type: "number", default: 450 },
    { key: "fc", label: "f'c", unit: "MPa", type: "number", default: 21 },
    { key: "fy", label: "fy", unit: "MPa", type: "number", default: 415 },
    { key: "db", label: "Bar diameter to use", unit: "mm", type: "number", default: 20 },
  ],
  compute(i) {
    const mu = n(i.mu), b = n(i.b), d = n(i.d), fc = n(i.fc), fy = n(i.fy), db = n(i.db);
    const phi = 0.9;
    const Rn = (mu * 1e6) / (phi * b * d * d);
    const disc = 1 - (2 * Rn) / (0.85 * fc);
    if (disc < 0) {
      return { results: [{ label: "Result", value: "Section too small: increase b or d (or use compression steel)", main: true }],
        checks: [{ label: "Singly reinforced possible", ok: false, detail: `Rn = ${r(Rn, 3)} MPa exceeds 0.425 f'c` }],
        steps: [`Rn = Mu/(φ b d²) = ${r(Rn, 3)} MPa > 0.85f'c/2 → no real solution`] };
    }
    const rho = ((0.85 * fc) / fy) * (1 - Math.sqrt(disc));
    const asreq = rho * b * d;
    const asmin = Math.max((0.25 * Math.sqrt(fc)) / fy, 1.4 / fy) * b * d;
    const As = Math.max(asreq, asmin);
    const nb = Math.ceil(As / barArea(db));
    const AsP = nb * barArea(db);
    const a = (AsP * fy) / (0.85 * fc * b), c = a / beta1(fc), et = (0.003 * (d - c)) / c;
    const phiP = phiFlexure(et, fy);
    const phiMn = (phiP * AsP * fy * (d - a / 2)) / 1e6;
    return {
      results: [
        { label: "Required As", value: r(As, 1), unit: "mm²", main: true },
        { label: `Use ${nb} – ${db} mm bars`, value: r(AsP, 1), unit: "mm²", main: true },
        { label: "ρ required", value: r(rho, 5) },
        { label: "φMn with bars provided", value: r(phiMn, 1), unit: "kN·m" },
      ],
      checks: [
        { label: "φMn ≥ Mu", ok: phiMn >= mu, detail: `${r(phiMn, 1)} vs ${mu} kN·m` },
        { label: "Tension-controlled (εt ≥ 0.005)", ok: et >= 0.005, detail: `εt = ${r(et, 5)} with bars provided` },
        { label: "As,min governs?", ok: true, detail: asreq >= asmin ? "No: strength governs" : `Yes: As,min = ${r(asmin, 1)} mm²` },
        { label: "Bars fit in width", ok: true, detail: "Check clear spacing with the spacing card / detailing" },
      ],
      steps: [
        `Rn = Mu/(φ b d²) = ${mu}×10⁶ / (0.9 × ${b} × ${d}²) = ${r(Rn, 4)} MPa`,
        `ρ = (0.85f'c/fy)[1 − √(1 − 2Rn/(0.85f'c))] = ${r(rho, 6)}`,
        `As = ρbd = ${r(asreq, 1)} mm²; As,min = ${r(asmin, 1)} mm² → As = ${r(As, 1)} mm²`,
        `n = As / (π${db}²/4) = ${r(As / barArea(db), 2)} → ${nb} bars = ${r(AsP, 1)} mm²`,
        `Check: a = ${r(a, 2)} mm, c = ${r(c, 2)} mm, εt = ${r(et, 5)}, φ = ${r(phiP, 3)}, φMn = ${r(phiMn, 2)} kN·m`,
      ],
    };
  },
};

/* 5. One-way slab: minimum thickness + shrinkage/temperature steel */
const SLAB_DEN: Record<string, number> = { simple: 20, one: 24, both: 28, cantilever: 10 };
const oneWaySlab: Calc = {
  key: "one-way-slab-basic",
  title: "One-way slab: minimum thickness & temperature bars",
  clauses: ["407.3.1", "424.4.3"],
  fields: [
    { key: "L", label: "Span length ℓ", unit: "mm", type: "number", default: 3000 },
    { key: "support", label: "Support condition", type: "select", default: "both",
      options: [{ value: "simple", label: "Simply supported (ℓ/20)" }, { value: "one", label: "One end continuous (ℓ/24)" },
        { value: "both", label: "Both ends continuous (ℓ/28)" }, { value: "cantilever", label: "Cantilever (ℓ/10)" }] },
    { key: "fy", label: "fy", unit: "MPa", type: "number", default: 415 },
    { key: "h", label: "Slab thickness provided h", unit: "mm", type: "number", default: 125 },
    { key: "db", label: "Temperature bar diameter", unit: "mm", type: "number", default: 10 },
  ],
  compute(i) {
    const L = n(i.L), fy = n(i.fy), h = n(i.h), db = n(i.db);
    const den = SLAB_DEN[String(i.support)] ?? 20;
    const fac = 0.4 + fy / 700;
    const hmin = (L / den) * fac;
    const rho = fy < 415 ? 0.002 : fy <= 420 ? 0.0018 : Math.max((0.0018 * 420) / fy, 0.0014);
    const As = rho * 1000 * h;
    const smax = Math.min(5 * h, 450);
    const sCalc = (1000 * barArea(db)) / As;
    const s = Math.floor(Math.min(sCalc, smax) / 10) * 10;
    return {
      results: [
        { label: "Minimum thickness hmin", value: r(hmin, 0), unit: "mm", main: true },
        { label: "Temperature steel As", value: r(As, 0), unit: "mm²/m" },
        { label: `Use ${db} mm bars @`, value: s, unit: "mm o.c.", main: true },
        { label: "Max spacing min(5h, 450)", value: smax, unit: "mm" },
      ],
      checks: [
        { label: "h ≥ hmin (deflection not computed)", ok: h >= hmin, detail: `${h} vs ${r(hmin, 1)} mm` },
        { label: "Applies to normal-weight concrete, members not supporting partitions likely to be damaged", ok: true, detail: "Otherwise compute deflections" },
      ],
      steps: [
        `hmin = ℓ/${den} × (0.4 + fy/700) = ${L}/${den} × ${r(fac, 4)} = ${r(hmin, 1)} mm`,
        `ρ(temp) = ${rho === 0.002 ? "0.0020 (fy < 415)" : rho === 0.0018 ? "0.0018 (Grade 415/420)" : `max(0.0018×420/fy, 0.0014) = ${r(rho, 5)}`}`,
        `As = ρ × 1000 × h = ${r(rho, 5)} × 1000 × ${h} = ${r(As, 1)} mm²/m`,
        `s = 1000 × Ab / As = 1000 × ${r(barArea(db), 2)} / ${r(As, 1)} = ${r(sCalc, 1)} mm; max ${smax} mm → use ${s} mm`,
      ],
    };
  },
};

/* 6. Column: maximum design axial strength φPn,max */
const columnAxial: Calc = {
  key: "column-axial-max",
  title: "Column: maximum axial strength φPn,max",
  clauses: ["422.4.2", "421.2", "410.6.1"],
  fields: [
    { key: "type", label: "Transverse reinforcement", type: "select", default: "tied",
      options: [{ value: "tied", label: "Tied (φ = 0.65, 0.80 Po)" }, { value: "spiral", label: "Spiral (φ = 0.75, 0.85 Po)" }] },
    { key: "b", label: "Width b", unit: "mm", type: "number", default: 400 },
    { key: "h", label: "Depth h", unit: "mm", type: "number", default: 400 },
    { key: "nbars", label: "Number of bars", type: "number", default: 8 },
    { key: "db", label: "Bar diameter", unit: "mm", type: "number", default: 20 },
    { key: "fc", label: "f'c", unit: "MPa", type: "number", default: 28 },
    { key: "fy", label: "fy", unit: "MPa", type: "number", default: 415 },
  ],
  compute(i) {
    const spiral = i.type === "spiral";
    const b = n(i.b), h = n(i.h), nb = n(i.nbars), db = n(i.db), fc = n(i.fc), fy = n(i.fy);
    const Ag = b * h, Ast = nb * barArea(db), rho = Ast / Ag;
    const Po = (0.85 * fc * (Ag - Ast) + fy * Ast) / 1000;
    const phi = spiral ? 0.75 : 0.65, alpha = spiral ? 0.85 : 0.8;
    const P = phi * alpha * Po;
    return {
      results: [
        { label: "φPn,max", value: r(P, 1), unit: "kN", main: true },
        { label: "Po", value: r(Po, 1), unit: "kN" },
        { label: "Ast", value: r(Ast, 1), unit: "mm²" },
        { label: "ρg", value: `${r(rho * 100, 2)}%` },
      ],
      checks: [
        { label: "1% ≤ ρg ≤ 8%", ok: rho >= 0.01 && rho <= 0.08, detail: `ρg = ${r(rho * 100, 2)}% (keep ≤ 4% where bars are lapped)` },
        { label: "Minimum bar count", ok: spiral ? nb >= 6 : nb >= 4, detail: spiral ? "≥ 6 bars for spiral" : "≥ 4 bars for rectangular tied" },
        { label: "Axial only", ok: true, detail: "No moment or slenderness: use the interaction diagram for Pu + Mu" },
      ],
      steps: [
        `Ag = ${b} × ${h} = ${Ag} mm²; Ast = ${nb} × π${db}²/4 = ${r(Ast, 1)} mm²`,
        `Po = 0.85 f'c (Ag − Ast) + fy Ast = 0.85 × ${fc} × ${r(Ag - Ast, 1)} + ${fy} × ${r(Ast, 1)} = ${r(Po, 1)} kN`,
        `φPn,max = ${phi} × ${alpha} × ${r(Po, 1)} = ${r(P, 1)} kN`,
      ],
    };
  },
};

export const CALCS: Record<string, Calc> = Object.fromEntries(
  [devLength, hookLength, beamAnalysis, beamDesign, oneWaySlab, columnAxial, ...STEEL_CALCS, ...CM_CALCS, ...QAQC_CALCS, ...SAFETY_CALCS].map((c) => [c.key, c]),
);

export function defaults(c: Calc): Inputs {
  return Object.fromEntries(c.fields.map((f) => [f.key, f.default]));
}
