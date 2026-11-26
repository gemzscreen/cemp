// Truss Builder engine: design → loads → analysis → member checks (AISC 360-10 / NSCP 2015, or BS 5950-1:2000) → score.
// v2.3.0: deck types and code are Settings; live load is a crowd that can cover any run of panels from either end
// (patch loading), so diagonals are checked for their worst partial loading, not just the full-span case.
import { solveTruss, E_STEEL, type Support } from "./solver";
import { sectionByKey, type Section } from "./sections";
import { JOINT_COST, CODES, DECKS, dlOf, defaultSettings, type Level, type Settings } from "./levels";

export * from "./sections"; export * from "./levels";

export type DNode = { id: string; x: number; y: number; kind?: "support" | "deck" }; // m
export type DMember = { id: string; a: string; b: string; sec: string };
export type Design = { nodes: DNode[]; members: DMember[] };

export type MemberResult = {
  id: string; sec: Section; L: number; Pu: number; ratio: number; mode: "tension" | "compression" | "zero";
  phiPn: number; slender: number; slenderLimit: number; slenderOk: boolean; steps: string[]; combo: string;
  NtMax: number; NcMax: number; // kN, envelope over all load cases (+ tension, − compression)
};
export type Result =
  | { ok: false; reason: string }
  | { ok: true; passed: boolean; members: MemberResult[]; maxRatio: number; defl: number; deflLimit: number; deflOk: boolean;
      weight: number; steelCost: number; jointCost: number; cost: number; stars: number; issues: string[]; notes: string[]; disp: Record<string, [number, number]>; loads: string[];
      settings: Settings; budget: number };

const r = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

/** v2.1.1: live cost of a design, the same figure the load test scores (both trusses).
 *  Steel = Σ kg/m × L × ₱/kg; joints = every joint on the canvas × ₱JOINT_COST (a loose joint is still paid for:
 *  delete it if it carries nothing). Deck joints and supports are always counted because every bridge needs them. */
export type CostLine = { key: string; name: string; count: number; len: number; kg: number; cost: number };
export type Cost = { weight: number; steelCost: number; jointCost: number; cost: number; joints: number; loose: number; members: number; bySection: CostLine[] };
export function memberCost(sec: Section, Lm: number) { return { kg: sec.kgm * Lm * 2, cost: sec.kgm * Lm * sec.pricekg * 2 }; }
export function costOf(d: Design): Cost {
  const at = new Map(d.nodes.map((n) => [n.id, n]));
  const mem = d.members.filter((m) => at.has(m.a) && at.has(m.b) && m.a !== m.b);
  const lines = new Map<string, CostLine>();
  let weight = 0, steelCost = 0;
  for (const m of mem) {
    const a = at.get(m.a)!, b = at.get(m.b)!, L = Math.hypot(b.x - a.x, b.y - a.y), sec = sectionByKey(m.sec), c = memberCost(sec, L);
    weight += c.kg; steelCost += c.cost;
    const ln = lines.get(sec.key) ?? { key: sec.key, name: sec.name, count: 0, len: 0, kg: 0, cost: 0 };
    ln.count++; ln.len += L; ln.kg += c.kg; ln.cost += c.cost; lines.set(sec.key, ln);
  }
  const connected = new Set(mem.flatMap((m) => [m.a, m.b]));
  const jointCost = d.nodes.length * 2 * JOINT_COST;
  return { weight, steelCost, jointCost, cost: steelCost + jointCost, joints: d.nodes.length, loose: d.nodes.filter((n) => !connected.has(n.id)).length,
    members: mem.length, bySection: [...lines.values()].sort((x, y) => y.cost - x.cost) };
}

/** Deck nodes (panel points) and supports a level always starts with. */
export function baseNodes(lv: Level): DNode[] {
  const p = lv.span / lv.panels;
  return Array.from({ length: lv.panels + 1 }, (_, i) => ({ id: `d${i}`, x: r(i * p, 3), y: 0, kind: i === 0 || i === lv.panels ? "support" : "deck" }));
}

export type Check = { phiPn: number; ratio: number; mode: "tension" | "compression" | "zero"; slender: number; slenderLimit: number; slenderOk: boolean; steps: string[] };

/** Axial member check for the chosen code. Pu in kN (+ tension). */
export function checkMember(sec: Section, Lm: number, Pu: number, code: Settings["code"] = "aisc"): Check {
  return code === "bs" ? checkBS5950(sec, Lm, Pu) : checkAISC(sec, Lm, Pu);
}

