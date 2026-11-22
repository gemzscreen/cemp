// CEMP category tree (v1.1.0): one tree shared by Tools, Practices, Codes, Learn and Estimate.
// entries.category stores a leaf slug; when null, the app infers it (explicit map → specialization/tags).

export type Cat = { slug: string; name: string; icon: string; children: { slug: string; name: string }[] };

export const CATEGORIES: Cat[] = [
  { slug: "concrete", name: "Concrete", icon: "▦", children: [
    { slug: "concrete-design", name: "Design: beams, columns, slabs" },
    { slug: "concrete-rebar", name: "Reinforcement & detailing" },
    { slug: "concrete-pouring", name: "Pouring & joints" },
    { slug: "concrete-formwork", name: "Formwork" },
    { slug: "concrete-curing-testing", name: "Curing & testing" },
    { slug: "concrete-materials", name: "Mixes & materials" },
  ] },
  { slug: "masonry", name: "Masonry & finishes", icon: "▤", children: [
    { slug: "masonry-chb", name: "CHB walls" },
    { slug: "masonry-plaster", name: "Plastering" },
    { slug: "masonry-finishes", name: "Tiles, paint & finishes" },
  ] },
  { slug: "steel", name: "Steel", icon: "⌶", children: [
    { slug: "steel-members", name: "Members: tension, columns, beams" },
    { slug: "steel-welding", name: "Welding" },
    { slug: "steel-bolting", name: "Bolting & anchors" },
    { slug: "steel-stands", name: "Steel stands & frames" },
  ] },
  { slug: "lumber", name: "Lumber", icon: "▥", children: [
    { slug: "lumber-general", name: "Lumber & board feet" },
  ] },
  { slug: "earthworks", name: "Earthworks & foundations", icon: "⛰", children: [
    { slug: "earthworks-excavation", name: "Excavation" },
    { slug: "earthworks-foundations", name: "Footings & foundations" },
    { slug: "earthworks-soils", name: "Soils & settlement" },
  ] },
  { slug: "water", name: "Water & sanitary", icon: "◈", children: [
    { slug: "water-tanks", name: "Water tanks" },
    { slug: "water-septic", name: "Septic tanks" },
    { slug: "water-plumbing", name: "Plumbing" },
    { slug: "water-hydraulics", name: "Hydraulics" },
  ] },
  { slug: "safety", name: "Safety & health", icon: "⛑", children: [
    { slug: "safety-program", name: "OSH program & personnel" },
    { slug: "safety-inspection", name: "Site inspections & JHA" },
    { slug: "safety-stats", name: "Safety statistics" },
  ] },
  { slug: "quality", name: "Quality (QA/QC)", icon: "✓", children: [
    { slug: "quality-plans", name: "Quality plans & ITPs" },
    { slug: "quality-inspection", name: "Inspection checklists" },
  ] },
  { slug: "estimating", name: "Estimating & scheduling", icon: "∑", children: [
    { slug: "estimating-takeoff", name: "Quantity takeoff" },
    { slug: "estimating-cost", name: "Cost & pricing" },
    { slug: "estimating-scheduling", name: "Scheduling" },
  ] },
  { slug: "learn", name: "Review & reference", icon: "✎", children: [
    { slug: "learn-cele", name: "Board-exam review" },
    { slug: "learn-global", name: "PH ↔ abroad" },
    { slug: "learn-regulations", name: "Laws & regulations" },
  ] },
];

const LEAVES = CATEGORIES.flatMap((c, ci) => c.children.map((l, li) => ({ ...l, parent: c, no: `${ci + 1}.${li + 1}` })));
export const leafBySlug = (slug?: string | null) => LEAVES.find((l) => l.slug === slug);
export const isLeaf = (slug?: string | null) => !!leafBySlug(slug);
export const ALL_LEAVES = LEAVES;

