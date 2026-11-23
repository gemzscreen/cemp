// v1.2.0: Standards side by side. PH (NSCP 2015 / DPWH) · Brunei (BS 8110 / BS 5950, SMM2) · International (ACI 318-19 / AISC 360-22).
// Panels are short summaries in our own words. Every Brunei panel is verified: false until checked against Gemz's BS copies.
import type { Batch } from "../types";

const BN_NOTE = "BS 8110 and BS 5950 were withdrawn in the UK (2010, replaced by Eurocodes) but remain in common use on Brunei projects. Check the project specification for which standard governs.";

const batch: Batch = {
  version: "v1.2.0",
  batch_name: "Standards side by side",
  documents: [
    { short_name: "BS 8110", title: "Structural use of concrete. Part 1: Code of practice for design and construction", edition: "8110-1:1997", publisher: "BSI", year: 1997, jurisdiction: "BN", status: "reference", notes: BN_NOTE },
    { short_name: "BS 5950", title: "Structural use of steelwork in building. Part 1: Code of practice for design, rolled and welded sections", edition: "5950-1:2000", publisher: "BSI", year: 2000, jurisdiction: "BN", status: "reference", notes: BN_NOTE },
    { short_name: "SMM2", title: "Standard Method of Measurement (2nd ed.), as used for Brunei bills of quantities", edition: "2nd ed.", jurisdiction: "BN", status: "reference", notes: "Measurement rules for BQ preparation on Brunei jobs. Edition and publisher to be confirmed from the tender documents." },
  ],
  notes: [
    "Standards side by side: entries can show PH, Brunei and International panels next to each other; your home standard (Profile) is shown first",
    "Panels on 8 entries: concrete cover, bar spacing, hooks and bends, curing, strength sampling and acceptance, column confinement zone, bolt holes and edge distance, fillet weld sizes",
    "BS 8110-1:1997, BS 5950-1:2000 and SMM2 added as Brunei reference documents with a small clause index (marked to verify)",
    "Merged duplicate: concrete testing plan no longer repeats the sampling frequency rules; they live in Concrete strength sampling and acceptance",
  ],
  clauses: [
    { doc: "BS 8110", section: "3.3", title: "Concrete cover to reinforcement", summary: "Nominal cover set by exposure condition, concrete grade/w-c ratio and fire resistance; larger cover when cast against earth or blinding. Verify the tables against your copy." },
    { doc: "BS 8110", section: "3.12.7", title: "Containment of compression reinforcement", summary: "Link size and spacing that hold compression bars in columns and beams: link diameter related to the largest bar, spacing related to the smallest compression bar. Verify against your copy." },
    { doc: "BS 8110", section: "3.12.11", title: "Spacing of reinforcement", summary: "Minimum clear distance between bars tied to the maximum aggregate size; maximum spacing in tension zones for crack control, depending on steel grade and moment redistribution. Verify against your copy." },
    { doc: "BS 8110", section: "6.2.3", title: "Curing and protection", summary: "Minimum curing periods depending on cement type, ambient conditions and temperature, and methods to keep the surface moist. Verify against your copy." },
    { doc: "BS 5950", section: "6.2", title: "Spacing and edge distances of bolts", summary: "Minimum and maximum bolt spacing and minimum edge/end distances, which depend on how the plate edge was cut. Verify against your copy." },
    { doc: "BS 5950", section: "6.8", title: "Welded connections: fillet welds", summary: "Effective length, end returns and design strength of fillet welds. Verify against your copy." },
  ],
  entries: [
    {
      slug: "concrete-testing-plan",
      module: "practice",
      title: "Concrete testing plan on site",
      summary: "Who samples, what is recorded, and what to do with low results.",
      specialization: "qa-qc",
      tags: ["concreting", "inspection", "curing"],
      refs: [{ section: "426.12" }, { section: "426.5.3" }, { doc: "DPWH Blue Book", section: "Item 405" }],
      sections: [
        { kind: "list", heading: "Each sample", items: ["Taken at the point of discharge from a randomly chosen batch", "Slump and concrete temperature recorded with the sample", "Cylinders molded, labeled (date, member, truck, class) and kept undisturbed in the first 24 h", "Moved to standard moist curing; never cured beside the structure unless they are field-cured extras", "Tested at 7 days (indicative) and 28 days (acceptance)"] },
        { kind: "text", heading: "Frequency and acceptance", text: "How many sets to take, and when results pass, are kept in one place: see the card 'Concrete strength sampling and acceptance' (NSCP rules and DPWH practice, with PH, Brunei and international side by side)." },
        { kind: "avoid", heading: "Avoid", items: ["Sampling only the first truck", "Leaving cylinders in the sun or moving them while fresh", "Accepting by 7-day results alone", "Adding water to trucks after sampling"] },
        { kind: "text", heading: "Low results", text: "Check sampling and lab procedures first. If the acceptance criteria are not met, take cores from the area represented and refer the evaluation to the structural engineer of record." },
      ],
    },
  ],
  standards: [
    {
      slug: "concrete-cover-cast-in-place",
      ph: { code: "NSCP 2015 §420.6.1.3", refs: "NSCP 420.6.1.3.1", points: [
        "Cast against and permanently in contact with earth: 75 mm",
        "Exposed to weather or earth: 50 mm (20–57 mm bars), 40 mm (16 mm bars and smaller)",
        "Not exposed, slabs/walls/joists: 20 mm (36 mm bars and smaller)",
        "Not exposed, beams/columns: 40 mm to stirrups, ties or spirals",
      ] },
      bn: { code: "BS 8110-1:1997 cl. 3.3", refs: "BS 8110 3.3 (Tables 3.3 and 3.4)", verified: false, points: [
        "Nominal cover chosen from the exposure class (mild, moderate, severe, very severe, most severe) together with the concrete grade and w/c ratio",
        "Fire resistance can govern: check the cover table for the required fire period",
        "Cast directly against earth: 75 mm; against blinding: 40 mm",
        "Cover is to all steel, including links",
      ] },
      intl: { code: "ACI 318-19 §20.5.1.3", refs: "ACI 318-19 Table 20.5.1.3.1", points: [
        "Same values as NSCP 2015 for cast-in-place nonprestressed concrete (75 / 50 / 40 / 20 / 40 mm)",
        "Durability (exposure classes, Ch. 19) may require more",
      ] },
    },
    {
      slug: "minimum-clear-spacing-of-bars",
      ph: { code: "NSCP 2015 §425.2", refs: "NSCP 425.2.1, 425.2.3", points: [
        "Beams/slabs, parallel bars in a layer: at least the largest of 25 mm, db and 4/3 × max aggregate size",
        "Layers: upper bars directly above lower bars, at least 25 mm clear between layers",
        "Columns: at least the largest of 40 mm, 1.5 db and 4/3 × max aggregate size",
      ] },
      bn: { code: "BS 8110-1:1997 cl. 3.12.11", refs: "BS 8110 3.12.11.1, 3.12.11.2 (Table 3.28)", verified: false, points: [
        "Minimum horizontal clear gap: max aggregate size + 5 mm",
        "Minimum vertical clear gap between layers: 2/3 × max aggregate size",
        "Where bar size exceeds aggregate size + 5 mm, gap not less than the bar size",
        "Maximum clear spacing in tension zones for crack control depends on steel grade and redistribution (e.g. about 160 mm for fy 460, no redistribution)",
      ] },
      intl: { code: "ACI 318-19 §25.2", refs: "ACI 318-19 25.2.1, 25.2.3", points: [
        "Same minimums as NSCP 2015: 25 mm / db / 4/3 dagg (beams), 40 mm / 1.5 db / 4/3 dagg (columns)",
      ] },
    },
    {
      slug: "standard-hooks-and-bend-diameters",
      ph: { code: "NSCP 2015 §425.3", refs: "NSCP 425.3.1, 425.3.2", points: [
        "90° hook: 12 db extension; 180° hook: 4 db but not less than 65 mm",
        "Minimum inside bend diameter, main bars: 6 db (10–25 mm), 8 db (28–36 mm)",
        "Stirrups/ties 16 mm and smaller: 4 db inside bend diameter",
        "Seismic hook (hoops, crossties): 135°, extension 6 db but not less than 75 mm",
      ] },
      bn: { code: "BS 8110-1:1997 cl. 3.12.8 + BS 8666", refs: "BS 8110 3.12.8.22–23; BS 8666 bending dimensions", verified: false, points: [
        "Bars are scheduled and bent to BS 8666 shape codes",
        "Minimum former diameter depends on bar size (about 4d for bars up to 16 mm, 7d for 20 mm and larger, grade B500)",
        "A hook or bend adds anchorage equal to a set multiple of bar size (no separate seismic hook rule in BS 8110)",
        "Links anchored around a bar with a hook or bend; no 135° seismic hook requirement unless the spec calls for it",
      ] },
      intl: { code: "ACI 318-19 §25.3", refs: "ACI 318-19 25.3.1, 25.3.2, 25.4.3", verified: false, points: [
        "Hook geometry and bend diameters essentially unchanged from ACI 318-14",
        "Development length of hooked bars (25.4.3) uses a revised equation with confinement and spacing factors: expect different ℓdh than NSCP 2015",
      ] },
    },
    {
      slug: "curing-of-concrete",
      ph: { code: "NSCP 2015 §426.5.3 · DPWH Item 405", refs: "NSCP 426.5.3; DPWH Item 405", points: [
        "Normal concrete: keep moist at least 7 days after placing",
        "High-early-strength concrete: at least 3 days",
        "DPWH: cure per Item 405 and the approved method (wet burlap, ponding, curing compound)",
      ] },
      bn: { code: "BS 8110-1:1997 cl. 6.2.3", refs: "BS 8110 6.2.3 (Table 6.1)", verified: false, points: [
        "Minimum curing period depends on cement type, ambient conditions and surface temperature",
        "Hot, dry or windy conditions need longer curing; Brunei's hot humid climate still calls for early protection from sun and wind",
        "Many Brunei specs now reference BS EN 13670 curing classes: check the project spec",
      ] },
      intl: { code: "ACI 318-19 §26.5.3 · ACI 308", refs: "ACI 318-19 26.5.3; ACI 308R", points: [
        "Same minimums as NSCP: 7 days normal, 3 days high-early-strength",
        "ACI 308 gives curing methods and alternatives based on reaching a strength or maturity target",
      ] },
    },
    {
      slug: "concrete-strength-sampling-and-acceptance",
      ph: { code: "NSCP 2015 §426.12 · DPWH Item 405", refs: "NSCP 426.12.2, 426.12.3", points: [
        "Sample each class at least once a day, once per 110 m³ and once per 460 m² of slab or wall surface",
        "DPWH practice: 1 set of 3 cylinders per 75 m³ or fraction of each day's pour; use the larger count when both apply",
        "Pass: every average of 3 consecutive tests ≥ f′c, and no single test below f′c − 3.5 MPa (f′c ≤ 35 MPa) or 0.90 f′c (f′c > 35 MPa)",
        "One test = average of 2 cylinders 150 × 300 mm or 3 cylinders 100 × 200 mm at 28 days",
      ] },
      bn: { code: "BS 8110 → BS 8500 / BS EN 206 conformity", refs: "BS 8110 6.1.5; BS EN 206 conformity criteria", verified: false, points: [
        "Strength is specified and tested on 150 mm cubes (e.g. grade 30 = 30 MPa cube), not cylinders",
        "Conformity is checked on groups of results: group mean must exceed the characteristic strength by a margin, and no single result may fall more than a set amount below it",
        "Sampling rate is set by the project spec or ready-mix supplier's production control: confirm with the consultant",
        "Convert carefully: cube strength is roughly 1.2–1.25 × cylinder strength for normal grades",
      ] },
      intl: { code: "ACI 318-19 §26.12", refs: "ACI 318-19 26.12.2, 26.12.3", points: [
        "Same sampling frequency and acceptance criteria as NSCP 2015",
      ] },
    },
    {
      slug: "column-confinement-zone-lo",
      ph: { code: "NSCP 2015 §418.7.5", refs: "NSCP 418.7.5.1, 418.7.5.3", points: [
        "lo = largest of column depth h, clear height/6 and 450 mm",
        "Hoop spacing in lo = smallest of b/4, 6 × smallest longitudinal bar, and so (100 to 150 mm)",
      ] },
      bn: { code: "BS 8110-1:1997 cl. 3.12.7", refs: "BS 8110 3.12.7.1", verified: false, points: [
        "BS 8110 has no seismic confinement zone: Brunei is generally treated as low seismicity",
        "Links: diameter at least 1/4 of the largest compression bar, spacing not more than 12 × the smallest compression bar",
        "If the client asks for seismic design, the project will name another standard (e.g. Eurocode 8): follow that",
      ] },
      intl: { code: "ACI 318-19 §18.7.5", refs: "ACI 318-19 18.7.5.1, 18.7.5.3", points: [
        "lo same as NSCP 2015 (h, clear height/6, 450 mm)",
        "Spacing limit now depends on bar grade: 6 db for Grade 420, 5 db for Grade 550 (new in 318-19)",
        "High axial load or high concrete strength adds crosstie and confinement requirements",
      ] },
    },
    {
      slug: "bolt-holes-spacing-edge-distance",
      ph: { code: "NSCP 2015 §510.3 (= AISC 360-10 J3)", refs: "NSCP 510.3.2–510.3.4", points: [
        "Standard holes: M16 18, M20 22, M22 24, M24 27, M27 30, M30 33 mm",
        "Spacing between holes: at least 2⅔ d, preferably 3 d",
        "Minimum edge distance from the hole center per the table (e.g. about 26 mm for M20)",
      ] },
      bn: { code: "BS 5950-1:2000 cl. 6.2", refs: "BS 5950 6.2.1–6.2.3; Table 33", verified: false, points: [
        "Clearance holes: d + 2 mm up to M24, d + 3 mm above M24",
        "Minimum spacing: 2.5 × bolt diameter",
        "Minimum edge/end distance from hole center: about 1.25 × hole diameter for rolled, machine-cut or planed edges, about 1.40 × for sheared or hand-flame-cut edges",
      ] },
      intl: { code: "AISC 360-22 §J3", refs: "AISC 360-22 J3.2–J3.4", verified: false, points: [
        "Same metric hole sizes and 2⅔ d / 3 d spacing as AISC 360-10",
        "Minimum edge distance table was simplified (no separate sheared-edge column since 360-16)",
      ] },
    },
    {
      slug: "fillet-weld-size-rules",
      ph: { code: "NSCP 2015 §510.2.2 (= AISC 360-10 J2.2)", refs: "NSCP 510.2.2b", points: [
        "Minimum leg by thinner part joined: up to 6 mm → 3 mm; over 6 to 13 → 5 mm; over 13 to 19 → 6 mm; over 19 → 8 mm",
        "Maximum along an edge: thickness (t < 6 mm), t − 2 mm (t ≥ 6 mm)",
        "Minimum length 4 × leg size",
      ] },
      bn: { code: "BS 5950-1:2000 cl. 6.8", refs: "BS 5950 6.8.2, 6.8.5", verified: false, points: [
        "Effective length = run length minus one leg size at each end not returned",
        "Minimum effective length: 4 × leg size or 40 mm, whichever is larger",
        "Continue welds around corners as end returns of about 2 × leg length",
        "No minimum-leg-by-thickness table in BS 5950: follow BS EN 1011 / the project welding spec",
      ] },
      intl: { code: "AISC 360-22 §J2.2", refs: "AISC 360-22 J2.2b", points: [
        "Same minimum leg table, maximum leg and 4 × leg minimum length as AISC 360-10",
      ] },
    },
  ],
};

export default batch;