export const E_BS = 205000; // MPa, BS 5950
const ROBERTSON = { a: 2.0, b: 3.5, c: 5.5, d: 8.0 } as const;
/** BS 5950-1:2000 Annex C (Perry–Robertson) compressive strength pc, N/mm². */
export function pcBS(py: number, lambda: number, curve: keyof typeof ROBERTSON = "c") {
  const pE = (Math.PI ** 2 * E_BS) / lambda ** 2, l0 = 0.2 * Math.sqrt((Math.PI ** 2 * E_BS) / py);
  const eta = Math.max(0, (ROBERTSON[curve] * (lambda - l0)) / 1000), phi = (py + (eta + 1) * pE) / 2;
  return { pc: (pE * py) / (phi + Math.sqrt(phi * phi - pE * py)), pE, l0, eta, phi };
}

/** BS 5950-1:2000 axial check. Game assumptions (VERIFY): py = Fy of the stocked grade, LE = 1.0 L for every member,
 *  strut curve c (angles; cold-formed hollow sections), net area an = 0.85 Ag, Ae = Ke·an ≤ Ag (Ke 1.2 for Fy ≤ 275, else 1.1),
 *  angles connected through one leg (4.6.3): single Pt = py(Ae − 0.5 a2), back-to-back pair Pt = py(Ae − 0.25 a2), with a1 = an/2. */
export function checkBS5950(sec: Section, Lm: number, F: number): Check {
  const Lmm = Lm * 1000, lam = Lmm / sec.rmin, py = sec.fy, steps: string[] = [];
  steps.push(`${sec.name} (${sec.grade}): Ag = ${r(sec.A, 0)} mm², r min = ${r(sec.rmin, 1)} mm, py = ${py} N/mm² (taken = Fy)`);
  steps.push(`LE = 1.0 L = ${r(Lmm, 0)} mm → λ = LE/r = ${r(lam, 1)}`);
  if (F >= 0) {
    const an = 0.85 * sec.A, Ke = py <= 275 ? 1.2 : 1.1, Ae = Math.min(Ke * an, sec.A);
    let Pt = (py * Ae) / 1000;
    steps.push(`Net area an = 0.85 Ag = ${r(an, 0)} mm² (assumed, connection not designed); Ae = Ke·an ≤ Ag = min(${Ke} × ${r(an, 0)}, ${r(sec.A, 0)}) = ${r(Ae, 0)} mm²`);
    if (sec.family === "L" || sec.family === "2L") {
      const a1 = an / 2, a2 = Ae - a1, k = sec.family === "L" ? 0.5 : 0.25;
      Pt = (py * (Ae - k * a2)) / 1000;
      steps.push(`Angle${sec.family === "2L" ? "s back to back" : ""} connected through one leg (4.6.3): a2 = Ae − a1 = ${r(Ae, 0)} − ${r(a1, 0)} = ${r(a2, 0)} mm² → Pt = py(Ae − ${k} a2) = ${r(Pt)} kN`);
    } else steps.push(`Pt = py·Ae = ${py} × ${r(Ae, 0)} = ${r(Pt)} kN`);
    const ok = lam <= 300;
    steps.push(`Slenderness λ = ${r(lam, 1)} ${ok ? "≤" : ">"} 300 (game rule for ties; BS sets no tie limit)`);
    steps.push(`Ft = ${r(F)} kN tension → ratio = ${r(F)} / ${r(Pt)} = ${r(F / Pt, 3)}`);
    return { phiPn: Pt, ratio: F / Pt, mode: F < 0.01 ? "zero" : "tension", slender: lam, slenderLimit: 300, slenderOk: ok, steps };
  }
  const { pc, pE, l0, eta } = pcBS(py, lam, "c"), Pc = (sec.A * pc) / 1000, P = -F;
  steps.push(`Strut curve c (Table 23: angles, cold-formed hollow sections), Robertson a = 5.5`);
  steps.push(`pE = π²E/λ² = ${r(pE, 1)} N/mm², λ0 = 0.2√(π²E/py) = ${r(l0, 1)}, η = 0.0055(λ − λ0) = ${r(eta, 3)}`);
  steps.push(`pc = pE·py / (φ + √(φ² − pE·py)) = ${r(pc, 1)} N/mm² → Pc = Ag·pc = ${r(Pc)} kN`);
  const ok = lam <= 180;
  steps.push(`Slenderness λ = ${r(lam, 1)} ${ok ? "≤" : ">"} 180 (game rule: the 1990 edition limit; BS 5950-1:2000 removed the fixed limits, see SCI AD 270)`);
  steps.push(`Fc = ${r(P)} kN compression → ratio = ${r(P)} / ${r(Pc)} = ${r(P / Pc, 3)}`);
  return { phiPn: Pc, ratio: P / Pc, mode: "compression", slender: lam, slenderLimit: 180, slenderOk: ok, steps };
}

