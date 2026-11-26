// Beam Optimizer engine (v2.7.0): singly reinforced rectangular RC beam, NSCP 2015 Vol. 1 (= ACI 318-14 numbering
// with a leading 4). Pure TS (no React), so the API and scripts can reuse it. Units: N, mm, MPa unless stated.
//
// Game assumptions (shown in the UI as "verify"):
// - Proportion rule h ≤ 3b (practice, not a code clause).
// - Prismatic rectangular beam, one layer of tension bars, 2 × 12 mm hangers on the compression face (counted as A's
//   only for the long-term deflection multiplier). No slab (no T-beam flange), no torsion, no axial load.
// - Simple span: UDL + optional point load at midspan. Cantilever: UDL + optional point load at the tip.
// - Stirrups are 2-leg closed hoops at one spacing over the whole length. Shear is checked at d from the support face
//   (the support is taken as a point: no support width).
// - Deflection passes if h ≥ the minimum depth of 409.3.1.1 (factor 0.4 + fy/700), otherwise it is computed:
//   Ie by 424.2.3.5 (Branson), Ec = 4700√f'c, fr = 0.62√f'c, sustained load = all dead load, ξ = 2.0 (5 years),
//   limits ΔL ≤ ℓ/360 and λΔ·ΔD + ΔL ≤ ℓ/240 (Table 424.2.2). For a cantilever ℓ = the cantilever length.
// - Quantities: main bars L + 2 × 12db hooks (simple) or L + max(ld, L) back-span anchorage (cantilever);
//   stirrup = perimeter at the bar centreline + two 135° hook extensions max(6ds, 75); first stirrup 50 mm in.
//   Formwork = soffit + both sides over L. Prices are indicative installed rates: see PRICE_NOTE.

export type Support = "simple" | "cantilever";
export type BeamLevel = {
  id: number; name: string; blurb: string; support: Support;
  L: number;            // span or cantilever length, m
  wD: number; wL: number; // superimposed dead and live UDL, kN/m (self-weight is added by the engine)
  PD?: number; PL?: number; // point load, kN: midspan (simple) or tip (cantilever)
  fc: 21 | 28;
  hMax?: number;        // headroom limit on the overall depth, mm (the h options stop here)
  start: Design;        // the design the level opens with (usually fails or is wasteful)
  best?: { cost: number; design: Design }; // exhaustive optimum from scripts/beam-optimum.ts
};
export type Design = { b: number; h: number; n: number; db: number; ds: number; s: number };
export type Check = { key: string; label: string; clause: string; ok: boolean; ratio: number; detail: string; steps: string[] };
export type Cost = { total: number; concrete: number; formwork: number; steel: number; vol: number; area: number; kg: number; kgMain: number; kgStir: number; kgHang: number; nStir: number };
export type Result = { pass: boolean; checks: Check[]; cost: Cost; maxRatio: number; d: number; Mu: number; Vu: number; wu: number; Pu: number; combo: string };

export const OPTIONS = {
  b: [200, 250, 300, 350, 400, 450, 500],
  h: [250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900],
  n: [2, 3, 4, 5, 6, 7, 8],
  db: [12, 16, 20, 25, 28],
  ds: [10, 12],
  s: [75, 100, 125, 150, 175, 200, 225, 250, 275, 300],
} as const;

export const FY = 415, FYT = 275, ES = 200000, COVER = 40, HANGER = 12, GAMMA = 24, DAGG = 20; // MPa, mm, kN/m³
export const PRICES: Record<21 | 28, number> & { form: number; steel: number } = { 21: 6200, 28: 6900, form: 650, steel: 60 };
export const PRICE_NOTE = "Indicative installed rates for the game: ready-mix concrete placed ₱6,200/m³ (f'c 21 MPa) or ₱6,900/m³ (28 MPa), formwork ₱650/m² of contact area, rebar ₱60/kg cut, bent and tied (2026 PH ranges: bars about ₱40–47/kg before labour). Verify against current supplier quotes.";
export const ASSUME_NOTE = "Game assumptions: rectangular beam without slab, h ≤ 3b (practice rule), one layer of tension bars, 2-leg stirrups at one spacing, no torsion, point supports. Deflection passes on the 409.3.1.1 minimum depth or on computed Branson deflections (ξ = 2.0, sustained = dead load). Verify for real design.";

