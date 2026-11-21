// Generates the v0.2.0 seed SQL: NSCP 2015 clause index rows + Concrete Practices I cards (status = review).
// Clause numbers follow NSCP 2015 = ACI 318-14 numbering with a "4" prefix (e.g. 425.5.2 ↔ ACI 25.5.2).
// Summaries are written in our own words; they are NOT code text.
import { randomUUID } from "node:crypto";

const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;

const clauses = {
  lap:      { sec: "425.5.2", title: "Lap splices of deformed bars in tension", aci: "ACI 318-14 §25.5.2",
              summary: "Tension lap splices are Class A (1.0 ld) or Class B (1.3 ld), never less than 300 mm. Class B is the default unless the provided steel is at least twice the required steel and no more than half the bars are spliced within the lap length." },
  joints:   { sec: "426.5.6", title: "Construction, contraction and isolation joints", aci: "ACI 318-14 §26.5.6",
              summary: "Joints are located where they least impair strength: in floors, within the middle third of slab, beam and girder spans; in girders, offset from intersecting beams by at least twice the beam width. Surfaces are cleaned and laitance removed, and the joint is wetted (no standing water) before the next pour. Beams and slabs are cast together unless the drawings show otherwise." },
  smfBeamL: { sec: "418.6.3", title: "Special moment frame beams: longitudinal reinforcement", aci: "ACI 318-14 §18.6.3",
              summary: "In special moment frame beams, lap splices of longitudinal bars must be enclosed by hoops or spirals over the splice length, and are not allowed inside joints, within 2h of the joint face, or where analysis shows flexural yielding." },
  smfColL:  { sec: "418.7.4", title: "Special moment frame columns: longitudinal reinforcement", aci: "ACI 318-14 §18.7.4",
              summary: "In special moment frame columns, lap splices are only allowed within the center half of the member length. They are designed as tension lap splices and enclosed by the confinement reinforcement of 418.7.5.2–418.7.5.3." },
  smfColT:  { sec: "418.7.5", title: "Special moment frame columns: transverse reinforcement", aci: "ACI 318-14 §18.7.5",
              summary: "Confinement length lo at each end is the largest of: column depth h, 1/6 of clear height, and 450 mm. Hoop spacing within lo is the smallest of: 1/4 of the least column dimension, 6 × the smallest longitudinal bar diameter, and so = 100 + (350 − hx)/3 mm, with so between 100 and 150 mm. Outside lo, spacing is ≤ 6db and ≤ 150 mm." },
  smfBeamT: { sec: "418.6.4", title: "Special moment frame beams: transverse reinforcement", aci: "ACI 318-14 §18.6.4",
              summary: "Hoops are required over 2h from the face of each supporting column (and wherever yielding may occur). The first hoop is placed ≤ 50 mm from the column face. Spacing in the hoop zone is the smallest of d/4, 6 × the smallest main bar diameter, and 150 mm. Elsewhere, stirrups with seismic hooks at ≤ d/2." },
  cover:    { sec: "420.6.1", title: "Specified concrete cover", aci: "ACI 318-14 §20.6.1",
              summary: "Minimum specified cover for cast-in-place nonprestressed concrete depends on exposure and member type. It is measured from the concrete surface to the outermost steel (usually the tie or stirrup), not to the main bar." },
  spacing:  { sec: "425.2", title: "Minimum spacing of reinforcement", aci: "ACI 318-14 §25.2",
              summary: "Clear spacing between parallel bars in a layer is at least the largest of 25 mm, db, and 4/3 of the maximum aggregate size. Bars in upper layers sit directly above lower ones, with ≥ 25 mm clear between layers. In columns, clear spacing between longitudinal bars is at least the largest of 40 mm, 1.5db, and 4/3 of the aggregate size." },
  hooks:    { sec: "425.3", title: "Standard hooks, seismic hooks, crossties and bend diameters", aci: "ACI 318-14 §25.3",
              summary: "Hook geometry (bend angle, straight extension, minimum inside bend diameter) for development hooks and for stirrups, ties and hoops. Seismic hooks are 135° (90° allowed for circular hoops) with an extension of at least 6db or 75 mm." },
  curing:   { sec: "426.5.3", title: "Curing", aci: "ACI 318-14 §26.5.3",
              summary: "Concrete (other than high-early-strength) is kept above 10 °C and in a moist condition for at least the first 7 days after placement. High-early-strength concrete needs at least 3 days, unless accelerated curing is used." },
  testing:  { sec: "426.12", title: "Evaluation and acceptance of concrete", aci: "ACI 318-14 §26.12",
              summary: "Strength test frequency and acceptance criteria for standard-cured cylinders. A strength test is the average of at least two 150×300 mm or three 100×200 mm cylinders tested at the specified age (usually 28 days)." },
};
Object.values(clauses).forEach((c) => (c.id = randomUUID()));

