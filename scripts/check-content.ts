// Validates content batches before pushing: refs, calc keys, slugs, diagrams.
// Run: npx tsx scripts/check-content.ts
import { BATCHES } from "../content";
import { CALCS, defaults } from "../lib/calc";
import { DOCS } from "../content/types";
import { validateSections } from "../lib/sections";
import { isLeaf } from "../lib/taxonomy";

// Clauses seeded before content-as-code (v0.2.0–v0.3.0 migrations)
const SEEDED = ["425.5.2","426.5.6","418.6.3","418.7.4","418.7.5","418.6.4","420.6.1","425.2","425.3","426.5.3","426.12",
  "425.4.2","425.4.3","422.2","421.2","409.6.1","407.3.1","424.4.3","422.4.2","410.6.1"];
const SPECS = ["concrete","steel","welding","bolting","project-management","pert-cpm","quantity-surveying","cost-estimation","qa-qc","safety-health","cele","ph-to-global"];
const TAGS = ["slab","beam","girder","column","footing","wall","stair","connection","truss","rebar","formwork","concreting","curing","welding-activity","bolting-activity","takeoff","estimating","scheduling","inspection","safety","pre-construction","construction","turnover"];

// Tool entries seeded by SQL (v0.3.0) plus every tool defined in content batches
const TOOL_SLUGS = new Set(["tool-beam-flexural-capacity","tool-beam-required-steel","tool-column-maximum-axial-strength","tool-development-length-and-lap-splice",
  "tool-hooked-bar-development-length","tool-one-way-slab-thickness-and-temperature-bars",
  ...BATCHES.flatMap((b) => b.entries.filter((e) => e.module === "tool").map((e) => e.slug))]);
let errors = 0;
const err = (m: string) => { errors++; console.log("✕", m); };
const slugs = new Set<string>();
// Clauses are keyed by document; a batch may cite clauses from itself or any earlier batch (sync in order).
const key = (doc: string | undefined, sec: string) => `${doc ?? "NSCP"}|${sec}`;
const known = new Set(SEEDED.map((s) => key("NSCP", s)));
for (const b of BATCHES) {
  b.clauses.forEach((c) => {
    if (c.doc && !DOCS[c.doc]) err(`${b.version}: clause ${c.section} uses document "${c.doc}" missing from DOCS`);
    known.add(key(c.doc, c.section));
  });
  for (const e of b.entries) {
    if (slugs.has(e.slug)) err(`${b.version}: duplicate slug ${e.slug}`); slugs.add(e.slug);
    if (!SPECS.includes(e.specialization)) err(`${e.slug}: unknown specialization ${e.specialization}`);
    e.tags.forEach((t) => TAGS.includes(t) || err(`${e.slug}: unknown tag ${t}`));
    if ((e.module === "practice" || e.module === "code") && e.refs.length === 0) err(`${e.slug}: needs ≥1 clause ref`);
    e.refs.forEach((r) => known.has(key(r.doc, r.section)) || err(`${e.slug}: clause ${r.doc ?? "NSCP"} ${r.section} not defined in this or an earlier batch`));
    validateSections(e.sections).forEach((m) => err(`${e.slug}: ${m}`));
    if (e.category && !isLeaf(e.category)) err(`${e.slug}: unknown category ${e.category}`);
    e.sections.forEach((s, k) => {
      const at = `${e.slug} §${k + 1}`;
      if (s.kind === "table" && (!s.columns?.length || (s.rows ?? []).some((r) => r.length !== s.columns!.length))) err(`${at}: table rows must match ${s.columns?.length} columns`);
      if (s.kind === "cards" && !s.cards?.length) err(`${at}: empty flashcard deck`);
      if (s.kind === "problem" && (!s.problem?.answer.length || !s.problem.steps.length)) err(`${at}: problem without steps/answer`);
      if (s.kind === "problem" && s.problem?.tool && !TOOL_SLUGS.has(s.problem.tool)) err(`${at}: links to unknown tool ${s.problem.tool}`);
    });
    if (e.module === "tool") {
      const c = e.calc_key && CALCS[e.calc_key];
      if (!c) err(`${e.slug}: unknown calc_key ${e.calc_key}`);
      else { const o = c.compute(defaults(c)); if (!o.results.length) err(`${e.slug}: calc returned no results`); }
    }
  }
  console.log(`${b.version}: ${b.entries.length} entries, ${b.clauses.length} clauses checked`);
}
// v1.2.0: standards panels must point at a known entry (batch-defined or SQL-seeded v0.2.0 practices)
const SEEDED_ENTRIES = new Set(["concrete-cover-cast-in-place","minimum-clear-spacing-of-bars","standard-hooks-and-bend-diameters","curing-of-concrete",
  "concrete-strength-sampling-and-acceptance","construction-joints-beams","construction-joints-slabs","lap-splice-zones-continuous-slabs",
  "lap-splice-zones-smf-beams","lap-splice-location-smf-columns","beam-hoop-zone-smf","concrete-classes-dpwh",
  "tool-development-length-and-lap-splice","tool-hooked-bar-development-length","tool-one-way-slab-thickness-and-temperature-bars","tool-beam-flexural-capacity","tool-beam-required-steel","tool-column-maximum-axial-strength"]);
let panels = 0;
for (const b of BATCHES) for (const x of b.standards ?? []) {
  if (!slugs.has(x.slug) && !SEEDED_ENTRIES.has(x.slug)) err(`${b.version}: standards for unknown entry ${x.slug}`);
  for (const k of ["ph", "bn", "intl"] as const) {
    const p = x[k]; if (!p) continue; panels++;
    if (!p.code || p.code.length > 120) err(`${x.slug}/${k}: code label missing or > 120 chars`);
    if (!p.points.length) err(`${x.slug}/${k}: no points`);
    if ((p.refs ?? "").length > 300) err(`${x.slug}/${k}: refs > 300 chars`);
    if (k === "bn" && p.verified !== false) err(`${x.slug}/bn: Brunei panels stay verified:false until checked`);
  }
}
console.log(`standards: ${panels} panels checked`);
if (errors) { console.log(`${errors} error(s)`); process.exit(1); } else console.log("✓ content OK");