/** AISC 360-10 (= NSCP 2015 Ch. 5) axial member check. Pu in kN (+ tension). */
export function checkAISC(sec: Section, Lm: number, Pu: number): Check {
  const Lmm = Lm * 1000, KLr = Lmm / sec.rmin, steps: string[] = [];
  steps.push(`${sec.name} (${sec.grade}): Ag = ${r(sec.A, 0)} mm², r min = ${r(sec.rmin, 1)} mm, Fy = ${sec.fy} MPa, Fu = ${sec.fu} MPa`);
  steps.push(`L = ${r(Lm, 3)} m, K = 1.0 (pinned joints) → KL/r = ${r(Lmm, 0)} / ${r(sec.rmin, 1)} = ${r(KLr, 1)}`);
  if (Pu >= 0) {
    const ty = 0.9 * sec.fy * sec.A / 1000, Ae = 0.85 * sec.A, tr = 0.75 * sec.fu * Ae / 1000, phiPn = Math.min(ty, tr);
    steps.push(`Tension yielding: φPn = 0.90 × ${sec.fy} × ${r(sec.A, 0)} = ${r(ty)} kN`);
    steps.push(`Tension rupture: Ae assumed 0.85 Ag = ${r(Ae, 0)} mm² (connection not designed) → φPn = 0.75 × ${sec.fu} × ${r(Ae, 0)} = ${r(tr)} kN`);
    const ok = KLr <= 300;
    steps.push(`Slenderness L/r = ${r(KLr, 1)} ${ok ? "≤" : ">"} 300 (recommended limit for tension members, used as a game rule)`);
    steps.push(`Pu = ${r(Pu)} kN tension → ratio = ${r(Pu)} / ${r(phiPn)} = ${r(Pu / phiPn, 3)}`);
    return { phiPn, ratio: Pu / phiPn, mode: Pu < 0.01 ? "zero" as const : "tension" as const, slender: KLr, slenderLimit: 300, slenderOk: ok, steps };
  }
  const Fe = (Math.PI ** 2 * E_STEEL) / KLr ** 2, lim = 4.71 * Math.sqrt(E_STEEL / sec.fy);
  const Fcr = KLr <= lim ? 0.658 ** (sec.fy / Fe) * sec.fy : 0.877 * Fe, phiPn = 0.9 * Fcr * sec.A / 1000, P = -Pu;
  steps.push(`Fe = π²E/(KL/r)² = π² × 200000 / ${r(KLr, 1)}² = ${r(Fe, 1)} MPa`);
  steps.push(KLr <= lim ? `KL/r ≤ 4.71√(E/Fy) = ${r(lim, 1)} → Fcr = 0.658^(Fy/Fe) × Fy = ${r(Fcr, 1)} MPa` : `KL/r > 4.71√(E/Fy) = ${r(lim, 1)} → Fcr = 0.877 Fe = ${r(Fcr, 1)} MPa`);
  steps.push(`φPn = 0.90 × ${r(Fcr, 1)} × ${r(sec.A, 0)} = ${r(phiPn)} kN`);
  const ok = KLr <= 200;
  steps.push(`Slenderness KL/r = ${r(KLr, 1)} ${ok ? "≤" : ">"} 200 (recommended limit for compression members)`);
  steps.push(`Pu = ${r(P)} kN compression → ratio = ${r(P)} / ${r(phiPn)} = ${r(P / phiPn, 3)}`);
  return { phiPn, ratio: P / phiPn, mode: "compression" as const, slender: KLr, slenderLimit: 200, slenderOk: ok, steps };
}

