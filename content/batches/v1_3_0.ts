// v1.3.0: Depth. More standards side by side (development & lap length, slab thickness & shrinkage steel,
// steel tension & compression members, measurement rules) + 5 finishing/roof estimators (in lib/calc/estimate2.ts).
// Brunei panels stay verified: false until Gemz checks them against his BS / SMM copies.
import type { Batch } from "../types";

const batch: Batch = {
  version: "v1.3.0",
  batch_name: "Depth: more side-by-side standards + finishing estimators",
  notes: [
    "Name: CEMP now stands for Construction Estimating and Management Platform; new logo (truss over a dimension line) and favicon",
    "5 new estimators: floor & wall tiles, painting, gypsum ceiling on metal furring, waterproofing with upturns, roof gutter & downspout (all add to the project BOM)",
    "Standards side by side on 6 more entries: development length & lap splice, slab lap zones, one-way slab thickness & shrinkage steel, steel tension members, steel columns, quantity takeoff measurement rules",
  ],
  clauses: [
    { doc: "BS 8110", section: "3.12.8", title: "Anchorage and lap lengths", summary: "Anchorage length from design bond stress (depends on bar type and concrete grade); laps at least the tension anchorage length, increased at top bars and corners, with a minimum length. Verify against your copy." },
    { doc: "BS 8110", section: "3.4.6", title: "Deflection: span/effective depth ratios", summary: "Basic span/effective depth ratios by support condition, modified for tension and compression steel; used instead of a fixed minimum thickness. Verify against your copy." },
    { doc: "BS 8110", section: "3.12.5", title: "Minimum and maximum areas of reinforcement", summary: "Minimum percentages of tension and secondary steel by steel grade and member type, and maximum steel areas. Verify against your copy." },
    { doc: "BS 5950", section: "4.6", title: "Tension members", summary: "Tension capacity from design strength and effective net area, with allowances for eccentric end connections (e.g. angles connected by one leg). Verify against your copy." },
    { doc: "BS 5950", section: "4.7", title: "Compression members", summary: "Compressive strength from slenderness using strut curves chosen by section type and buckling axis; slenderness limits. Verify against your copy." },
  ],
  entries: [],
  standards: [
    {
      slug: "tool-development-length-and-lap-splice",
      ph: { code: "NSCP 2015 §425.4.2 · §425.5.2", refs: "NSCP 425.4.2.3, 425.5.2.1", points: [
        "Simplified ℓd for deformed bars in tension: db ≤ 20 mm uses fy ψt ψe /(2.1 λ √f′c) × db; db ≥ 22 mm uses /(1.7 λ √f′c)",
        "ℓd not less than 300 mm",
        "Tension lap: Class B = 1.3 ℓd (the usual case); Class A = 1.0 ℓd only when steel provided ≥ 2× required and ≤ 50% of bars are spliced",
        "Top bars (more than 300 mm of fresh concrete below): ψt = 1.3",
      ] },
      bn: { code: "BS 8110-1:1997 cl. 3.12.8", refs: "BS 8110 3.12.8.3–3.12.8.13 (Table 3.27)", verified: false, points: [
        "Anchorage length from design bond stress, which depends on bar type and concrete grade; usually read as a multiple of bar size from a table (e.g. about 40φ for tension laps in grade 30 with high-yield bars)",
        "Lap length at least the tension anchorage length",
        "Increase laps at the top of members and at corners (×1.4, or ×2.0 where both apply)",
        "Minimum lap: 15φ or 300 mm, whichever is larger",
      ] },
      intl: { code: "ACI 318-19 §25.4.2 · §25.5.2", refs: "ACI 318-19 Table 25.4.2.3, 25.5.2.1", verified: false, points: [
        "Same simplified equations as NSCP 2015, plus a new grade factor ψg: 1.0 for Grade 420, 1.15 for Grade 550, 1.3 for Grade 690",
        "Class A / Class B lap rules unchanged",
      ] },
    },
    {
      slug: "lap-splice-zones-continuous-slabs",
      ph: { code: "NSCP 2015 §425.5 + detailing practice", refs: "NSCP 425.5.2; 407.7", points: [
        "Splice top bars near midspan (low negative moment), bottom bars over or near supports (low positive moment)",
        "Stagger laps where you can; lap length per Class B unless Class A conditions are met",
      ] },
      bn: { code: "BS 8110-1:1997 cl. 3.12.8 + 3.12.10", refs: "BS 8110 3.12.8.11–13, 3.12.10", verified: false, points: [
        "Same principle: lap away from high-stress zones and stagger laps",
        "Curtailment of slab bars follows the simplified rules (or the bending moment envelope) in the slab detailing clauses",
        "Lap length from the anchorage table, with the top-bar factor where relevant",
      ] },
      intl: { code: "ACI 318-19 §25.5 · §7.7", refs: "ACI 318-19 25.5.2, 7.7.3", points: [
        "Same approach as NSCP 2015 (ACI 318-14 base); lap length now includes the ψg grade factor through ℓd",
      ] },
    },
    {
      slug: "tool-one-way-slab-thickness-and-temperature-bars",
      ph: { code: "NSCP 2015 §407.3.1 · §424.4.3", refs: "NSCP Table 407.3.1.1; Table 424.4.3.2", points: [
        "Minimum h (fy 420, normal-weight concrete): simply supported ℓ/20, one end continuous ℓ/24, both ends continuous ℓ/28, cantilever ℓ/10",
        "For other fy multiply by (0.4 + fy/700)",
        "Shrinkage & temperature steel: 0.0020 bh for Grade 280/350 bars, 0.0018 bh for Grade 420",
        "Spacing of S&T bars ≤ 5h and ≤ 450 mm",
      ] },
      bn: { code: "BS 8110-1:1997 cl. 3.4.6 · 3.12.5", refs: "BS 8110 Table 3.9, 3.10; Table 3.25", verified: false, points: [
        "No fixed minimum thickness table: check deflection by span/effective depth ratio (basic ratios about 20 simply supported, 26 continuous, 7 cantilever), modified for steel stress",
        "Minimum steel in slabs: about 0.13% bh for high-yield bars (0.24% for mild steel)",
        "Maximum bar spacing in slabs also limited for crack control (3d or 750 mm, and the clear-spacing rules)",
      ] },
      intl: { code: "ACI 318-19 §7.3.1 · §24.4.3", refs: "ACI 318-19 Table 7.3.1.1; Table 24.4.3.2", verified: false, points: [
        "Same minimum thickness table as NSCP 2015",
        "Shrinkage & temperature steel simplified to 0.0018 bh for all deformed bar grades",
      ] },
    },
    {
      slug: "tool-steel-plate-tension",
      ph: { code: "NSCP 2015 §504 (= AISC 360-10 Ch. D)", refs: "NSCP 504.2, 504.3", points: [
        "Yielding on gross area: φPn = 0.90 Fy Ag",
        "Rupture on effective net area: φPn = 0.75 Fu Ae, with Ae = U An",
        "Preferred slenderness L/r ≤ 300 (not for rods)",
      ] },
      bn: { code: "BS 5950-1:2000 cl. 4.6", refs: "BS 5950 4.6.1–4.6.3; Table 9", verified: false, points: [
        "Pt = py Ae, with py from the design strength table (e.g. 275 MPa for S275 up to 16 mm thick)",
        "Effective net area Ae = Ke An but not more than Ag (Ke about 1.2 for S275, 1.1 for S355)",
        "Angles and channels connected through one leg or the web: reduced capacity rules apply",
        "Partial factor is built into py: no separate φ",
      ] },
      intl: { code: "AISC 360-22 Ch. D", refs: "AISC 360-22 D2, D3", points: [
        "Same yielding and rupture checks as AISC 360-10; the shear lag factor table (D3.1) was reorganised",
      ] },
    },
    {
      slug: "tool-steel-w-column-compression",
      ph: { code: "NSCP 2015 §505 (= AISC 360-10 E3)", refs: "NSCP 505.3", points: [
        "Fe = π²E/(KL/r)²",
        "KL/r ≤ 4.71√(E/Fy): Fcr = 0.658^(Fy/Fe) Fy; otherwise Fcr = 0.877 Fe",
        "φPn = 0.90 Fcr Ag; keep KL/r ≤ 200",
      ] },
      bn: { code: "BS 5950-1:2000 cl. 4.7", refs: "BS 5950 4.7.4, 4.7.5; Tables 23–24", verified: false, points: [
        "Pc = Ag pc, with pc read from the strut curve (a, b, c or d) chosen by section type and buckling axis",
        "Slenderness λ = LE / r, with effective length LE from end restraint tables",
        "λ limit about 180 for members carrying dead and imposed load",
      ] },
      intl: { code: "AISC 360-22 §E3", refs: "AISC 360-22 E3", points: [
        "Same equations; the code now writes effective length as Lc instead of KL",
      ] },
    },
    {
      slug: "qs-takeoff-workflow",
      ph: { code: "DPWH pay items · detailed estimate", refs: "DPWH Blue Book item units; DPWH detailed unit price analysis", points: [
        "Measure net quantities per pay item and its unit (m³ concrete, kg rebar, m² formwork, etc.)",
        "Waste, laps and wastage are priced in the unit cost analysis, not added to the measured quantity",
        "Group by item number so the BOQ matches the program of work",
      ] },
      bn: { code: "SMM2 (Brunei BQ practice)", refs: "SMM2 general rules and work sections", verified: false, points: [
        "Measure net in place to the SMM rules for each work section; the contractor prices waste in the rate",
        "Items carry the description and units set by SMM2 (with preambles and preliminaries sections)",
        "Check the tender's measurement clause: some Brunei jobs adopt another method (e.g. NRM2 or a client-specific method)",
      ] },
      intl: { code: "RICS NRM2 · CESMM4", refs: "NRM2 (building); CESMM4 (civil)", verified: false, points: [
        "NRM2 replaced SMM7 in the UK for building works; CESMM4 is used for civil engineering works",
        "Both measure net quantities with standard descriptions; quantities exclude waste",
      ] },
    },
  ],
};

export default batch;
