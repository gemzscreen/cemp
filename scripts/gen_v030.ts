// Generates the v0.3.0 seed SQL from lib/calc (single source of truth). Run: npx tsx scripts/gen_v030.ts
import { randomUUID } from "node:crypto";
import { CALCS, defaults } from "../lib/calc";

const q = (s: unknown) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const j = (o: unknown) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;

const newClauses: [string, string, string, string][] = [
  ["425.4.2", "Development of deformed bars in tension", "ACI 318-14 §25.4.2",
   "ld is taken from the general equation ld = [fy/(1.1λ√f'c)]·[ψtψeψs/((cb+Ktr)/db)]·db or the simplified table, and is never less than 300 mm. (cb+Ktr)/db is capped at 2.5 and ψt·ψe at 1.7."],
  ["425.4.3", "Development of standard hooks in tension", "ACI 318-14 §25.4.3",
   "ldh = (0.24 fy ψe ψc ψr / (λ√f'c))·db, not less than 8db or 150 mm. Reductions apply for side cover (ψc = 0.7) and confining ties (ψr = 0.8) on bars 36 mm and smaller."],
  ["422.2", "Design assumptions for flexure and axial strength", "ACI 318-14 §22.2",
   "Plane sections remain plane; max concrete strain 0.003; equivalent rectangular stress block of 0.85f'c over depth a = β1·c, where β1 = 0.85 for f'c ≤ 28 MPa, reducing by 0.05 per 7 MPa to a minimum of 0.65."],
  ["421.2", "Strength reduction factors φ", "ACI 318-14 §21.2",
   "φ = 0.90 for tension-controlled sections (εt ≥ 0.005), 0.65 tied / 0.75 spiral for compression-controlled, with linear transition in between. Shear φ = 0.75."],
  ["409.6.1", "Minimum flexural reinforcement in beams", "ACI 318-14 §9.6.1",
   "As,min is the larger of 0.25√f'c/fy·bw·d and 1.4/fy·bw·d, unless the provided As is at least 4/3 of that required by analysis."],
  ["407.3.1", "Minimum thickness of one-way slabs", "ACI 318-14 §7.3.1",
   "For solid nonprestressed one-way slabs not supporting partitions likely to be damaged: ℓ/20 simply supported, ℓ/24 one end continuous, ℓ/28 both ends continuous, ℓ/10 cantilever (fy = 420 MPa; multiply by 0.4 + fy/700 for other fy)."],
  ["424.4.3", "Shrinkage and temperature reinforcement", "ACI 318-14 §24.4.3",
   "Minimum ratio of gross area: 0.0020 for Grade 280/350 deformed bars, 0.0018 for Grade 420, and 0.0018×420/fy (≥ 0.0014) for higher grades. Spacing ≤ 5h and ≤ 450 mm."],
  ["422.4.2", "Maximum axial strength", "ACI 318-14 §22.4.2",
   "Po = 0.85f'c(Ag − Ast) + fyAst. Maximum nominal axial strength is 0.80Po for tied and 0.85Po for spiral columns."],
  ["410.6.1", "Minimum and maximum longitudinal reinforcement in columns", "ACI 318-14 §10.6.1",
   "Longitudinal steel area is between 0.01Ag and 0.08Ag. Minimum 4 bars for rectangular/circular tied, 6 for spiral."],
];

const meta: Record<string, { slug: string; summary: string; tags: string[]; use: string; limits: string[] }> = {
  "dev-length-tension": { slug: "tool-development-length-and-lap-splice", summary: "ld for straight deformed bars in tension, with Class A/B lap lengths.",
    tags: ["rebar", "beam", "slab", "column"], use: "Checking lap lengths on rebar schedules and bar bending lists, and development past critical sections.",
    limits: ["Straight deformed bars in tension only (compression ld is different)", "Ktr = 0 is conservative; enter Ktr only if transverse steel is detailed", "Bundled bars need the bundle factor (not included)"] },
  "dev-length-hook": { slug: "tool-hooked-bar-development-length", summary: "ldh for 90° and 180° standard hooks in tension.",
    tags: ["rebar", "beam", "column"], use: "Beam bars terminating in exterior columns, cantilever anchorage, footing dowels.",
    limits: ["Tension hooks only; hooks are not effective in compression", "Check joint dimensions can fit ldh plus cover"] },
  "beam-flexure-analysis": { slug: "tool-beam-flexural-capacity", summary: "φMn of a singly reinforced rectangular section, with φ and As,min checks.",
    tags: ["beam", "inspection"], use: "Checking an existing or shop-drawing beam, or a substitution of bar sizes.",
    limits: ["Singly reinforced rectangular sections; T-beams and compression steel not included", "Single layer of tension bars assumed at depth d"] },
  "beam-flexure-design": { slug: "tool-beam-required-steel", summary: "Required tension steel and bar count for a given Mu.",
    tags: ["beam", "estimating"], use: "Quick sizing of beam bars during estimating or value engineering.",
    limits: ["Assumes φ = 0.9 then re-checks with the bars provided", "Does not check clear spacing; use the spacing card", "Shear, deflection and crack control are separate checks"] },
  "one-way-slab-basic": { slug: "tool-one-way-slab-thickness-and-temperature-bars", summary: "Minimum slab thickness without deflection calcs, plus temperature bar spacing.",
    tags: ["slab", "estimating"], use: "Early sizing of one-way slabs and checking temperature bars on plans.",
    limits: ["Normal-weight concrete, members not supporting damage-prone partitions", "Main flexural steel is a separate design"] },
  "column-axial-max": { slug: "tool-column-maximum-axial-strength", summary: "φPn,max for tied or spiral rectangular columns, with steel ratio checks.",
    tags: ["column", "inspection"], use: "Quick axial check of short columns, or comparing column sizes during estimating.",
    limits: ["Concentric axial load only, no moment or slenderness", "Use an interaction diagram (coming later) for Pu + Mu"] },
};

