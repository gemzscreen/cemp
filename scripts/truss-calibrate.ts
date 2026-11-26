// Truss Builder budget calibration (v2.3.0). Run: npx tsx scripts/truss-calibrate.ts
// For each level × deck × code: starter templates (Warren, Pratt, Howe) at every grid depth, each member auto-sized to the
// cheapest passing section, deflection fixed by upsizing the members that contribute most (virtual work), cheapest kept.
// New budget = current default budget × cheapest(setting, v2.3 rules) / cheapest(default deck, AISC, pre-v2.3 full-span rule),
// so the original calibration intent (~1.1 × cheapest) carries over. Prints a BUDGETS table to paste into lib/truss/levels.ts.
import { LEVELS, DECKS, SECTIONS, template, evaluate, costOf, type Design, type Level, type Settings, type DeckKey, type CodeKey } from "../lib/truss";

const BY_COST = [...SECTIONS].sort((a, b) => a.kgm * a.pricekg - b.kgm * b.pricekg);

function autoSize(lv: Level, d0: Design, s: Settings, fullSpanOnly: boolean): number | null {
  const d: Design = { nodes: d0.nodes, members: d0.members.map((m) => ({ ...m, sec: BY_COST[0].key })) };
  const ev = () => evaluate(lv, d, s, lv.budget, { fullSpanOnly });
  for (let it = 0; it < 8; it++) { // strength + slenderness (forces change only through self-weight: statically determinate)
    const r = ev(); if (!r.ok) return null;
    let changed = false;
    r.members.forEach((m, i) => {
      if (m.ratio <= 1 && m.slenderOk) return;
      const start = BY_COST.findIndex((x) => x.key === d.members[i].sec);
      for (let k = start + 1; k < BY_COST.length; k++) {
        const t = { ...d, members: d.members.map((mm, j) => (j === i ? { ...mm, sec: BY_COST[k].key } : mm)) };
        const rr = evaluate(lv, t, s, lv.budget, { fullSpanOnly });
        if (rr.ok && rr.members[i].ratio <= 1 && rr.members[i].slenderOk) { d.members[i].sec = BY_COST[k].key; changed = true; return; }
      }
      d.members[i].sec = BY_COST[BY_COST.length - 1].key; changed = true;
    });
    if (!changed) break;
  }
  for (let it = 0; it < 120; it++) { // deflection: upsize the member whose upgrade cuts deflection most per peso
    const r = ev(); if (!r.ok) return null;
    if (r.passed) return costOf(d).cost;
    if (!r.deflOk) {
      let bestGain = 0, bestI = -1, bestK = -1;
      d.members.forEach((m, i) => {
        const cur = BY_COST.find((x) => x.key === m.sec)!, k = BY_COST.findIndex((x) => x.A > cur.A * 1.05 && x.kgm * x.pricekg > cur.kgm * cur.pricekg);
        if (k < 0) return;
        const t = { ...d, members: d.members.map((mm, j) => (j === i ? { ...mm, sec: BY_COST[k].key } : mm)) };
        const rr = evaluate(lv, t, s, lv.budget, { fullSpanOnly });
        if (!rr.ok) return;
        const gain = (r.defl - rr.defl) / Math.max(1, rr.cost - r.cost);
        if (gain > bestGain) { bestGain = gain; bestI = i; bestK = k; }
      });
      if (bestI < 0) return null;
      d.members[bestI].sec = BY_COST[bestK].key;
    } else return null;
  }
  return null;
}

function cheapest(lv: Level, s: Settings, fullSpanOnly = false) {
  let best = Infinity, how = "";
  for (let h = lv.grid; h <= lv.above + 1e-9; h += lv.grid) for (const kind of ["warren", "pratt", "howe"] as const) {
    const c = autoSize(lv, template({ ...lv, height: h }, kind), s, fullSpanOnly);
    if (c != null && c < best) { best = c; how = `${kind} h=${h}`; }
  }
  return { cost: best, how };
}

// Base = the v2.0.0 budgets (calibrated with the full-span rule). Keep fixed so re-runs don't compound.
const BASE: Record<number, number> = { 1: 24000, 2: 39000, 3: 50000, 4: 65000, 5: 101000, 6: 187000 };
const table: Record<number, Record<string, number>> = {};
for (const lv of LEVELS) {
  const old = cheapest(lv, { deck: lv.deck, code: "aisc" }, true);
  console.error(`L${lv.id}: pre-v2.3 cheapest ${Math.round(old.cost)} (${old.how}); base budget ${BASE[lv.id]} = ${(BASE[lv.id] / old.cost).toFixed(2)} × cheapest`);
  table[lv.id] = {};
  for (const deck of Object.keys(DECKS) as DeckKey[]) for (const code of ["aisc", "bs"] as CodeKey[]) {
    const c = cheapest(lv, { deck, code });
    const b = Math.round((BASE[lv.id] * c.cost) / old.cost / 1000) * 1000;
    table[lv.id][`${deck}-${code}`] = b;
    console.error(`   ${deck.padEnd(7)} ${code}: cheapest ${Math.round(c.cost)} (${c.how}) → budget ${b}`);
  }
}
console.log(`export const BUDGETS: Record<number, Record<string, number>> = ${JSON.stringify(table)};`);
