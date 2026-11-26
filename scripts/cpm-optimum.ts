// Critical Path Rush: exhaustive optimum for each crash level (v2.4.0). Run: npm run cpm-optimum
// Prints CPM results for every level and the `best` objects to paste into lib/cpm/levels.ts.
import { CPM_LEVELS, cpm, optimum, planCost } from "../lib/cpm";
const out: Record<number, unknown> = {};
for (const lv of CPM_LEVELS) {
  const r = cpm(lv.acts);
  console.error(`L${lv.id} ${lv.name} [${lv.mode}]: T = ${r.T}, critical ${r.critical.join("-")}, floats ${r.rows.filter((x) => x.tf).map((x) => `${x.id}:${x.tf}`).join(" ")}`);
  if (lv.mode !== "crash" || !lv.terms) continue;
  const normal = planCost(lv.acts, {}, lv.terms);
  const t0 = Date.now(), { best, combos } = optimum(lv.acts, lv.terms);
  console.error(`   normal plan: T ${normal.T}, total ₱${normal.total}; optimum: T ${best!.cost.T}, crash ₱${best!.cost.crashCost}, total ₱${best!.cost.total} (${combos} combos, ${Date.now() - t0} ms) crash ${JSON.stringify(best!.crash)}`);
  out[lv.id] = { total: best!.cost.total, T: best!.cost.T, crash: Object.fromEntries(Object.entries(best!.crash).filter(([, v]) => v)) };
}
console.log(JSON.stringify(out));