/** Crowd positions: empty, every run of panels from the left end (1…n panels, n = full span) and from the right end. */
export type Pattern = { from: number; to: number; label: string }; // panels from..to-1 carry the crowd
export function patterns(n: number): Pattern[] {
  const out: Pattern[] = [{ from: 0, to: 0, label: "no crowd" }];
  for (let k = 1; k <= n; k++) out.push({ from: 0, to: k, label: k === n ? "crowd on the full span" : `crowd on panels 1–${k}` });
  for (let k = 1; k < n; k++) out.push({ from: k, to: n, label: `crowd on panels ${k + 1}–${n}` });
  return out;
}

type Analysis = {
  nodes: DNode[]; ix: Map<string, number>; mem: DMember[]; secs: Section[]; len: number[];
  ND: number[]; uD: number[];             // dead load (deck + self-weight), N and mm
  NP: number[][]; uP: number[][];          // crowd on panel j alone (live load), N and mm
  selfW: number; dl: number;
};

/** Build the model and solve dead load + one solve per panel of crowd (superposed later: the truss is linear). */
function analyse(lv: Level, d: Design, s: Settings): { ok: false; reason: string } | ({ ok: true } & Analysis) {
  const idx = new Map(d.nodes.map((n, i) => [n.id, i]));
  const mem = d.members.filter((m) => idx.has(m.a) && idx.has(m.b) && m.a !== m.b);
  if (mem.length < 3) return { ok: false, reason: "Add members first: connect the deck joints and build triangles." };
  const connected = new Set(mem.flatMap((m) => [m.a, m.b]));
  if (d.nodes.some((n) => n.kind && !connected.has(n.id))) return { ok: false, reason: "Every deck joint and both supports must be connected to the truss." };
  const nodes = d.nodes.filter((n) => connected.has(n.id));
  const ix = new Map(nodes.map((n, i) => [n.id, i]));
  const tn = nodes.map((n) => ({ x: n.x * 1000, y: n.y * 1000 }));
  const secs = mem.map((m) => sectionByKey(m.sec));
  const tm = mem.map((m, i) => ({ a: ix.get(m.a)!, b: ix.get(m.b)!, A: secs[i].A }));
  const len = tm.map((m) => Math.hypot(tn[m.b].x - tn[m.a].x, tn[m.b].y - tn[m.a].y) / 1000);
  const supports: Support[] = [{ node: ix.get("d0")!, ux: true, uy: true }, { node: ix.get(`d${lv.panels}`)!, ux: false, uy: true }];
  const p = lv.span / lv.panels, half = lv.width / 2, dl = dlOf(lv, s.deck), nd = 2 * nodes.length;
  const D = new Array(nd).fill(0);
  for (let i = 0; i <= lv.panels; i++) D[2 * ix.get(`d${i}`)! + 1] -= dl * (i === 0 || i === lv.panels ? p / 2 : p) * half * 1000;
  let selfW = 0;
  tm.forEach((m, i) => { const w = secs[i].kgm * len[i] * 9.81; selfW += w; D[2 * m.a + 1] -= w / 2; D[2 * m.b + 1] -= w / 2; });
  const dead = solveTruss(tn, tm, supports, D);
  if (!dead.ok) return dead;
  const NP: number[][] = [], uP: number[][] = [];
  for (let j = 0; j < lv.panels; j++) {
    const F = new Array(nd).fill(0), w = (lv.ll * p * half * 1000) / 2;
    F[2 * ix.get(`d${j}`)! + 1] -= w; F[2 * ix.get(`d${j + 1}`)! + 1] -= w;
    const o = solveTruss(tn, tm, supports, F);
    if (!o.ok) return o;
    NP.push(o.N); uP.push(o.u);
  }
  return { ok: true, nodes, ix, mem, secs, len, ND: dead.N, uD: dead.u, NP, uP, selfW, dl };
}

const sumP = (rows: number[][], pt: Pattern, k: number) => { let t = 0; for (let j = pt.from; j < pt.to; j++) t += rows[j][k]; return t; };

/** Factored combos for a code: [label, dead factor, live factor]. BS 5950 Table 2: dead 1.0 where it counteracts the crowd. */
function combos(code: Settings["code"]): [string, number, number][] {
  return code === "bs" ? [["1.4D + 1.6L", 1.4, 1.6], ["1.0D + 1.6L", 1.0, 1.6]] : [["1.4D", 1.4, 0], ["1.2D + 1.6L", 1.2, 1.6]];
}

