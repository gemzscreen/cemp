// Critical Path Rush engine (v2.4.0): activity-on-node CPM with finish-to-start links, zero lag.
// Forward pass ES = max EF of predecessors, EF = ES + d; backward pass LF = min LS of successors, LS = LF − d;
// total float TF = LS − ES; free float FF = min ES(successors) − EF (project end for the last activities).
// Crashing: each activity may be shortened to `min` days at `cost` ₱ per day. Objective = crash cost
// + site overhead × duration + liquidated damages × days late. The optimum is found by enumerating every
// crash combination (levels are small), done offline by scripts/cpm-optimum.ts and stored in the level.
export * from "./levels";

export type Act = { id: string; name: string; d: number; pred: string[]; min?: number; cost?: number };
export type Row = { id: string; d: number; es: number; ef: number; ls: number; lf: number; tf: number; ff: number; critical: boolean };
export type Cpm = { rows: Row[]; byId: Record<string, Row>; T: number; order: string[]; critical: string[] };

/** Topological order (Kahn). Throws on a loop or an unknown predecessor. */
export function topo(acts: Act[]): string[] {
  const ids = new Set(acts.map((a) => a.id)), indeg = new Map(acts.map((a) => [a.id, 0])), succ = new Map(acts.map((a) => [a.id, [] as string[]]));
  for (const a of acts) for (const p of a.pred) {
    if (!ids.has(p)) throw new Error(`Unknown predecessor ${p} of ${a.id}`);
    indeg.set(a.id, indeg.get(a.id)! + 1); succ.get(p)!.push(a.id);
  }
  const q = acts.filter((a) => indeg.get(a.id) === 0).map((a) => a.id), out: string[] = [];
  while (q.length) { const x = q.shift()!; out.push(x); for (const s of succ.get(x)!) { indeg.set(s, indeg.get(s)! - 1); if (indeg.get(s) === 0) q.push(s); } }
  if (out.length !== acts.length) throw new Error("The network has a loop");
  return out;
}

/** Forward + backward pass. `dur` overrides durations (crashed plan). */
export function cpm(acts: Act[], dur: Record<string, number> = {}): Cpm {
  const order = topo(acts), A = new Map(acts.map((a) => [a.id, a]));
  const succ = new Map(acts.map((a) => [a.id, [] as string[]]));
  for (const a of acts) for (const p of a.pred) succ.get(p)!.push(a.id);
  const d = (id: string) => dur[id] ?? A.get(id)!.d;
  const es: Record<string, number> = {}, ef: Record<string, number> = {}, ls: Record<string, number> = {}, lf: Record<string, number> = {};
  for (const id of order) { es[id] = Math.max(0, ...A.get(id)!.pred.map((p) => ef[p])); ef[id] = es[id] + d(id); }
  const T = Math.max(0, ...order.map((id) => ef[id]));
  for (const id of [...order].reverse()) { lf[id] = Math.min(T, ...succ.get(id)!.map((s) => ls[s])); ls[id] = lf[id] - d(id); }
  const rows = order.map((id) => {
    const ss = succ.get(id)!, ff = (ss.length ? Math.min(...ss.map((s) => es[s])) : T) - ef[id], tf = ls[id] - es[id];
    return { id, d: d(id), es: es[id], ef: ef[id], ls: ls[id], lf: lf[id], tf, ff, critical: tf === 0 };
  });
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  return { rows, byId, T, order, critical: rows.filter((r) => r.critical).map((r) => r.id) };
}

export type CrashTerms = { deadline: number; overhead: number; ld: number | null }; // ld null = hard deadline (must be met)
export type PlanCost = { T: number; crashCost: number; overheadCost: number; ldCost: number; total: number; meets: boolean };
/** Cost of a crash plan: crash[id] = days removed from the normal duration. */
export function planCost(acts: Act[], crash: Record<string, number>, terms: CrashTerms): PlanCost {
  const dur: Record<string, number> = {};
  let crashCost = 0;
  for (const a of acts) { const c = Math.max(0, Math.min(crash[a.id] ?? 0, a.d - (a.min ?? a.d))); dur[a.id] = a.d - c; crashCost += c * (a.cost ?? 0); }
  const T = cpm(acts, dur).T, late = Math.max(0, T - terms.deadline);
  const overheadCost = terms.overhead * T, ldCost = terms.ld == null ? 0 : terms.ld * late;
  return { T, crashCost, overheadCost, ldCost, total: crashCost + overheadCost + ldCost, meets: T <= terms.deadline };
}

/** Exhaustive optimum over every crash combination (offline / tests only: product of (d − min + 1) can be large). */
export function optimum(acts: Act[], terms: CrashTerms) {
  const vars = acts.filter((a) => a.min != null && a.min < a.d);
  let best: { cost: PlanCost; crash: Record<string, number> } | null = null, combos = 0;
  const crash: Record<string, number> = {};
  const rec = (k: number) => {
    if (k === vars.length) {
      combos++;
      const c = planCost(acts, crash, terms);
      if (terms.ld == null && !c.meets) return;
      if (!best || c.total < best.cost.total - 1e-9 || (Math.abs(c.total - best.cost.total) < 1e-9 && c.T < best.cost.T)) best = { cost: c, crash: { ...crash } };
      return;
    }
    const a = vars[k];
    for (let x = 0; x <= a.d - a.min!; x++) { crash[a.id] = x; rec(k + 1); }
    delete crash[a.id];
  };
  rec(0);
  return { best: best as { cost: PlanCost; crash: Record<string, number> } | null, combos };
}

/** Worked forward / backward pass lines for the reveal. */
export function passSteps(acts: Act[], r: Cpm): { forward: string[]; backward: string[] } {
  const A = new Map(acts.map((a) => [a.id, a])), succ = new Map(acts.map((a) => [a.id, [] as string[]]));
  for (const a of acts) for (const p of a.pred) succ.get(p)!.push(a.id);
  const forward = r.order.map((id) => {
    const a = A.get(id)!, row = r.byId[id];
    const from = a.pred.length ? `max EF of ${a.pred.join(", ")} = max(${a.pred.map((p) => r.byId[p].ef).join(", ")}) = ${row.es}` : "start = 0";
    return `${id}: ES = ${from}; EF = ${row.es} + ${row.d} = ${row.ef}`;
  });
  const backward = [...r.order].reverse().map((id) => {
    const ss = succ.get(id)!, row = r.byId[id];
    const from = ss.length ? `min LS of ${ss.join(", ")} = min(${ss.map((s) => r.byId[s].ls).join(", ")}) = ${row.lf}` : `project end = ${r.T}`;
    return `${id}: LF = ${from}; LS = ${row.lf} − ${row.d} = ${row.ls}; TF = ${row.ls} − ${row.es} = ${row.tf}${row.tf === 0 ? " → critical" : ""}`;
  });
  return { forward, backward };
}