const r = (x: number, p = 2) => { const f = 10 ** p; return Math.round(x * f) / f; };
export const barArea = (d: number) => (Math.PI * d * d) / 4;
export const kgPerM = (d: number) => barArea(d) * 7850e-6; // kg per m
export const beta1 = (fc: number) => (fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - (0.05 * (fc - 28)) / 7));
export const phiFlex = (et: number, fy = FY) => { const ey = fy / ES; return et >= 0.005 ? 0.9 : et <= ey ? 0.65 : 0.65 + (0.25 * (et - ey)) / (0.005 - ey); };
export const effD = (x: Design) => x.h - COVER - x.ds - x.db / 2;
/** Development length of a straight bar in tension, simplified 425.4.2.3 (ψe = λ = 1, clear spacing ≥ db). */
export function devLength(db: number, fc: number, top: boolean) {
  const pt = top ? 1.3 : 1;
  return Math.max(300, ((FY * pt) / ((db >= 22 ? 1.7 : 2.1) * Math.sqrt(fc))) * db);
}

/** Load effects for one combination. w in kN/m, P in kN, L in m → M kN·m, V kN at distance x from the support. */
function effects(lv: BeamLevel, w: number, P: number, xd: number) {
  const L = lv.L;
  if (lv.support === "simple") return { M: (w * L * L) / 8 + (P * L) / 4, V: w * (L / 2 - xd) + P / 2, V0: (w * L) / 2 + P / 2 };
  return { M: (w * L * L) / 2 + P * L, V: w * (L - xd) + P, V0: w * L + P };
}

/** Service deflection (mm) of the governing point for UDL w (kN/m = N/mm) and point P (kN), with EI in N·mm². */
function defl(lv: BeamLevel, w: number, P: number, EI: number) {
  const L = lv.L * 1000, Pn = P * 1000;
  return lv.support === "simple" ? (5 * w * L ** 4) / (384 * EI) + (Pn * L ** 3) / (48 * EI) : (w * L ** 4) / (8 * EI) + (Pn * L ** 3) / (3 * EI);
}

export function costOf(lv: BeamLevel, x: Design): Cost {
  const L = lv.L * 1000, b = x.b, h = x.h;
  const vol = (b * h * L) / 1e9, area = ((b + 2 * h) * L) / 1e6;
  const mainLen = lv.support === "simple" ? L + 2 * 12 * x.db : L + Math.max(devLength(x.db, lv.fc, true), L);
  const hangLen = lv.support === "simple" ? L + 2 * 12 * HANGER : L + 12 * HANGER + 300; // hangers lap 300 into the back span
  const nStir = Math.ceil((L - 100) / x.s) + 1;
  const stirLen = 2 * (b - 2 * COVER - x.ds) + 2 * (h - 2 * COVER - x.ds) + 2 * Math.max(6 * x.ds, 75);
  const kgMain = (x.n * mainLen * kgPerM(x.db)) / 1000, kgHang = (2 * hangLen * kgPerM(HANGER)) / 1000, kgStir = (nStir * stirLen * kgPerM(x.ds)) / 1000;
  const kg = kgMain + kgHang + kgStir;
  const concrete = vol * PRICES[lv.fc], formwork = area * PRICES.form, steel = kg * PRICES.steel;
  return { total: Math.round(concrete + formwork + steel), concrete, formwork, steel, vol, area, kg, kgMain, kgStir, kgHang, nStir };
}