/** Explicit placement for every entry that existed before v1.1.0. */
const MAP: Record<string, string> = {
  // concrete (SQL-seeded v0.2/v0.3)
  "tool-beam-flexural-capacity": "concrete-design", "tool-beam-required-steel": "concrete-design", "tool-column-maximum-axial-strength": "concrete-design",
  "tool-one-way-slab-thickness-and-temperature-bars": "concrete-design",
  "tool-development-length-and-lap-splice": "concrete-rebar", "tool-hooked-bar-development-length": "concrete-rebar",
  "beam-hoop-zone-smf": "concrete-rebar", "column-confinement-zone-lo": "concrete-rebar", "concrete-cover-cast-in-place": "concrete-rebar",
  "lap-splice-location-smf-columns": "concrete-rebar", "lap-splice-zones-continuous-slabs": "concrete-rebar", "lap-splice-zones-smf-beams": "concrete-rebar",
  "minimum-clear-spacing-of-bars": "concrete-rebar", "standard-hooks-and-bend-diameters": "concrete-rebar",
  "construction-joints-beams": "concrete-pouring", "construction-joints-slabs": "concrete-pouring",
  "curing-of-concrete": "concrete-curing-testing", "concrete-strength-sampling-and-acceptance": "concrete-curing-testing",
  "tool-concrete-sampling-frequency": "concrete-curing-testing", "tool-concrete-strength-acceptance": "concrete-curing-testing", "concrete-testing-plan": "concrete-curing-testing",
  "concrete-classes-dpwh": "concrete-materials", "cylinder-vs-cube-strength": "concrete-materials",
  // steel
  "tool-steel-plate-tension": "steel-members", "tool-steel-w-column-compression": "steel-members", "tool-steel-w-beam-flexure": "steel-members",
  "tool-fillet-weld": "steel-welding", "fillet-weld-size-rules": "steel-welding", "weld-visual-inspection": "steel-welding",
  "tool-bolt-group-shear": "steel-bolting", "high-strength-bolt-installation": "steel-bolting", "bolt-holes-spacing-edge-distance": "steel-bolting", "base-plates-and-anchor-bolts": "steel-bolting",
  // earthworks / water
  "tool-checklist-excavation": "earthworks-excavation", "tool-consolidation-settlement": "earthworks-soils", "tool-hydrostatic-plane-surface": "water-hydraulics",
  // safety
  "tool-safety-officer-requirement": "safety-program", "cshp-outline": "safety-program", "osh-personnel-and-committee": "safety-program", "ppe-matrix-construction": "safety-program", "toolbox-talk-library": "safety-program",
  "tool-checklist-scaffold": "safety-inspection", "tool-checklist-daily-site-safety": "safety-inspection", "tool-jha-risk-matrix": "safety-inspection",
  "tool-injury-rates": "safety-stats",
  // quality
  "itp-hold-and-witness-points": "quality-plans", "qa-vs-qc-explained": "quality-plans",
  "tool-checklist-pre-pour": "quality-inspection", "tool-checklist-rebar": "quality-inspection", "tool-checklist-formwork": "quality-inspection", "tool-checklist-steel": "quality-inspection",
  // estimating
  "tool-concrete-materials-takeoff": "estimating-takeoff", "tool-rebar-weight-takeoff": "estimating-takeoff", "qs-takeoff-workflow": "estimating-takeoff", "rebar-takeoff-and-cutting-list": "estimating-takeoff",
  "tool-cost-buildup": "estimating-cost", "cost-estimate-structure": "estimating-cost",
  "tool-pert-cpm-schedule": "estimating-scheduling", "cpm-pert-explained": "estimating-scheduling",
  // learn
  "cele-outline-psad": "learn-cele", "cele-outline-amsthc": "learn-cele", "cele-outline-hge": "learn-cele", "cele-exam-overview": "learn-cele",
  "flashcards-reinforced-concrete": "learn-cele", "flashcards-structural-steel": "learn-cele", "flashcards-hydraulics-geotech": "learn-cele", "flashcards-cm-qs-safety": "learn-cele",
  "problems-psad": "learn-cele", "problems-amsthc": "learn-cele", "problems-hge": "learn-cele",
  "nscp-vs-source-codes": "learn-global", "ph-vs-sea-practice": "learn-global", "site-terminology-ph-commonwealth": "learn-global",
  "ra-11058-in-one-page": "learn-regulations",
};

