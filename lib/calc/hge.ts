// Hydraulics & geotechnical calculators (v0.7.0): classic CELE HGE problems.
import { type Calc, n, r } from "./core";

const GW = 9.81; // kN/m³, unit weight of water

/* 1. Hydrostatic force on a submerged rectangular plane surface */
const hydrostatic: Calc = {
  key: "hydrostatic-plane-surface",
  title: "Hydrostatic force on a rectangular gate: total force and center of pressure",
  clauses: [],
  fields: [
    { key: "theta", label: "Angle of gate from the horizontal θ (90 = vertical)", unit: "°", type: "number", default: 90 },
    { key: "h1", label: "Vertical depth of top edge below free surface", unit: "m", type: "number", default: 2 },
    { key: "b", label: "Gate width (horizontal)", unit: "m", type: "number", default: 1.5 },
    { key: "L", label: "Gate length along its plane", unit: "m", type: "number", default: 3 },
    { key: "sg", label: "Specific gravity of liquid", type: "number", default: 1 },
  ],
  compute(i) {
    const th = (n(i.theta) * Math.PI) / 180, s = Math.sin(th), h1 = n(i.h1), b = n(i.b), L = n(i.L), g = GW * n(i.sg);
    if (!(s > 0) || b <= 0 || L <= 0 || h1 < 0) return { results: [{ label: "Input error", value: "Use 0° < θ ≤ 90°, positive sizes", main: true }], checks: [], steps: [] };
    const A = b * L, ybar = h1 / s + L / 2, hc = ybar * s, F = g * hc * A, Ig = (b * L ** 3) / 12;
    const ycp = ybar + Ig / (ybar * A), e = ycp - ybar;
    return {
      results: [
        { label: "Total hydrostatic force F", value: r(F, 2), unit: "kN", main: true },
        { label: "Depth to centroid hc", value: r(hc, 3), unit: "m" },
        { label: "Center of pressure from surface (along plane) ycp", value: r(ycp, 4), unit: "m", main: true },
        { label: "Center of pressure below top edge (along plane)", value: r(ycp - h1 / s, 4), unit: "m", main: true },
        { label: "Eccentricity below centroid e", value: r(e, 4), unit: "m" },
      ],
      checks: [{ label: "Center of pressure below centroid", ok: e > 0, detail: "Always true for a submerged plane: pressure grows with depth" }],
      steps: [
        `γ = ${r(g, 3)} kN/m³; A = b × L = ${b} × ${L} = ${r(A, 3)} m²`,
        `ȳ = h1/sinθ + L/2 = ${h1}/${r(s, 4)} + ${L}/2 = ${r(ybar, 4)} m; hc = ȳ sinθ = ${r(hc, 4)} m`,
        `F = γ hc A = ${r(g, 3)} × ${r(hc, 4)} × ${r(A, 3)} = ${r(F, 3)} kN`,
        `Ig = bL³/12 = ${r(Ig, 4)} m⁴; ycp = ȳ + Ig/(ȳA) = ${r(ybar, 4)} + ${r(Ig, 4)}/(${r(ybar, 4)} × ${r(A, 3)}) = ${r(ycp, 4)} m`,
      ],
    };
  },
};

/* 2. Primary consolidation settlement of a clay layer (NC or OC) */
const consolidation: Calc = {
  key: "consolidation-settlement",
  title: "Primary consolidation settlement of a clay layer (NC / OC)",
  clauses: [],
  fields: [
    { key: "H", label: "Clay layer thickness H", unit: "m", type: "number", default: 4 },
    { key: "e0", label: "Initial void ratio e0", type: "number", default: 0.9 },
    { key: "Cc", label: "Compression index Cc", type: "number", default: 0.3 },
    { key: "Cs", label: "Swell / recompression index Cs", type: "number", default: 0.05 },
    { key: "s0", label: "Initial effective stress at mid-layer σ'0", unit: "kPa", type: "number", default: 80 },
    { key: "ds", label: "Stress increase at mid-layer Δσ", unit: "kPa", type: "number", default: 40 },
    { key: "sc", label: "Preconsolidation pressure σ'c (= σ'0 if normally consolidated)", unit: "kPa", type: "number", default: 80 },
  ],
  compute(i) {
    const H = n(i.H), e0 = n(i.e0), Cc = n(i.Cc), Cs = n(i.Cs), s0 = n(i.s0), ds = n(i.ds), sc = Math.max(n(i.sc), s0);
    if (!(s0 > 0) || ds < 0 || H <= 0) return { results: [{ label: "Input error", value: "σ'0 > 0, Δσ ≥ 0, H > 0", main: true }], checks: [], steps: [] };
    const sf = s0 + ds, k = H / (1 + e0), lg = Math.log10;
    const ocr = sc / s0;
    let S: number, how: string;
    if (ocr <= 1.0000001) { S = k * Cc * lg(sf / s0); how = `NC: S = Cc H/(1+e0) log(σ'f/σ'0) = ${Cc} × ${r(k, 4)} × log(${sf}/${s0})`; }
    else if (sf <= sc) { S = k * Cs * lg(sf / s0); how = `OC, σ'f ≤ σ'c: S = Cs H/(1+e0) log(σ'f/σ'0) = ${Cs} × ${r(k, 4)} × log(${sf}/${s0})`; }
    else { S = k * (Cs * lg(sc / s0) + Cc * lg(sf / sc)); how = `OC, σ'f > σ'c: S = H/(1+e0)[Cs log(σ'c/σ'0) + Cc log(σ'f/σ'c)] = ${r(k, 4)} × [${Cs} × log(${sc}/${s0}) + ${Cc} × log(${sf}/${sc})]`; }
    return {
      results: [
        { label: "Primary consolidation settlement", value: r(S * 1000, 1), unit: "mm", main: true },
        { label: "Final effective stress σ'f", value: r(sf, 2), unit: "kPa" },
        { label: "OCR = σ'c/σ'0", value: r(ocr, 3) },
        { label: "Case", value: ocr <= 1.0000001 ? "Normally consolidated" : sf <= sc ? "Overconsolidated, stays below σ'c" : "Overconsolidated, passes σ'c" },
      ],
      checks: [
        { label: "Single-layer, mid-depth stresses", ok: true, detail: "For thick layers, split into sublayers and add the settlements" },
        { label: "Secondary compression not included", ok: true, detail: "Add Cα H log(t2/t1)/(1+ep) for organic or soft clays" },
      ],
      steps: [`H/(1+e0) = ${H}/(1 + ${e0}) = ${r(k, 4)} m; σ'f = ${s0} + ${ds} = ${sf} kPa`, how, `S = ${r(S, 5)} m = ${r(S * 1000, 1)} mm`],
    };
  },
};

export const HGE_CALCS: Calc[] = [hydrostatic, consolidation];