export function evaluate(lv: BeamLevel, x: Design): Result {
  const { b, h, n, db, ds, s } = x, fc = lv.fc, sf = Math.sqrt(fc), L = lv.L * 1000;
  const d = effD(x), As = n * barArea(db), Av = 2 * barArea(ds), Asp = 2 * barArea(HANGER);
  const wsw = (GAMMA * b * h) / 1e6, wDt = lv.wD + wsw, PD = lv.PD ?? 0, PL = lv.PL ?? 0;
  const c1 = { w: 1.4 * wDt, P: 1.4 * PD, name: "1.4D" }, c2 = { w: 1.2 * wDt + 1.6 * lv.wL, P: 1.2 * PD + 1.6 * PL, name: "1.2D + 1.6L" };
  const e1 = effects(lv, c1.w, c1.P, d / 1000), e2 = effects(lv, c2.w, c2.P, d / 1000);
  const g = e1.M >= e2.M ? c1 : c2, Mu = Math.max(e1.M, e2.M), Vu = Math.max(e1.V, e2.V);
  const checks: Check[] = [];
  const loadSteps = [
    `Self-weight = ${GAMMA} × ${b / 1000} × ${h / 1000} = ${r(wsw, 3)} kN/m → D = ${lv.wD} + ${r(wsw, 3)} = ${r(wDt, 3)} kN/m${PD ? `, PD = ${PD} kN` : ""}; L = ${lv.wL} kN/m${PL ? `, PL = ${PL} kN` : ""}`,
    `1.4D: wu = ${r(c1.w, 2)} kN/m${c1.P ? `, Pu = ${r(c1.P, 2)} kN` : ""} → Mu = ${r(e1.M, 2)} kN·m`,
    `1.2D + 1.6L: wu = ${r(c2.w, 2)} kN/m${c2.P ? `, Pu = ${r(c2.P, 2)} kN` : ""} → Mu = ${r(e2.M, 2)} kN·m`,
    lv.support === "simple" ? `Simple span: Mu = wu L²/8${PD || PL ? " + Pu L/4" : ""}; Vu at d = wu (L/2 − d)${PD || PL ? " + Pu/2" : ""}` : `Cantilever: Mu = wu L²/2${PD || PL ? " + Pu L" : ""}; Vu at d = wu (L − d)${PD || PL ? " + Pu" : ""}`,
  ];

  // 0. Proportions (practice rule, not a code clause): h ≤ 3b keeps a narrow beam stable and buildable
  checks.push({
    key: "prop", label: "Proportions h ≤ 3b", clause: "practice rule", ok: h <= 3 * b, ratio: h / (3 * b),
    detail: h <= 3 * b ? `h/b = ${r(h / b, 2)} ≤ 3` : `h/b = ${r(h / b, 2)} > 3: too deep and narrow (lateral stability, congestion at joints): widen it`,
    steps: [`h/b = ${h}/${b} = ${r(h / b, 2)}; game rule h/b ≤ 3 (common practice 1.5–2.5). Not an NSCP clause: verify for real design.`],
  });

  if (lv.hMax) checks.push({
    key: "head", label: `Headroom h ≤ ${lv.hMax} mm`, clause: "level brief", ok: h <= lv.hMax, ratio: h / lv.hMax,
    detail: h <= lv.hMax ? `h = ${h} ≤ ${lv.hMax} mm` : `h = ${h} > ${lv.hMax} mm allowed by the ceiling height`, steps: [`The architect allows at most ${lv.hMax} mm overall depth.`],
  });

  // 1. Bars fit in one layer (425.2.1) and crack-control spacing (424.3.2)
  const clear = n > 1 ? (b - 2 * COVER - 2 * ds - n * db) / (n - 1) : Infinity;
  const clearMin = Math.max(25, db, (4 / 3) * DAGG);
  const cc = COVER + ds, fs = (2 / 3) * FY, sMaxCrack = Math.min(380 * (280 / fs) - 2.5 * cc, 300 * (280 / fs));
  const sBars = n > 1 ? (b - 2 * COVER - 2 * ds - db) / (n - 1) : 0;
  checks.push({
    key: "fit", label: "Bars fit in one layer", clause: "425.2.1, 424.3.2", ok: clear >= clearMin && sBars <= sMaxCrack,
    ratio: Math.max(clearMin / Math.max(clear, 0.01), sBars / sMaxCrack),
    detail: clear < clearMin ? `clear gap ${r(clear, 1)} mm < ${r(clearMin, 1)} mm: use fewer, bigger bars or a wider beam` : sBars > sMaxCrack ? `bar spacing ${r(sBars, 0)} mm > ${r(sMaxCrack, 0)} mm (crack control): use more, smaller bars` : `clear gap ${r(clear, 1)} mm ≥ ${r(clearMin, 1)} mm`,
    steps: [
      `Clear gap = (b − 2·cover − 2·ds − n·db)/(n − 1) = (${b} − ${2 * COVER} − ${2 * ds} − ${n * db})/${n - 1} = ${r(clear, 1)} mm`,
      `Minimum clear gap = max(25, db, 4/3 × ${DAGG} mm aggregate) = ${r(clearMin, 1)} mm`,
      `Crack control: fs = 2/3 fy = ${r(fs, 1)} MPa, cc = ${cc} mm → s ≤ min(380(280/fs) − 2.5cc, 300(280/fs)) = ${r(sMaxCrack, 0)} mm; bars at ${r(sBars, 0)} mm c/c`,
    ],
  });

  // 2. Flexure (422.2, 421.2.2, 409.3.3, 409.6.1)
  const a = (As * FY) / (0.85 * fc * b), c = a / beta1(fc), et = (0.003 * (d - c)) / c, phi = phiFlex(et);
  const phiMn = (phi * As * FY * (d - a / 2)) / 1e6;
  const asMin = Math.max((0.25 * sf) / FY, 1.4 / FY) * b * d;
  const flexOk = phiMn >= Mu && et >= 0.004 && As >= asMin;
  checks.push({
    key: "flex", label: "Bending", clause: "422.2, 421.2.2, 409.3.3, 409.6.1", ok: flexOk,
    ratio: Math.max(Mu / phiMn, 0.004 / Math.max(et, 1e-6), asMin / As),
    detail: et < 0.004 ? `εt = ${r(et, 4)} < 0.004: over-reinforced, make the beam deeper or wider` : As < asMin ? `As = ${r(As, 0)} < As,min ${r(asMin, 0)} mm²` : `φMn = ${r(phiMn, 1)} kN·m ${phiMn >= Mu ? "≥" : "<"} Mu = ${r(Mu, 1)} kN·m (${g.name})`,
    steps: [
      ...loadSteps,
      `d = h − cover − ds − db/2 = ${h} − ${COVER} − ${ds} − ${db / 2} = ${r(d, 1)} mm; As = ${n} × π·${db}²/4 = ${r(As, 1)} mm²`,
      `a = As·fy/(0.85 f'c b) = ${r(As, 1)} × ${FY}/(0.85 × ${fc} × ${b}) = ${r(a, 2)} mm; c = a/β1 = ${r(c, 2)} mm`,
      `εt = 0.003 (d − c)/c = ${r(et, 5)} → φ = ${r(phi, 3)} (beam needs εt ≥ 0.004)`,
      `φMn = φ·As·fy (d − a/2) = ${r(phi, 3)} × ${r(As, 1)} × ${FY} × (${r(d, 1)} − ${r(a / 2, 2)}) = ${r(phiMn, 2)} kN·m`,
      `As,min = max(0.25√f'c/fy, 1.4/fy)·b·d = ${r(asMin, 1)} mm²`,
    ],
  });

  // 3. Shear (422.5, 409.6.3, 409.7.6.2.2)
  const phiV = 0.75, Vc = (0.17 * sf * b * d) / 1000, Vs = (Av * FYT * d) / s / 1000;
  const VsReq = Math.max(0, Vu / phiV - Vc), VsMax = (0.66 * sf * b * d) / 1000, Vlim = (0.33 * sf * b * d) / 1000;
  const sMax = VsReq > Vlim ? Math.min(d / 4, 300) : Math.min(d / 2, 600);
  const avMin = (Math.max(0.062 * sf, 0.35) * b * s) / FYT;
  const phiVn = phiV * (Vc + Vs);
  const shearOk = phiVn >= Vu && VsReq <= VsMax && s <= sMax && Av >= avMin;
  checks.push({
    key: "shear", label: "Shear", clause: "422.5, 409.6.3, 409.7.6.2.2", ok: shearOk,
    ratio: Math.max(Vu / phiVn, VsReq / VsMax, s / sMax, avMin / Av),
    detail: VsReq > VsMax ? `Vs needed ${r(VsReq, 1)} kN > 0.66√f'c bd = ${r(VsMax, 1)} kN: section too small` : s > sMax ? `stirrup spacing ${s} > max ${r(sMax, 0)} mm` : Av < avMin ? `Av ${r(Av, 0)} < Av,min ${r(avMin, 0)} mm²` : `φVn = ${r(phiVn, 1)} kN ${phiVn >= Vu ? "≥" : "<"} Vu = ${r(Vu, 1)} kN at d`,
    steps: [
      `Vu at d from the support = ${r(Vu, 2)} kN (max of 1.4D and 1.2D + 1.6L)`,
      `Vc = 0.17 λ √f'c b d = 0.17 × ${r(sf, 3)} × ${b} × ${r(d, 1)} = ${r(Vc, 2)} kN`,
      `Vs = Av fyt d / s = ${r(Av, 1)} × ${FYT} × ${r(d, 1)} / ${s} = ${r(Vs, 2)} kN (2 legs of ${ds} mm, fyt = ${FYT} MPa)`,
      `φVn = 0.75 × (${r(Vc, 2)} + ${r(Vs, 2)}) = ${r(phiVn, 2)} kN`,
      `Vs required = Vu/φ − Vc = ${r(VsReq, 2)} kN; limit 0.66√f'c bd = ${r(VsMax, 2)} kN`,
      `s,max = ${VsReq > Vlim ? "d/4 ≤ 300" : "d/2 ≤ 600"} = ${r(sMax, 0)} mm (Vs ${VsReq > Vlim ? ">" : "≤"} 0.33√f'c bd = ${r(Vlim, 1)} kN)`,
      `Av,min = max(0.062√f'c, 0.35) b s / fyt = ${r(avMin, 1)} mm² (provided ${r(Av, 1)})`,
    ],
  });

  // 4. Deflection (409.3.1.1 or 424.2)
  const hMin = ((lv.support === "simple" ? L / 16 : L / 8) * (0.4 + FY / 700));
  const Ec = 4700 * sf, nm = ES / Ec, fr = 0.62 * sf, Ig = (b * h ** 3) / 12, Mcr = (fr * Ig) / (h / 2) / 1e6;
  const kd = ((-nm * As + Math.sqrt((nm * As) ** 2 + 2 * b * nm * As * d)) / b);
  const Icr = (b * kd ** 3) / 3 + nm * As * (d - kd) ** 2;
  const Ie = (Ma: number) => (Ma <= Mcr ? Ig : Math.min(Ig, (Mcr / Ma) ** 3 * Ig + (1 - (Mcr / Ma) ** 3) * Icr));
  const MD = effects(lv, wDt, PD, 0).M, MDL = effects(lv, wDt + lv.wL, PD + PL, 0).M;
  const IeD = Ie(MD), IeDL = Ie(MDL);
  const dD = defl(lv, wDt, PD, Ec * IeD), dDL = defl(lv, wDt + lv.wL, PD + PL, Ec * IeDL), dL = Math.max(0, dDL - dD);
  const rhoP = Asp / (b * d), lam = 2.0 / (1 + 50 * rhoP), dLong = lam * dD + dL;
  const lim1 = L / 360, lim2 = L / 240;
  const byDepth = h >= hMin, byCalc = dL <= lim1 && dLong <= lim2;
  checks.push({
    key: "defl", label: "Deflection", clause: "409.3.1.1, 424.2", ok: byDepth || byCalc,
    ratio: byDepth ? h ? hMin / h : 0 : Math.max(dL / lim1, dLong / lim2),
    detail: byDepth ? `h = ${h} ≥ minimum ${r(hMin, 0)} mm: deflection need not be computed` : byCalc ? `computed: ΔL ${r(dL, 1)} ≤ ${r(lim1, 1)} mm, long-term ${r(dLong, 1)} ≤ ${r(lim2, 1)} mm` : `h < ${r(hMin, 0)} mm and computed ΔL ${r(dL, 1)} mm (≤ ${r(lim1, 1)}), long-term ${r(dLong, 1)} mm (≤ ${r(lim2, 1)})`,
    steps: [
      `Minimum h (409.3.1.1) = ${lv.support === "simple" ? "ℓ/16" : "ℓ/8"} × (0.4 + fy/700) = ${r(hMin, 0)} mm → ${byDepth ? "satisfied, no calculation needed" : "not satisfied, so compute"}`,
      `Ec = 4700√f'c = ${r(Ec, 0)} MPa; n = ${r(nm, 2)}; fr = 0.62√f'c = ${r(fr, 2)} MPa`,
      `Ig = b h³/12 = ${r(Ig / 1e6, 1)} ×10⁶ mm⁴; Mcr = fr Ig/(h/2) = ${r(Mcr, 2)} kN·m`,
      `Cracked: kd = ${r(kd, 1)} mm, Icr = b(kd)³/3 + n As (d − kd)² = ${r(Icr / 1e6, 1)} ×10⁶ mm⁴`,
      `Service D: Ma = ${r(MD, 2)} kN·m → Ie = ${r(IeD / 1e6, 1)} ×10⁶ mm⁴ → ΔD = ${r(dD, 2)} mm`,
      `Service D + L: Ma = ${r(MDL, 2)} kN·m → Ie = ${r(IeDL / 1e6, 1)} ×10⁶ mm⁴ → ΔD+L = ${r(dDL, 2)} mm; ΔL = ${r(dL, 2)} mm ≤ ℓ/360 = ${r(lim1, 1)} mm?`,
      `Long-term: λΔ = 2.0/(1 + 50ρ') = ${r(lam, 3)} (ρ' = ${r(rhoP, 5)} from 2 × ${HANGER} mm); λΔ·ΔD + ΔL = ${r(dLong, 2)} mm ≤ ℓ/240 = ${r(lim2, 1)} mm?`,
    ],
  });

  const maxRatio = Math.max(...checks.map((k) => k.ratio));
  return { pass: checks.every((k) => k.ok), checks, cost: costOf(lv, x), maxRatio, d, Mu, Vu, wu: g.w, Pu: g.P, combo: g.name };
}