export function evaluate(lv: Level, d: Design, s: Settings = defaultSettings(lv), budget = lv.budget, opts: { fullSpanOnly?: boolean } = {}): Result {
  const an = analyse(lv, d, s);
  if (!an.ok) return an;
  const { nodes, ix, mem, secs, len, ND, NP, uP, selfW, dl } = an;
  const all = patterns(lv.panels), pats = opts.fullSpanOnly ? [all[0], all[lv.panels]] : all, cmb = combos(s.code); // fullSpanOnly = pre-v2.3 rule, calibration only
  const p = lv.span / lv.panels, half = lv.width / 2;
  const loads = [
    `Deck: ${DECKS[s.deck].name} ${DECKS[s.deck].dl} kPa${lv.extra ? ` + other dead load ${lv.extra} kPa` : ""} = ${dl} kPa × ${half} m (half of ${lv.width} m) = ${r(dl * half, 2)} kN/m per truss, at panel points every ${r(p, 2)} m`,
    `Crowd (live load) ${lv.ll} kPa × ${half} m = ${r(lv.ll * half, 2)} kN/m per truss, placed on any run of panels from either end (${pats.length - 1} positions) to find each member's worst case`,
    `Truss self-weight = ${r(selfW / 1000, 2)} kN (half to each end joint of every member)`,
    `${CODES[s.code].name}: ${cmb.map((c) => c[0]).join(" and ")}. Deflection: crowd only, limit L/360 = ${r((lv.span * 1000) / 360, 1)} mm`,
  ];
  const members: MemberResult[] = mem.map((m, i) => {
    let best: MemberResult | null = null, NtMax = 0, NcMax = 0;
    for (const [cl, fd, fl] of cmb) for (const pt of fl ? pats : [pats[0]]) {
      const N = (fd * ND[i] + fl * sumP(NP, pt, i)) / 1000;
      NtMax = Math.max(NtMax, N); NcMax = Math.min(NcMax, N);
      const c = checkMember(secs[i], len[i], N, s.code);
      if (!best || c.ratio > best.ratio || (!c.slenderOk && best.slenderOk)) {
        const combo = fl ? `${cl}, ${pt.label}` : cl;
        best = { id: m.id, sec: secs[i], L: len[i], Pu: N, ratio: c.ratio, mode: c.mode, phiPn: c.phiPn, slender: c.slender, slenderLimit: c.slenderLimit, slenderOk: c.slenderOk, steps: [`Governing case: ${combo}`, ...c.steps], combo, NtMax: 0, NcMax: 0 };
      }
    }
    // a member can be in tension for one crowd position and compression for another: check both ends of the envelope
    if (NtMax > 0.01 && NcMax < -0.01) {
      const other = best!.Pu >= 0 ? NcMax : NtMax, c = checkMember(secs[i], len[i], other, s.code);
      if (!c.slenderOk && best!.slenderOk) best = { ...best!, slenderOk: false, slenderLimit: c.slenderLimit, steps: [...best!.steps, `Force reverses (${r(NcMax)} to ${r(NtMax)} kN): compression slenderness λ = ${r(c.slender, 1)} > ${c.slenderLimit}`] };
    }
    return { ...best!, NtMax, NcMax };
  });
  // deflection: worst crowd position, deck joints
  let defl = 0;
  for (const pt of pats) for (let i = 0; i <= lv.panels; i++) defl = Math.max(defl, Math.abs(sumP(uP, pt, 2 * ix.get(`d${i}`)! + 1)));
  const deflLimit = (lv.span * 1000) / 360;
  const { weight, steelCost, jointCost, cost, loose: looseN } = costOf(d); // same figure as the live cost meter
  const maxRatio = Math.max(...members.map((m) => m.ratio));
  const issues: string[] = [];
  const over = members.filter((m) => m.ratio > 1).length, slim = members.filter((m) => !m.slenderOk).length;
  if (over) issues.push(`${over} member(s) over capacity (ratio > 1.00)`);
  if (slim) issues.push(`${slim} member(s) too slender`);
  const deflOk = defl <= deflLimit;
  if (!deflOk) issues.push(`Deflection ${r(defl)} mm > L/360 = ${r(deflLimit)} mm: make the truss deeper or the chords bigger`);
  const passed = !issues.length;
  const notes = looseN ? [`${looseN} loose joint(s) connected to nothing still cost ₱${(looseN * 2 * JOINT_COST).toLocaleString("en-PH")}: delete them to save money`] : [];
  const stars = !passed ? 0 : cost <= 0.9 * budget ? 3 : cost <= budget ? 2 : 1;
  const full = all[lv.panels], disp: Record<string, [number, number]> = {};
  nodes.forEach((n, i) => (disp[n.id] = [sumP(uP, full, 2 * i) / 1000, sumP(uP, full, 2 * i + 1) / 1000]));
  return { ok: true, passed, members, maxRatio, defl, deflLimit, deflOk, weight, steelCost, jointCost, cost, stars, issues, notes, disp, loads, settings: s, budget };
}

