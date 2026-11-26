// Beam Optimizer: exhaustive optimum for each level (v2.7.0). Run: npm run beam-optimum
// Prints each level's start design result and the BEST object to paste into lib/beam/levels.ts.
import { BEAM_LEVELS, evaluate, optimum } from "../lib/beam";
const out: Record<number, unknown> = {};
for (const lv of BEAM_LEVELS) {
  const st = evaluate(lv, lv.start), t0 = Date.now(), { best, combos, passing } = optimum(lv);
  console.error(`L${lv.id} ${lv.name}: start ₱${st.cost.total} ${st.pass ? "PASS" : "FAIL " + st.checks.filter((c) => !c.ok).map((c) => c.key).join(",")}; ` +
    `optimum ₱${best?.cost} ${JSON.stringify(best?.design)} (${combos} combos, ${passing} improving passes, ${Date.now() - t0} ms)`);
  if (best) {
    const e = evaluate(lv, best.design);
    console.error("   " + e.checks.map((c) => `${c.key} ${c.ratio.toFixed(3)}: ${c.detail}`).join(" | "));
  }
  out[lv.id] = best;
}
console.log("export const BEST: Record<number, BeamLevel[\"best\"]> = " + JSON.stringify(out) + ";");
