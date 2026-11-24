// Truss Builder engine: design → loads → analysis (1.4D, 1.2D+1.6L, L service) → AISC 360-10 / NSCP 2015 member checks → score.
import { solveTruss, E_STEEL, type Support } from "./solver";
import { sectionByKey, type Section } from "./sections";
import { JOINT_COST, type Level } from "./levels";

export * from "./sections"; export * from "./levels";

export type DNode = { id: string; x: number; y: number; kind?: "support" | "deck" }; // m
export type DMember = { id: string; a: string; b: string; sec: string };
export type Design = { nodes: DNode[]; members: DMember[] };

export type MemberResult = {
  id: string; sec: Section; L: number; Pu: number; ratio: number; mode: "tension" | "compression" | "zero";
  phiPn: number; slender: number; slenderLimit: number; slenderOk: boolean; steps: string[]; combo: string;
};
export type Result =
  | { ok: false; reason: string }
  | { ok: true; passed: boolean; members: MemberResult[]; maxRatio: number; defl: number; deflLimit: number; deflOk: boolean;
      weight: number; steelCost: number; jointCost: number; cost: number; stars: number; issues: string[]; disp: Record<string, [number, number]>; loads: string[] };

const r = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

/** Deck nodes (panel points) and supports a level always starts with. */
export function baseNodes(lv: Level): DNode[] {
  const p = lv.span / lv.panels;
  return Array.from({ length: lv.panels + 1 }, (_, i) => ({ id: `d${i}`, x: r(i * p, 3), y: 0, kind: i === 0 || i === lv.panels ? "support" : "deck" }));
}

/** AISC 360-10 (= NSCP 2015 Ch. 5) axial member check. Pu in kN (+ tension). */
export function checkMember(sec: Section, Lm: number, Pu: number) {
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

export function evaluate(lv: Level, d: Design): Result {
  const idx = new Map(d.nodes.map((n, i) => [n.id, i]));
  const mem = d.members.filter((m) => idx.has(m.a) && idx.has(m.b) && m.a !== m.b);
  if (mem.length < 3) return { ok: false, reason: "Add members first: connect the deck joints and build triangles." };
  const connected = new Set(mem.flatMap((m) => [m.a, m.b]));
  const loose = d.nodes.filter((n) => !connected.has(n.id));
  if (loose.some((n) => n.kind)) return { ok: false, reason: "Every deck joint and both supports must be connected to the truss." };
  const nodes = d.nodes.filter((n) => connected.has(n.id));
  const ix = new Map(nodes.map((n, i) => [n.id, i]));
  const tn = nodes.map((n) => ({ x: n.x * 1000, y: n.y * 1000 }));
  const secs = mem.map((m) => sectionByKey(m.sec));
  const tm = mem.map((m, i) => ({ a: ix.get(m.a)!, b: ix.get(m.b)!, A: secs[i].A }));
  const len = tm.map((m) => Math.hypot(tn[m.b].x - tn[m.a].x, tn[m.b].y - tn[m.a].y) / 1000);
  const left = ix.get("d0")!, right = ix.get(`d${lv.panels}`)!;
  const supports: Support[] = [{ node: left, ux: true, uy: true }, { node: right, ux: false, uy: true }];

  // loads (N): per truss = half the deck width; panel loads at deck nodes; member self-weight half to each end
  const p = lv.span / lv.panels, half = lv.width / 2;
  const D = new Array(2 * nodes.length).fill(0), Lv = new Array(2 * nodes.length).fill(0);
  for (let i = 0; i <= lv.panels; i++) {
    const trib = (i === 0 || i === lv.panels ? p / 2 : p) * half * 1000; // m² → N per kPa
    const k = ix.get(`d${i}`)!;
    D[2 * k + 1] -= lv.dl * trib; Lv[2 * k + 1] -= lv.ll * trib;
  }
  let selfW = 0;
  tm.forEach((m, i) => { const w = secs[i].kgm * len[i] * 9.81; selfW += w; D[2 * m.a + 1] -= w / 2; D[2 * m.b + 1] -= w / 2; });
  const loads = [
    `Deck dead load ${lv.dl} kPa × ${half} m (half of ${lv.width} m) = ${r(lv.dl * half, 2)} kN/m per truss, applied at panel points every ${r(p, 2)} m`,
    `Live load ${lv.ll} kPa × ${half} m = ${r(lv.ll * half, 2)} kN/m per truss`,
    `Truss self-weight = ${r(selfW / 1000, 2)} kN (half to each end joint of every member)`,
    `Strength combos: 1.4D and 1.2D + 1.6L. Deflection: live load only, limit L/360 = ${r((lv.span * 1000) / 360, 1)} mm`,
  ];
  const combos = { "1.4D": D.map((x) => 1.4 * x), "1.2D + 1.6L": D.map((x, i) => 1.2 * x + 1.6 * Lv[i]) };
  const res: Record<string, ReturnType<typeof solveTruss>> = {};
  for (const [k, F] of Object.entries(combos)) { res[k] = solveTruss(tn, tm, supports, F); if (!res[k].ok) return { ok: false, reason: (res[k] as any).reason }; }
  const svc = solveTruss(tn, tm, supports, Lv);
  if (!svc.ok) return { ok: false, reason: svc.reason };

  const members: MemberResult[] = mem.map((m, i) => {
    let best: MemberResult | null = null;
    for (const [k, out] of Object.entries(res)) {
      const Pu = (out as any).N[i] / 1000, c = checkMember(secs[i], len[i], Pu);
      if (!best || c.ratio > best.ratio || (!c.slenderOk && best.slenderOk))
        best = { id: m.id, sec: secs[i], L: len[i], Pu, ratio: c.ratio, mode: c.mode, phiPn: c.phiPn, slender: c.slender, slenderLimit: c.slenderLimit, slenderOk: c.slenderOk, steps: [`Governing combo: ${k}`, ...c.steps], combo: k };
    }
    return best!;
  });
  // deflection: max vertical live-load displacement of deck joints
  const defl = Math.max(...[...Array(lv.panels + 1).keys()].map((i) => Math.abs(svc.u[2 * ix.get(`d${i}`)! + 1])));
  const deflLimit = (lv.span * 1000) / 360;
  const weight = secs.reduce((s, sc, i) => s + sc.kgm * len[i], 0) * 2; // two trusses
  const steelCost = secs.reduce((s, sc, i) => s + sc.kgm * len[i] * sc.pricekg, 0) * 2;
  const jointCost = nodes.length * 2 * JOINT_COST;
  const cost = steelCost + jointCost;
  const maxRatio = Math.max(...members.map((m) => m.ratio));
  const issues: string[] = [];
  const over = members.filter((m) => m.ratio > 1).length, slim = members.filter((m) => !m.slenderOk).length;
  if (over) issues.push(`${over} member(s) over capacity (ratio > 1.00)`);
  if (slim) issues.push(`${slim} member(s) too slender`);
  const deflOk = defl <= deflLimit;
  if (!deflOk) issues.push(`Deflection ${r(defl)} mm > L/360 = ${r(deflLimit)} mm: make the truss deeper or the chords bigger`);
  const passed = !issues.length;
  const stars = !passed ? 0 : cost <= 0.9 * lv.budget ? 3 : cost <= lv.budget ? 2 : 1;
  const disp: Record<string, [number, number]> = {};
  nodes.forEach((n, i) => (disp[n.id] = [svc.u[2 * i] / 1000, svc.u[2 * i + 1] / 1000]));
  return { ok: true, passed, members, maxRatio, defl, deflLimit, deflOk, weight, steelCost, jointCost, cost, stars, issues, disp, loads };
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