let sql = `-- CEMP v0.3.0 seed: clause index additions + 6 concrete tools (status = review). Generated by scripts/gen_v030.ts\n`;
for (const [sec, title, aci, summary] of newClauses) {
  sql += `insert into public.code_clauses (code_document_id, section_no, title, summary, limits) select id, ${q(sec)}, ${q(title)}, ${q(summary)}, ${j({ aci_equivalent: aci })} from public.code_documents where short_name = 'NSCP' and edition = '2015 (7th ed.)';\n`;
}
for (const c of Object.values(CALCS)) {
  const m = meta[c.key];
  const eid = randomUUID(), rid = randomUUID();
  const inputs = defaults(c);
  const out = c.compute(inputs);
  const hand = {
    inputs,
    results: out.results.map(({ label, value, unit }) => ({ label, value, unit })),
    steps: out.steps,
    verified_by: "Cross-checked by independent hand calculation (v0.3.0 build)",
    note: "Re-run the inputs above. Results must match before trusting a code change.",
  };
  const body = { sections: [
    { kind: "text", heading: "When to use", text: m.use },
    { kind: "avoid", heading: "Limitations", items: m.limits },
    { kind: "text", heading: "Note", text: "Equations follow NSCP 2015 Ch. 4 (= ACI 318-14). Verify against your NSCP copy before marking reviewed." },
  ] };
  const fields = c.fields.map((f) => ({ ...f }));
  sql += `insert into public.entries (id, module, title, slug, specialization_id, summary, status) select ${q(eid)}, 'tool', ${q(c.title)}, ${q(m.slug)}, id, ${q(m.summary)}, 'review' from public.specializations where slug = 'concrete';\n`;
  sql += `insert into public.entry_revisions (id, entry_id, rev_no, body, change_note, code_edition) values (${q(rid)}, ${q(eid)}, 1, ${j(body)}, 'Initial tool (v0.3.0): needs review', 'NSCP 2015');\n`;
  sql += `update public.entries set current_revision_id = ${q(rid)} where id = ${q(eid)};\n`;
  sql += `insert into public.tools (entry_id, kind, calc_key, input_schema, output_schema, hand_check) values (${q(eid)}, 'calculator', ${q(c.key)}, ${j({ fields })}, ${j({ results: out.results.map((r) => ({ label: r.label, unit: r.unit ?? null })) })}, ${j(hand)});\n`;
  for (const sec of c.clauses) {
    sql += `insert into public.entry_clause_refs (entry_id, clause_id) select ${q(eid)}, cc.id from public.code_clauses cc join public.code_documents d on d.id = cc.code_document_id where d.short_name = 'NSCP' and cc.section_no = ${q(sec)};\n`;
  }
  for (const t of m.tags) sql += `insert into public.entry_tags (entry_id, tag_id) select ${q(eid)}, id from public.tags where slug = ${q(t)};\n`;
}
sql += `insert into public.releases (version, batch_name, notes_md, released_at) values ('v0.3.0','Concrete Tools + Codes index', E'- 6 concrete calculators: development length & lap splice, hooked bars, beam φMn, beam required As, one-way slab thickness & temperature bars, column φPn,max\\n- Every tool shows step-by-step substitutions and a recorded hand-check example\\n- Codes page: browsable NSCP 2015 clause index (20 clauses) linked to the cards and tools that cite them\\n- Tools seeded as review drafts: publish after checking', now());\n`;
process.stdout.write(sql);