export const hOptions = (lv: BeamLevel) => OPTIONS.h.filter((h) => !lv.hMax || h <= lv.hMax);

/** Exhaustive search of every option (offline: scripts/beam-optimum.ts). */
export function optimum(lv: BeamLevel) {
  let best: { cost: number; design: Design } | null = null, combos = 0, passing = 0;
  for (const b of OPTIONS.b) for (const h of hOptions(lv)) for (const n of OPTIONS.n) for (const db of OPTIONS.db) for (const ds of OPTIONS.ds) for (const s of OPTIONS.s) {
    combos++;
    const x = { b, h, n, db, ds, s };
    const c = costOf(lv, x).total;
    if (best && c >= best.cost) continue; // cost does not depend on the checks: skip the analysis
    if (!evaluate(lv, x).pass) continue;
    passing++;
    best = { cost: c, design: x };
  }
  return { best, combos, passing };
}

/** Stars: pass = 1, within the budget (10% over the optimum) = 2, within 2% of the optimum = 3. */
export const budgetOf = (lv: BeamLevel) => (lv.best ? Math.ceil((lv.best.cost * 1.1) / 100) * 100 : Infinity);
export const starsOf = (lv: BeamLevel, res: Result) => (!res.pass ? 0 : lv.best && res.cost.total <= lv.best.cost * 1.02 ? 3 : res.cost.total <= budgetOf(lv) ? 2 : 1);

export * from "./levels";