const VERIFY = "Clause numbers follow the NSCP 2015 ↔ ACI 318-14 numbering. Check each value against your own NSCP copy before marking reviewed.";

const cards = [
  {
    slug: "lap-splice-zones-continuous-slabs", title: "Lap splice zones: continuous slabs",
    summary: "Where to lap top and bottom slab bars in a continuous slab span.",
    tags: ["slab", "rebar", "construction"], refs: [["lap", "Class B length"]],
    diagram: { type: "span", member: "slab", support: "beam", bands: "top-bottom",
      zones: [{ w: .3, top: "avoid", bottom: "safe" }, { w: .4, top: "safe", bottom: "avoid" }, { w: .3, top: "avoid", bottom: "safe" }],
      dims: ["0.3Ln", "0.4Ln", "0.3Ln"], spanLabel: "Ln = clear span, face to face of supports",
      lap: [{ at: .5, band: "top" }, { at: .14, band: "bottom" }, { at: .86, band: "bottom" }], diagram: "moment-continuous",
      caption: "Continuous slab: splice zones for top and bottom bars" },
    sections: [
      { kind: "safe", heading: "Safe to splice", items: ["Top bars: middle 0.4Ln, where top tension is lowest", "Bottom bars: near the supports, within about 0.3Ln of each face"] },
      { kind: "avoid", heading: "Avoid", items: ["Top bars over the supports: highest negative moment", "Bottom bars at midspan: highest positive moment"] },
      { kind: "list", heading: "Terms", items: ["Ln: clear span, face to face of supports", "ld: development length of the bar in tension", "Class B lap: 1.3 ld, not less than 300 mm"] },
      { kind: "list", heading: "Site checklist", items: ["Lap length matches the plans (default Class B)", "Splices staggered, not all bars lapped at one section", "Laps tied at both ends and the middle", "Splice locations follow the structural drawings when they are shown"] },
      { kind: "text", heading: "Note", text: "The 0.3 / 0.4 / 0.3 split is a common site rule for uniformly loaded continuous slabs, based on the moment diagram. The code's general principle is to splice away from points of maximum stress. Cantilevers and unusual loading need their own zones from the designer. " + VERIFY },
    ],
  },
  {
    slug: "lap-splice-zones-smf-beams", title: "Lap splice zones: beams in special moment frames",
    summary: "No laps near the joint: where top and bottom beam bars can be lapped in seismic frames.",
    tags: ["beam", "rebar", "construction"], refs: [["smfBeamL", "No laps within joints or 2h of the face"], ["lap", "Lap length"]],
    diagram: { type: "span", member: "beam", support: "column", bands: "top-bottom",
      zones: [{ w: .12, top: "avoid", bottom: "avoid" }, { w: .21, top: "avoid", bottom: "safe" }, { w: .34, top: "safe", bottom: "avoid" }, { w: .21, top: "avoid", bottom: "safe" }, { w: .12, top: "avoid", bottom: "avoid" }],
      dims: ["2h", "", "≈ Ln/3", "", "2h"], spanLabel: "Ln = clear span, face to face of columns · h = beam depth",
      lap: [{ at: .5, band: "top" }, { at: .22, band: "bottom" }, { at: .78, band: "bottom" }], diagram: "moment-continuous",
      caption: "SMF beam: no-splice zones within 2h of each column face" },
    sections: [
      { kind: "safe", heading: "Safe to splice", items: ["Top bars: middle third of the span", "Bottom bars: between 2h from the column face and the middle third", "Every lap fully enclosed by hoops along its length"] },
      { kind: "avoid", heading: "Avoid (not permitted in SMF)", items: ["Any lap inside the beam-column joint", "Any lap within 2h of the column face", "Any lap where the analysis shows flexural yielding (plastic hinges)"] },
      { kind: "list", heading: "Site checklist", items: ["Mark 2h from each column face on the formwork before tying", "Hoops at the specified spacing over the full lap length", "Bottom bar laps not bunched at one section"] },
      { kind: "text", heading: "Note", text: "For non-seismic (ordinary) frames the code limits are looser, so follow the design drawings. " + VERIFY },
    ],
  },
  {
    slug: "lap-splice-location-smf-columns", title: "Lap splice location: columns in special moment frames",
    summary: "Column bar laps belong in the center half of the column height, not just above the slab.",
    tags: ["column", "rebar", "construction"], refs: [["smfColL", "Center-half rule"], ["smfColT", "Confinement over the lap"], ["lap", "Tension lap length"]],
    diagram: { type: "column", hoops: "uniform",
      zones: [{ h: .25, status: "avoid", label: "end region" }, { h: .5, status: "safe", label: "center half" }, { h: .25, status: "avoid", label: "end region" }],
      dims: ["¼ Lu", "½ Lu", "¼ Lu"], lap: { from: .35, to: .6 }, caption: "SMF column: lap splices only within the center half" },
    sections: [
      { kind: "safe", heading: "Safe to splice", items: ["Within the center half of the clear column height", "Designed as a tension lap splice", "Enclosed by confinement hoops over the lap"] },
      { kind: "avoid", heading: "Avoid", items: ["Lapping right above the floor slab: a common site habit, but not allowed in SMF columns", "Laps inside the end confinement regions"] },
      { kind: "list", heading: "Site checklist", items: ["Order column bars long enough to reach the center half of the next storey", "Stagger mechanical couplers if used instead of laps", "Check hoop spacing along the lap"] },
      { kind: "text", heading: "Note", text: "Splicing just above the floor is acceptable only where the design does not require special moment frame detailing, so follow the plans. " + VERIFY },
    ],
  },
  {
    slug: "column-confinement-zone-lo", title: "Column confinement zone (lo)",
    summary: "Close hoop spacing at both ends of seismic columns: how long lo is and how tight the hoops are.",
    tags: ["column", "rebar", "inspection"], refs: [["smfColT", "lo length and hoop spacing"]],
    diagram: { type: "column", hoops: "confined-ends",
      zones: [{ h: .2, status: "confine", label: "lo, tight hoops" }, { h: .6, status: "neutral" }, { h: .2, status: "confine", label: "lo, tight hoops" }],
      dims: ["lo", "s ≤ 6db, 150", "lo"], caption: "SMF column: confinement zones at both ends" },
    sections: [
      { kind: "safe", heading: "lo: length of each end zone", items: ["Largest of: column depth h", "1/6 of the clear height", "450 mm"] },
      { kind: "safe", heading: "Hoop spacing inside lo", items: ["Smallest of: 1/4 of the least column dimension", "6 × smallest longitudinal bar diameter", "so = 100 + (350 − hx)/3 mm, kept between 100 and 150 mm"] },
      { kind: "avoid", heading: "Common site errors", items: ["Uniform spacing all the way up (no tight end zones)", "First hoop too far from the beam/slab face", "90° hooks instead of 135° seismic hooks"] },
      { kind: "list", heading: "Terms", items: ["hx: max center-to-center spacing of laterally supported bars", "db: diameter of the longitudinal bar"] },
      { kind: "text", heading: "Note", text: VERIFY },
    ],
  },
  {
    slug: "beam-hoop-zone-smf", title: "Beam hoop zone: special moment frames",
    summary: "Hoops over 2h at each beam end, starting within 50 mm of the column face.",
    tags: ["beam", "rebar", "inspection"], refs: [["smfBeamT", "Hoop zone and spacing"]],
    diagram: { type: "span", member: "beam", support: "column", bands: "single",
      zones: [{ w: .16, status: "confine" }, { w: .68, status: "neutral" }, { w: .16, status: "confine" }],
      dims: ["2h", "stirrups ≤ d/2", "2h"], spanLabel: "h = overall beam depth · d = effective depth",
      caption: "SMF beam: hoop zones at both ends" },
    sections: [
      { kind: "safe", heading: "Inside the 2h hoop zone", items: ["First hoop ≤ 50 mm from the column face", "Spacing ≤ smallest of d/4, 6 × smallest main bar diameter, 150 mm", "Closed hoops with 135° seismic hooks"] },
      { kind: "safe", heading: "Outside the hoop zone", items: ["Stirrups with seismic hooks at ≤ d/2"] },
      { kind: "avoid", heading: "Common site errors", items: ["Starting the stirrups at the old 'd/2 from face' habit", "Open U-stirrups in the hoop zone", "Lap splices inside the hoop zone (see the beam splice card)"] },
      { kind: "text", heading: "Note", text: VERIFY },
    ],
  },
  {
    slug: "construction-joints-beams", title: "Construction joints: beams",
    summary: "Where to stop a beam pour: middle third, vertical, bars running through.",
    tags: ["beam", "concreting", "formwork"], refs: [["joints", "Middle third, girder offset"]],
    diagram: { type: "span", member: "beam", support: "column", bands: "single",
      zones: [{ w: 1 / 3, status: "avoid" }, { w: 1 / 3, status: "safe" }, { w: 1 / 3, status: "avoid" }],
      dims: ["L/3", "L/3", "L/3"], spanLabel: "L = clear span, face to face of columns",
      joint: { at: .5, label: "Vertical joint, square to the beam" }, diagram: "shear",
      caption: "Beam construction joint: middle third only" },
    sections: [
      { kind: "safe", heading: "Safe to stop the pour", items: ["Middle third of the span: lowest shear", "Vertical joint with bars running through unbroken", "Girders: offset at least 2 × the width of the beam framing in"] },
      { kind: "avoid", heading: "Avoid", items: ["Near the supports: highest shear, never at the column face", "Horizontal joints in the beam: cast beam and slab together"] },
      { kind: "list", heading: "Before the next pour", items: ["Clean the joint and remove laitance", "Roughen the surface", "Wet it, but no standing water"] },
      { kind: "text", heading: "Note", text: "Joint locations shown on the drawings or approved by the engineer govern. " + VERIFY },
    ],
  },
  {
    slug: "construction-joints-slabs", title: "Construction joints: slabs",
    summary: "Where to stop a slab pour, and how to prepare it for the next one.",
    tags: ["slab", "concreting", "formwork"], refs: [["joints", "Middle third"]],
    diagram: { type: "span", member: "slab", support: "beam", bands: "single",
      zones: [{ w: 1 / 3, status: "avoid" }, { w: 1 / 3, status: "safe" }, { w: 1 / 3, status: "avoid" }],
      dims: ["L/3", "L/3", "L/3"], spanLabel: "L = slab span between supporting beams",
      joint: { at: .5, label: "Vertical stop-end" }, diagram: "shear", caption: "Slab construction joint: middle third" },
    sections: [
      { kind: "safe", heading: "Safe to stop the pour", items: ["Middle third of the slab span", "Straight vertical stop-end board, bars passing through", "Plan pour breaks so beams and the slab they support are cast together"] },
      { kind: "avoid", heading: "Avoid", items: ["Directly over or next to a supporting beam", "Feather-edged or sloping joints", "Stopping in the middle of a beam's width"] },
      { kind: "list", heading: "Before the next pour", items: ["Remove laitance, roughen, clean", "Wet the joint with no ponding", "Check that bars are not displaced at the stop-end"] },
      { kind: "text", heading: "Note", text: VERIFY },
    ],
  },
  {
    slug: "concrete-cover-cast-in-place", title: "Concrete cover: cast-in-place",
    summary: "Minimum cover by exposure and member, measured to the outermost steel.",
    tags: ["rebar", "inspection", "construction"], refs: [["cover", "Cover table"]],
    diagram: { type: "section", shape: "beam", b: 300, h: 500, barsTop: 2, barsBottom: 3,
      callouts: [{ kind: "cover-bottom", label: "Cover to stirrup, not main bar" }, { kind: "cover-side", label: "Side cover: same rule" }],
      caption: "Beam section: cover measured to the stirrup" },
    sections: [
      { kind: "list", heading: "Minimum specified cover (cast-in-place, nonprestressed)", items: [
        "Cast against and permanently in contact with earth: 75 mm",
        "Exposed to weather or in contact with ground, 20–57 mm bars: 50 mm",
        "Exposed to weather or in contact with ground, 16 mm bars and smaller: 40 mm",
        "Not exposed, slabs/joists/walls, 43–57 mm bars: 40 mm",
        "Not exposed, slabs/joists/walls, 36 mm bars and smaller: 20 mm",
        "Not exposed, beams/columns/pedestals (main bars, stirrups, ties, hoops): 40 mm"] },
      { kind: "safe", heading: "Do", items: ["Use concrete or plastic spacers sized for the required cover", "Measure cover to the stirrup/tie", "Add cover for coastal/aggressive exposure if the specs require it"] },
      { kind: "avoid", heading: "Avoid", items: ["Stone, wood or CHB pieces as spacers", "Footing bars sitting on soil or lean concrete without spacers", "Measuring cover to the main bar"] },
      { kind: "text", heading: "Note", text: VERIFY },
    ],
  },
  {
    slug: "minimum-clear-spacing-of-bars", title: "Minimum clear spacing of bars",
    summary: "How close bars can be: concrete must flow and coarse aggregate must pass.",
    tags: ["beam", "column", "rebar", "inspection"], refs: [["spacing", "Clear spacing rules"]],
    diagram: { type: "section", shape: "beam", b: 350, h: 500, barsTop: 2, barsBottom: 4,
      callouts: [{ kind: "clear-spacing", label: "≥ max(25 mm, db, 4/3 × agg.)" }, { kind: "cover-bottom", label: "Cover per cover card" }],
      caption: "Beam section: clear spacing between bars" },
    sections: [
      { kind: "safe", heading: "Beams and slabs", items: ["Clear spacing in a layer ≥ largest of 25 mm, db, 4/3 × max aggregate", "Second layer directly above the first, ≥ 25 mm clear between layers"] },
      { kind: "safe", heading: "Columns", items: ["Clear spacing between longitudinal bars ≥ largest of 40 mm, 1.5db, 4/3 × max aggregate", "Check at lap splices, where bars are doubled"] },
      { kind: "avoid", heading: "Avoid", items: ["Bundling bars at laps so that spacing drops below the minimum", "Using 3/4\" gravel in congested joints without checking 4/3 × aggregate"] },
      { kind: "text", heading: "Note", text: VERIFY },
    ],
  },
  {
    slug: "standard-hooks-and-bend-diameters", title: "Standard hooks and bend diameters",
    summary: "90°, 135° and 180° hook extensions and minimum bend diameters for bars, stirrups and ties.",
    tags: ["rebar", "inspection"], refs: [["hooks", "Hook geometry"]], diagram: null,
    sections: [
      { kind: "list", heading: "Development hooks (main bars)", items: ["90° hook: straight extension 12db", "180° hook: extension ≥ 4db and ≥ 65 mm", "Min. inside bend diameter: 6db (10–25 mm), 8db (28–36 mm), 10db (43–57 mm)"] },
      { kind: "list", heading: "Stirrups and ties", items: ["90° hook: 6db for 16 mm and smaller; 12db for 20–25 mm", "135° hook: 6db for 25 mm and smaller", "Min. inside bend diameter for 16 mm and smaller: 4db"] },
      { kind: "safe", heading: "Seismic hooks (hoops and crossties)", items: ["135° bend (90° allowed only for circular hoops)", "Extension ≥ larger of 6db and 75 mm, engaging the longitudinal bar"] },
      { kind: "avoid", heading: "Avoid", items: ["Bending with a pipe over a nail: bend diameters too tight, cracks at the bend", "Heating bars to bend them", "Re-straightening bent bars without the engineer's approval"] },
      { kind: "text", heading: "Note", text: "A hook diagram will be added when the diagram engine gets a hook renderer. " + VERIFY },
    ],
  },
  {
    slug: "curing-of-concrete", title: "Curing of concrete",
    summary: "Keep it wet and warm: minimum curing periods and site methods for PH conditions.",
    tags: ["curing", "concreting", "construction"], refs: [["curing", "Minimum curing period"]], diagram: null,
    sections: [
      { kind: "safe", heading: "Minimum period", items: ["Normal concrete: keep moist and above 10 °C for at least 7 days", "High-early-strength concrete: at least 3 days", "Start as soon as the surface will not be marred"] },
      { kind: "safe", heading: "Site methods", items: ["Ponding on slabs", "Wet burlap or sacks kept continuously wet", "Membrane curing compound applied right after finishing", "Leave formwork on columns/beam sides longer in hot, windy weather"] },
      { kind: "avoid", heading: "Avoid", items: ["Wetting once a day and letting it dry in between", "Leaving fresh slabs exposed to midday sun and wind", "Loading the slab with materials during early curing"] },
      { kind: "text", heading: "Note", text: VERIFY },
    ],
  },
  {
    slug: "concrete-strength-sampling-and-acceptance", title: "Concrete strength sampling and acceptance",
    summary: "How many cylinder sets to take and when the results pass.",
    tags: ["concreting", "inspection"], refs: [["testing", "Frequency and acceptance"]], diagram: null,
    sections: [
      { kind: "list", heading: "Sampling frequency (per class of concrete), at least", items: ["Once per day of placement", "Once per 110 m³ placed", "Once per 460 m² of slab or wall surface"] },
      { kind: "list", heading: "One strength test", items: ["Average of two 150×300 mm or three 100×200 mm cylinders", "Tested at the specified age (usually 28 days)"] },
      { kind: "safe", heading: "Acceptance (standard-cured cylinders)", items: ["Every average of 3 consecutive tests ≥ f'c", "No single test below f'c − 3.5 MPa (f'c ≤ 35 MPa) or below 0.90 f'c (f'c > 35 MPa)"] },
      { kind: "avoid", heading: "Avoid", items: ["Cylinders left in the sun or moved during the first 24 h", "Sampling only from the first truck", "Adding water at site after sampling"] },
      { kind: "text", heading: "Note", text: "DPWH projects may require more frequent sampling per the Blue Book and contract specs. " + VERIFY },
    ],
  },
];