/** Fallback for new entries without a stored category: specialization first, then tags. */
const BY_SPEC: Record<string, string> = {
  welding: "steel-welding", bolting: "steel-bolting", steel: "steel-members", "pert-cpm": "estimating-scheduling",
  "quantity-surveying": "estimating-takeoff", "cost-estimation": "estimating-cost", "qa-qc": "quality-plans",
  "safety-health": "safety-program", cele: "learn-cele", "ph-to-global": "learn-global", "project-management": "estimating-scheduling",
};
const BY_TAG: [string, string][] = [
  ["formwork", "concrete-formwork"], ["curing", "concrete-curing-testing"], ["rebar", "concrete-rebar"], ["concreting", "concrete-pouring"],
  ["footing", "earthworks-foundations"], ["welding-activity", "steel-welding"], ["bolting-activity", "steel-bolting"], ["safety", "safety-program"],
  ["takeoff", "estimating-takeoff"], ["estimating", "estimating-cost"], ["scheduling", "estimating-scheduling"], ["inspection", "quality-inspection"],
  ["beam", "concrete-design"], ["column", "concrete-design"], ["slab", "concrete-design"],
];

export function categoryOf(e: { slug: string; category?: string | null; spec?: string | null; tags?: string[] }): string {
  if (isLeaf(e.category)) return e.category!;
  if (MAP[e.slug]) return MAP[e.slug];
  if (e.spec === "concrete") return BY_TAG.find(([t]) => e.tags?.includes(t) && t !== "safety")?.[1] ?? "concrete-design";
  if (e.spec && BY_SPEC[e.spec]) return BY_SPEC[e.spec];
  return BY_TAG.find(([t]) => e.tags?.includes(t))?.[1] ?? "learn-regulations";
}

/** Group items into the numbered tree, keeping only branches that have items. */
export function groupByCategory<T>(items: T[], catOf: (x: T) => string) {
  // numbered 1, 1.1, 1.2 … over the branches shown on this page (tree order is fixed)
  return CATEGORIES.map((c) => ({
    cat: c, leaves: c.children.map((l) => ({ leaf: l, items: items.filter((x) => catOf(x) === l.slug) })).filter((l) => l.items.length),
  })).filter((g) => g.leaves.length).map((g, gi) => ({
    no: gi + 1, cat: g.cat, leaves: g.leaves.map((l, li) => ({ ...l, no: `${gi + 1}.${li + 1}` })),
  }));
}

/** Code clauses → category, by document and section number. */
export function clauseCategory(doc: string, sec: string): string {
  if (doc === "NSCP") {
    const n = parseFloat(sec);
    if (sec.startsWith("426.5.6")) return "concrete-pouring";
    if (sec.startsWith("426.5.3") || sec.startsWith("426.12")) return "concrete-curing-testing";
    if (sec.startsWith("426.11")) return "concrete-formwork";
    if (sec.startsWith("426.13")) return "quality-inspection";
    if (sec.startsWith("426.6") || sec.startsWith("418") || sec.startsWith("420") || sec.startsWith("425")) return "concrete-rebar";
    if (n >= 400 && n < 500) return "concrete-design";
    if (sec.startsWith("510.2")) return "steel-welding";
    if (sec.startsWith("510.3")) return "steel-bolting";
    if (n >= 500 && n < 600) return "steel-members";
    if (n >= 300 && n < 400) return "earthworks-foundations";
    return "concrete-design";
  }
  if (doc === "AISC 360") return sec.startsWith("N") ? "quality-inspection" : "steel-members";
  if (doc === "AWS D1.1") return "steel-welding";
  if (doc === "DPWH Blue Book") return sec.includes("404") ? "concrete-rebar" : sec.includes("405") ? "concrete-materials" : "estimating-takeoff";
  if (doc.startsWith("RA 11058") || doc.startsWith("DOLE")) return "safety-program";
  if (doc === "RA 1378" || doc === "PD 856") return "water-plumbing";
  return "learn-regulations";
}

/** Reference tables → category. */
export const TABLE_CATEGORY: Record<string, string> = {
  "rebar-ph": "concrete-rebar", "rebar-grades-pns49": "concrete-rebar", "unit-weights-materials": "concrete-materials",
  "sheet-steel-gauge": "steel-members", "pipe-sizes-steel": "water-plumbing",
};
