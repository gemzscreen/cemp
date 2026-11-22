// Validates content batches before pushing: refs, calc keys, slugs, diagrams.
// Run: npx tsx scripts/check-content.ts
import { BATCHES } from "../content";
import { CALCS, defaults } from "../lib/calc";

// Clauses seeded before content-as-code (v0.2.0–v0.3.0 migrations)
const SEEDED = ["425.5.2","426.5.6","418.6.3","418.7.4","418.7.5","418.6.4","420.6.1","425.2","425.3","426.5.3","426.12",
  "425.4.2","425.4.3","422.2","421.2","409.6.1","407.3.1","424.4.3","422.4.2","410.6.1"];
const SPECS = ["concrete","steel","welding","bolting","project-management","pert-cpm","quantity-surveying","cost-estimation","qa-qc","safety-health","cele","ph-to-global"];
const TAGS = ["slab","beam","girder","column","footing","wall","stair","connection","truss","rebar","formwork","concreting","curing","welding-activity","bolting-activity","takeoff","estimating","scheduling","inspection","safety","pre-construction","construction","turnover"];

let errors = 0;
const err = (m: string) => { errors++; console.log("✕", m); };
const slugs = new Set<string>();
for (const b of BATCHES) {
  const known = new Set([...SEEDED, ...b.clauses.map((c) => c.section)]);
  for (const e of b.entries) {
    if (slugs.has(e.slug)) err(`${b.version}: duplicate slug ${e.slug}`); slugs.add(e.slug);
    if (!SPECS.includes(e.specialization)) err(`${e.slug}: unknown specialization ${e.specialization}`);
    e.tags.forEach((t) => TAGS.includes(t) || err(`${e.slug}: unknown tag ${t}`));
    if ((e.module === "practice" || e.module === "code") && e.refs.length === 0) err(`${e.slug}: needs ≥1 clause ref`);
    e.refs.forEach((r) => (r.doc && r.doc !== "NSCP") || known.has(r.section) || err(`${e.slug}: clause ${r.section} not defined`));
    if (e.module === "tool") {
      const c = e.calc_key && CALCS[e.calc_key];
      if (!c) err(`${e.slug}: unknown calc_key ${e.calc_key}`);
      else { const o = c.compute(defaults(c)); if (!o.results.length) err(`${e.slug}: calc returned no results`); }
    }
  }
  console.log(`${b.version}: ${b.entries.length} entries, ${b.clauses.length} clauses checked`);
}
if (errors) { console.log(`${errors} error(s)`); process.exit(1); } else console.log("✓ content OK");