let sql = `-- CEMP v0.2.0 seed: NSCP 2015 clause index + Concrete Practices I (status = review). Generated by scripts/gen_v020.mjs\n`;
for (const c of Object.values(clauses)) {
  sql += `insert into public.code_clauses (id, code_document_id, section_no, title, summary, limits) select ${q(c.id)}, id, ${q(c.sec)}, ${q(c.title)}, ${q(c.summary)}, ${j({ aci_equivalent: c.aci })} from public.code_documents where short_name = 'NSCP' and edition = '2015 (7th ed.)';\n`;
}
for (const c of cards) {
  const eid = randomUUID(), rid = randomUUID();
  sql += `insert into public.entries (id, module, title, slug, specialization_id, summary, status) select ${q(eid)}, 'practice', ${q(c.title)}, ${q(c.slug)}, id, ${q(c.summary)}, 'review' from public.specializations where slug = 'concrete';\n`;
  sql += `insert into public.entry_revisions (id, entry_id, rev_no, body, diagram, change_note, code_edition) values (${q(rid)}, ${q(eid)}, 1, ${j({ sections: c.sections })}, ${c.diagram ? j(c.diagram) : "null"}, 'Initial draft (v0.2.0): needs review', 'NSCP 2015');\n`;
  sql += `update public.entries set current_revision_id = ${q(rid)} where id = ${q(eid)};\n`;
  for (const [key, note] of c.refs) {
    const cl = clauses[key];
    sql += `insert into public.entry_clause_refs (entry_id, clause_id, note) values (${q(eid)}, ${q(cl.id)}, ${q(`${note} · ${cl.aci}`)});\n`;
  }
  for (const t of c.tags) sql += `insert into public.entry_tags (entry_id, tag_id) select ${q(eid)}, id from public.tags where slug = ${q(t)};\n`;
}
sql += `insert into public.releases (version, batch_name, notes_md, released_at) values ('v0.2.0','Diagram engine + Concrete Practices I', E'- SVG diagram engine: span, column and section renderers driven by JSON specs\\n- 12 Concrete Practice cards (splice zones, construction joints, cover, spacing, hooks, confinement, curing, testing) as drafts for review\\n- NSCP 2015 clause index: 11 clauses with ACI 318-14 equivalents\\n- Admin: Mark reviewed & publish button on each entry', now());\n`;
process.stdout.write(sql);