/** Frames for the crowd-crossing animation: the crowd walks on from the left, fills the span, then walks off to the right.
 *  Each frame: member utilisation for that crowd position (worst code combo) and deck/joint displacement (dead + crowd, service, m). */
export type Frame = { pattern: Pattern; ratio: Record<string, number>; disp: Record<string, [number, number]> };
export function crossing(lv: Level, d: Design, s: Settings = defaultSettings(lv)): { ok: false; reason: string } | { ok: true; frames: Frame[] } {
  const an = analyse(lv, d, s);
  if (!an.ok) return an;
  const { nodes, mem, secs, len, ND, NP, uD, uP } = an, n = lv.panels, cmb = combos(s.code).filter((c) => c[2] > 0);
  const seq: Pattern[] = [{ from: 0, to: 0, label: "no crowd" }];
  for (let k = 1; k <= n; k++) seq.push({ from: 0, to: k, label: k === n ? "crowd on the full span" : `crowd on panels 1–${k}` });
  for (let k = 1; k <= n; k++) seq.push({ from: k, to: n, label: k === n ? "crowd has crossed" : `crowd on panels ${k + 1}–${n}` });
  const frames = seq.map((pt) => {
    const ratio: Record<string, number> = {}, disp: Record<string, [number, number]> = {};
    mem.forEach((m, i) => {
      let worst = 0;
      for (const [, fd, fl] of cmb) worst = Math.max(worst, checkMember(secs[i], len[i], (fd * ND[i] + fl * sumP(NP, pt, i)) / 1000, s.code).ratio);
      ratio[m.id] = worst;
    });
    nodes.forEach((nd, i) => (disp[nd.id] = [(uD[2 * i] + sumP(uP, pt, 2 * i)) / 1000, (uD[2 * i + 1] + sumP(uP, pt, 2 * i + 1)) / 1000]));
    return { pattern: pt, ratio, disp };
  });
  return { ok: true, frames };
}

/** Starter templates (through truss above the deck). */
export function template(lv: Level, kind: "warren" | "pratt" | "howe", sec = "L75x6"): Design {
  const base = baseNodes(lv), p = lv.span / lv.panels, h = lv.height, n = lv.panels;
  const nodes: DNode[] = [...base], members: DMember[] = [];
  let k = 0;
  const add = (a: string, b: string) => members.push({ id: `m${k++}`, a, b, sec });
  for (let i = 0; i < n; i++) add(`d${i}`, `d${i + 1}`); // bottom chord (deck)
  if (kind === "warren") {
    for (let i = 0; i < n; i++) nodes.push({ id: `t${i}`, x: r((i + 0.5) * p, 3), y: h });
    for (let i = 0; i < n; i++) { add(`d${i}`, `t${i}`); add(`t${i}`, `d${i + 1}`); if (i < n - 1) add(`t${i}`, `t${i + 1}`); }
  } else {
    for (let i = 1; i < n; i++) nodes.push({ id: `t${i}`, x: r(i * p, 3), y: h });
    add("d0", "t1"); add(`t${n - 1}`, `d${n}`);
    for (let i = 1; i < n - 1; i++) add(`t${i}`, `t${i + 1}`);
    for (let i = 1; i < n; i++) add(`d${i}`, `t${i}`);
    const mid = n / 2;
    for (let i = 1; i < n - 1; i++) {
      // Pratt: diagonals slope down toward midspan (tension); Howe: up toward midspan (compression)
      const towardMid = i < mid ? [`t${i}`, `d${i + 1}`] : [`d${i}`, `t${i + 1}`];
      const away = i < mid ? [`d${i}`, `t${i + 1}`] : [`t${i}`, `d${i + 1}`];
      const [a, b] = kind === "pratt" ? towardMid : away;
      add(a, b);
    }
  }
  return { nodes, members };
}
