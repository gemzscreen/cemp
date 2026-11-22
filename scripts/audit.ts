// Repo content audit → docs/AUDIT.md. Run: npx tsx scripts/audit.ts
import { writeFileSync } from "node:fs";
import { BATCHES } from "../content";
import { CALCS, defaults } from "../lib/calc";
import { auditBatches } from "../lib/audit";

const SEEDED_TOOLS = ["tool-beam-flexural-capacity","tool-beam-required-steel","tool-column-maximum-axial-strength","tool-development-length-and-lap-splice",
  "tool-hooked-bar-development-length","tool-one-way-slab-thickness-and-temperature-bars"];
const f = auditBatches(BATCHES, SEEDED_TOOLS);
// every calculator must compute its own defaults without throwing and return results
for (const c of Object.values(CALCS)) {
  try { if (!c.compute(defaults(c)).results.length) f.push({ level: "error", slug: c.key, issue: "calculator returns no results" }); }
  catch (e) { f.push({ level: "error", slug: c.key, issue: `calculator throws: ${(e as Error).message}` }); }
}
const n = (l: string) => f.filter((x) => x.level === l).length;
const entries = BATCHES.reduce((s, b) => s + b.entries.length, 0);
const lines = [
  "# CEMP content audit (repo)", "",
  `Generated ${new Date().toISOString()} by \`scripts/audit.ts\`. Batches: ${BATCHES.map((b) => b.version).join(", ")} · entries: ${entries} · calculators: ${Object.keys(CALCS).length}.`, "",
  `**${n("error")} errors · ${n("warn")} warnings · ${n("info")} notes.** Database state (sync, review, publish, hand-check drift) is audited live at /admin/audit.`, "",
  "| Level | Entry / calc | Issue |", "|---|---|---|",
  ...f.sort((a, b) => a.level.localeCompare(b.level) || a.slug.localeCompare(b.slug)).map((x) => `| ${x.level} | ${x.slug} | ${x.issue.replace(/\|/g, "/")} |`),
];
writeFileSync("docs/AUDIT.md", lines.join("\n") + "\n");
console.log(`audit: ${n("error")} errors, ${n("warn")} warnings, ${n("info")} notes → docs/AUDIT.md`);
if (n("error")) process.exit(1);
