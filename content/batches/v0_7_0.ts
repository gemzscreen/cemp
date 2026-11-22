import type { Batch, BatchEntry, Card, Section } from "../types";
import { CALCS, defaults, type Inputs } from "../../lib/calc";

/* Worked problems are generated from the shared calc library, so the published answer always
 * equals what the calculator returns (and the v0.8.0 API can serve the same problem). */
function problem(heading: string, statement: string, calcKey: string, inputs: Inputs, tool: string, find: string): Section {
  const c = CALCS[calcKey];
  if (!c) throw new Error(`v0.7.0: unknown calc ${calcKey}`);
  const all = { ...defaults(c), ...inputs };
  const out = c.compute(all);
  const given = c.fields.filter((f) => f.type !== "text" && f.key in inputs).map((f) => {
    const v = all[f.key];
    const shown = f.type === "select" ? f.options.find((o) => o.value === String(v))?.label ?? String(v) : `${v}${f.unit ? ` ${f.unit}` : ""}`;
    return `${f.label} = ${shown}`;
  });
  c.fields.filter((f) => f.type === "text" && f.key in inputs).forEach((f) => given.push(`${f.label}: ${String(all[f.key]).split("\n").join(" / ")}`));
  return {
    kind: "problem", heading,
    problem: { statement, given, find, steps: out.steps, tool,
      answer: out.results.filter((x) => x.main).map((x) => `${x.label} = ${x.value}${x.unit ? ` ${x.unit}` : ""}`) },
  };
}
const deck = (heading: string, cards: [string, string][]): Section => ({ kind: "cards", heading, cards: cards.map(([q, a]): Card => ({ q, a })) });
const VERIFY_SEA = "Compiled from public sources (EU Eurocodes portal, BCA Singapore, Brunei MOD/ABCi pages) and site practice. Requirements change: confirm against the project specification and the local authority before relying on any cell.";

const batch: Batch = {
  version: "v0.7.0",
  batch_name: "Education: CELE + PH ↔ Global",
  notes: [
    "CELE overview for the 2026 format (PSAD on Day 1; AMSTHC and HGE on Day 2) and outlines for all three subjects, each linked to the CEMP tools that drill it",
    "4 flashcard decks (68 cards): reinforced concrete, structural steel, hydraulics & geotechnical, CM/QS/safety",
    "10 worked board-type problems generated from the calc library, so the answers always match the tools; each links to its calculator",
    "New HGE calculators: hydrostatic force on a plane gate, primary consolidation settlement (NC/OC)",
    "PH ↔ Global: NSCP 2015 vs its US source codes, PH vs Brunei/Singapore/Malaysia practice, cylinder vs cube strength, site terminology for OFW engineers",
    "New section kinds: comparison tables, flashcards and worked problems; sections can carry a 'verify' badge",
  ],
  clauses: [],
  entries: [],
};
const E = (e: Omit<BatchEntry, "module">): BatchEntry => ({ module: "education", ...e });
const tool = (use: string, limits: string[]): Section[] => [
  { kind: "text", heading: "When to use", text: use },
  { kind: "avoid", heading: "Limitations", items: limits },
];

/* ---------- new HGE tools ---------- */
batch.entries.push(
  { slug: "tool-hydrostatic-plane-surface", module: "tool", calc_key: "hydrostatic-plane-surface", specialization: "cele", code_edition: "n/a (fluid mechanics)",
    title: "Hydrostatic force on a rectangular gate", summary: "Vertical or inclined gate → total force, depth to centroid and center of pressure.",
    tags: ["wall"], refs: [],
    sections: tool("CELE hydrostatics problems; quick checks of gates, tank walls and retaining walls holding water.",
      ["Rectangular plane surfaces only (no curved surfaces or other shapes)", "Liquid on one side, open to the atmosphere", "Gate weight, hinges and reactions are not computed"]) },
  { slug: "tool-consolidation-settlement", module: "tool", calc_key: "consolidation-settlement", specialization: "cele", code_edition: "n/a (soil mechanics)",
    title: "Primary consolidation settlement (NC / OC clay)", summary: "Cc, Cs, e0, σ'0, Δσ and σ'c → settlement of a clay layer.",
    tags: ["footing"], refs: [],
    sections: tool("CELE settlement problems; first estimate of footing or fill settlement on clay.",
      ["One layer using mid-depth stresses; split thick layers", "Δσ must be computed separately (2:1 method, Boussinesq)", "Primary consolidation only; time rate and secondary compression excluded"]) },
);

/* ---------- CELE ---------- */
batch.entries.push(
  E({ slug: "cele-exam-overview", specialization: "cele",
    title: "CELE at a glance (2026 format)", summary: "Subjects, weights, schedule and passing rule of the Civil Engineers Licensure Examination.",
    tags: [], refs: [],
    sections: [
      { kind: "table", heading: "Subjects (PRC program, September 2026)", columns: ["Day / time", "Subject", "Weight"], rows: [
        ["Day 1, 8:00–14:00", "Principles of Structural Analysis and Design (PSAD)", "35%"],
        ["Day 2, 8:00–13:00", "Applied Mathematics, Surveying, Transportation & Highway Engineering, Construction Management & Methods (AMSTHC)", "35%"],
        ["Day 2, 14:00–18:00", "Hydraulics and Principles of Geotechnical Engineering (HGE)", "30%"],
      ] },
      { kind: "list", heading: "Passing rule", items: ["Weighted general average of at least 70%", "No subject rating below 50%", "Conditional/removal rules: check the PRC Board of Civil Engineering resolutions in force"] },
      { kind: "safe", heading: "Preparation that pays", items: ["Balance all three: each is about a third of the grade", "Drill PSAD and HGE problems by type; speed matters in a 5–6 hour paper", "Know the approved non-programmable calculator list and its functions", "Use the CEMP calculators to check your hand solutions, not to replace them"] },
      { kind: "text", heading: "Note", text: "Schedule and weights from the PRC exam program for September 2026. Subject order and times can change per exam; always read the program for your exam date." },
    ] }),
  E({ slug: "cele-outline-psad", specialization: "cele",
    title: "CELE outline: Structural Analysis & Design (PSAD)", summary: "Topics, must-know formulas and which CEMP tools to practice with.",
    tags: ["beam", "column", "footing", "connection"], refs: [],
    sections: [
      { kind: "list", heading: "Topics", items: ["Engineering mechanics: statics, friction, centroids, moments of inertia", "Strength of materials: stress/strain, torsion, beam stresses, deflection, combined stresses", "Theory of structures: determinate and indeterminate beams and frames, influence lines, trusses", "Reinforced concrete: beams (singly/doubly, T-beams), slabs, columns, footings, development and splices", "Prestressed concrete beams: stresses at transfer and service", "Steel: tension members, beams (LTB), columns, bolted and welded connections", "Construction materials and testing", "Governing codes: NSCP 2015 (concrete Ch. 4, steel Ch. 5, loads Ch. 2)"] },
      { kind: "table", heading: "Practice with CEMP", columns: ["Topic", "Tool"], rows: [
        ["Beam capacity", "Rectangular beam: flexural capacity φMn"], ["Beam design", "Rectangular beam: required tension steel"],
        ["Development & laps", "Development length & tension lap splice; hooked bars"], ["Columns", "Column: maximum axial strength; W-shape compression"],
        ["Slabs", "One-way slab: minimum thickness & temperature bars"], ["Steel", "Plate tension, W-beam flexure, bolt groups, fillet welds"],
      ] },
      { kind: "avoid", heading: "Common exam traps", items: ["Forgetting φ changes in the transition zone (εt between εy and 0.005)", "Using gross instead of net area for tension rupture", "Using β1 = 0.85 for f'c above 28 MPa", "Mixing kN·m and N·mm in one line"] },
    ] }),
  E({ slug: "cele-outline-amsthc", specialization: "cele",
    title: "CELE outline: Math, Surveying, Transpo & CM (AMSTHC)", summary: "Topics, must-know formulas and which CEMP tools to practice with.",
    tags: ["estimating", "scheduling", "safety"], refs: [],
    sections: [
      { kind: "list", heading: "Topics", items: ["Calculus, differential equations, engineering data analysis, numerical methods", "Physics for engineers; engineering economics", "Construction surveying and layout; leveling, traversing, areas and volumes", "Highway engineering: geometric design, curves, sight distance, pavements", "Transportation engineering: traffic flow, capacity, parking", "Construction materials; quantity surveying", "Construction management: planning, scheduling (CPM/PERT), cost, equipment and methods", "Construction occupational safety and health (incl. RA 11058)"] },
      { kind: "table", heading: "Practice with CEMP", columns: ["Topic", "Tool / card"], rows: [
        ["Scheduling", "PERT / CPM schedule"], ["Estimating", "Cost estimate build-up"], ["QS", "Concrete materials takeoff; rebar weight takeoff"],
        ["Safety", "OSH personnel; injury rates; JHA; RA 11058 in one page"], ["Unit work", "Conversions module"],
      ] },
      { kind: "avoid", heading: "Common exam traps", items: ["Using arithmetic instead of geometric gradient formulas in economics", "Station vs distance confusion in horizontal curves", "PERT: summing variances off the critical path"] },
    ] }),
  E({ slug: "cele-outline-hge", specialization: "cele",
    title: "CELE outline: Hydraulics & Geotechnical (HGE)", summary: "Topics, must-know formulas and which CEMP tools to practice with.",
    tags: ["footing", "wall"], refs: [],
    sections: [
      { kind: "list", heading: "Hydraulics topics", items: ["Fluid properties; hydrostatics: pressure, forces on plane and curved surfaces", "Buoyancy and flotation, stability (metacentric height)", "Relative equilibrium: linear acceleration and rotation", "Fluid flow, Bernoulli, energy and momentum; pipe flow and losses", "Hydrodynamics: orifices, weirs, open channels", "Water supply"] },
      { kind: "list", heading: "Geotechnical topics", items: ["Soil properties and phase relations; classification (USCS, AASHTO)", "Flow through soil: permeability, flow nets, seepage", "Stresses in soil mass: effective stress, Boussinesq, 2:1", "Shear strength and tests (direct shear, triaxial)", "Bearing capacity; compaction", "Consolidation and settlement", "Lateral earth pressure (Rankine, Coulomb); slope stability"] },
      { kind: "table", heading: "Practice with CEMP", columns: ["Topic", "Tool"], rows: [["Hydrostatics", "Hydrostatic force on a rectangular gate"], ["Settlement", "Primary consolidation settlement"], ["Units", "Conversions: pressure, unit weight, flow"]] },
      { kind: "avoid", heading: "Common exam traps", items: ["Using total instead of effective stress below the water table", "Center of pressure measured along the inclined plane, not vertically", "log vs ln in consolidation (it is log base 10)"] },
    ] }),
);

/* ---------- flashcards ---------- */
batch.entries.push(
  E({ slug: "flashcards-reinforced-concrete", specialization: "cele",
    title: "Flashcards: reinforced concrete (NSCP 2015)", summary: "18 cards on strength factors, limits, detailing and acceptance.",
    tags: ["beam", "column", "slab", "rebar"], refs: [],
    sections: [deck("Reinforced concrete", [
      ["β1 for f'c ≤ 28 MPa?", "0.85. It drops 0.05 for each 7 MPa above 28, down to a minimum of 0.65."],
      ["φ for a tension-controlled section?", "0.90"],
      ["φ for compression-controlled: tied vs spiral?", "0.65 tied, 0.75 spiral"],
      ["φ for shear and torsion?", "0.75"],
      ["Net tensile strain for tension-controlled?", "εt ≥ 0.005"],
      ["Minimum εt for a non-prestressed beam?", "0.004"],
      ["As,min for beams?", "The larger of 0.25√f'c/fy and 1.4/fy, times bw·d"],
      ["One-way slab hmin, both ends continuous (fy 420)?", "ℓ/28 (simply supported ℓ/20, one end continuous ℓ/24, cantilever ℓ/10). For other fy multiply by 0.4 + fy/700."],
      ["Shrinkage and temperature ρ for Grade 420 bars?", "0.0018 of the gross area, spaced at most 5h or 450 mm"],
      ["Allowed range of column ρg?", "1% to 8% (keep about 4% or less where bars are lapped)"],
      ["φPn,max for tied and spiral columns?", "Tied: 0.80 φPo; spiral: 0.85 φPo"],
      ["Class B tension lap length?", "1.3 ld, and not less than 300 mm"],
      ["Minimum tension development length ld?", "300 mm"],
      ["Top-bar factor ψt applies when…", "More than 300 mm of fresh concrete is cast below the bar: ψt = 1.3"],
      ["Tail of a 90° standard hook?", "12 db"],
      ["Tail of a 180° standard hook?", "4 db, but at least 65 mm"],
      ["Strength acceptance criteria?", "Every average of 3 consecutive tests ≥ f'c, and no single test below f'c − 3.5 MPa (f'c ≤ 35 MPa) or 0.9 f'c (f'c > 35)"],
      ["Strength-test sampling frequency?", "Per class: at least once a day, once per 110 m³ and once per 460 m² of slab or wall surface"],
    ])] }),
  E({ slug: "flashcards-structural-steel", specialization: "cele",
    title: "Flashcards: structural steel (NSCP Ch. 5 / AISC 360)", summary: "16 cards on resistance factors, slenderness, buckling and connections.",
    tags: ["beam", "column", "connection"], refs: [],
    sections: [deck("Structural steel", [
      ["φ for tension yielding / tension rupture?", "0.90 yielding on the gross area; 0.75 rupture on the effective net area"],
      ["φ for compression and for flexure?", "0.90 for both"],
      ["φv for webs of most rolled I-shapes?", "1.00 when h/tw ≤ 2.24√(E/Fy); otherwise 0.90"],
      ["Elastic buckling stress Fe?", "Fe = π²E / (KL/r)²"],
      ["Fcr when KL/r ≤ 4.71√(E/Fy)?", "Fcr = 0.658^(Fy/Fe) × Fy (inelastic buckling)"],
      ["Fcr when KL/r > 4.71√(E/Fy)?", "Fcr = 0.877 Fe (elastic buckling)"],
      ["Recommended slenderness limits?", "KL/r ≤ 200 for compression members; L/r ≤ 300 preferred for tension members"],
      ["Modulus of elasticity of steel?", "E = 200,000 MPa"],
      ["Net area: hole width to deduct for an M20 bolt in a standard hole?", "Standard hole 22 mm plus 2 mm for damage: deduct 24 mm"],
      ["Effective net area?", "Ae = U × An, with U the shear-lag factor"],
      ["Lp for LTB of compact I-shapes?", "Lp = 1.76 ry √(E/Fy). For Lb ≤ Lp the section reaches Mp."],
      ["Mp?", "Mp = Fy × Zx (plastic modulus)"],
      ["Fillet weld nominal stress?", "Fnw = 0.60 FEXX, φ = 0.75"],
      ["Effective throat of an equal-leg fillet weld?", "0.707 × leg size"],
      ["φ for bolt shear and bearing?", "0.75"],
      ["Block shear checks…", "Shear yield or rupture on the shear plane plus tension rupture on the tension plane, whichever combination is smaller"],
    ])] }),
  E({ slug: "flashcards-hydraulics-geotech", specialization: "cele",
    title: "Flashcards: hydraulics & geotechnical", summary: "18 cards on hydrostatics, flow, soil relations, bearing and earth pressure.",
    tags: ["footing", "wall"], refs: [],
    sections: [deck("Hydraulics & geotechnical", [
      ["Total force on a submerged plane surface?", "F = γ hc A (hc = depth to the centroid)"],
      ["Center of pressure (along the plane)?", "ycp = ȳ + Ig / (ȳ A)"],
      ["Buoyant force?", "Weight of the displaced fluid: BF = γ V displaced"],
      ["Stable floating body when…", "The metacenter is above the center of gravity (GM > 0)"],
      ["Bernoulli between two points (no losses)?", "p/γ + v²/2g + z is constant"],
      ["Darcy–Weisbach head loss?", "hf = f (L/D) v²/2g"],
      ["Manning's equation (SI)?", "v = (1/n) R^(2/3) S^(1/2)"],
      ["Theoretical velocity from an orifice?", "v = √(2gh) (Torricelli)"],
      ["Porosity from void ratio?", "n = e / (1 + e)"],
      ["Moist unit weight from Gs, e, S?", "γ = (Gs + S·e) γw / (1 + e)"],
      ["Plasticity index?", "PI = LL − PL"],
      ["Darcy's law?", "v = k i; Q = k i A"],
      ["Effective stress?", "σ' = σ − u"],
      ["Rankine active coefficient?", "Ka = (1 − sin φ) / (1 + sin φ) = tan²(45° − φ/2)"],
      ["Terzaghi ultimate bearing capacity, strip footing?", "qult = c Nc + q Nq + 0.5 γ B Nγ"],
      ["Primary settlement of NC clay?", "S = Cc H/(1 + e0) × log(σ'f/σ'0)"],
      ["Overconsolidation ratio?", "OCR = σ'c / σ'0"],
      ["Relative compaction?", "Field dry density ÷ maximum dry density from the lab compaction test"],
    ])] }),
  E({ slug: "flashcards-cm-qs-safety", specialization: "cele",
    title: "Flashcards: CM, QS & construction safety", summary: "16 cards on scheduling, estimating, DPWH items and RA 11058.",
    tags: ["scheduling", "estimating", "safety"], refs: [],
    sections: [deck("CM, QS & safety", [
      ["PERT expected time?", "te = (a + 4m + b) / 6"],
      ["PERT activity variance?", "((b − a) / 6)²"],
      ["Total float?", "TF = LS − ES = LF − EF"],
      ["Critical path?", "The longest path through the network; its activities have zero total float"],
      ["Probability of finishing by T?", "z = (T − Te)/σ, with σ from the sum of critical-path variances; read P from the normal table"],
      ["Rebar unit mass?", "kg/m = d² / 162.2 (d in mm)"],
      ["DPWH Class A concrete: cement content and strength?", "About 360 kg/m³ (9 bags of 40 kg) and 20.7 MPa at 28 days"],
      ["DPWH payment basis for rebar (Item 404)?", "Computed mass of steel placed as shown; laps added for the contractor's convenience are not paid"],
      ["DPWH payment basis for structural concrete (Item 405)?", "Volume to the neat dimensions shown on the plans"],
      ["Typical DPWH cylinder sampling?", "1 set of 3 cylinders per 75 m³ or fraction of each day's pour"],
      ["VAT rate applied in PH estimates?", "12%"],
      ["Workers' rights under RA 11058?", "To know hazards, to refuse unsafe work under imminent danger, to report accidents, and to free PPE"],
      ["Minimum SO for a construction site with 30 workers?", "One SO3 (high risk, 10–50 workers)"],
      ["Mandatory course for a construction SO2?", "40-hour COSH"],
      ["Frequency rate?", "Disabling injuries × 1,000,000 / man-hours"],
      ["Hierarchy of controls?", "Elimination, substitution, engineering, administrative, PPE"],
    ])] }),
);

/* ---------- worked problems ---------- */
batch.entries.push(
  E({ slug: "problems-psad", specialization: "cele",
    title: "Worked problems: structural analysis & design", summary: "5 board-type problems (RC beams, laps, columns, steel tension) with full solutions.",
    tags: ["beam", "column", "rebar", "connection"], refs: [],
    sections: [
      problem("1. Capacity of a singly reinforced beam", "A rectangular beam is reinforced with 3–25 mm bars in tension. Determine its design flexural strength.",
        "beam-flexure-analysis", { b: 300, d: 500, nbars: 3, db: 25, fc: 28, fy: 415 }, "tool-beam-flexural-capacity", "φMn and whether the section is tension-controlled"),
      problem("2. Required steel for a factored moment", "Design the tension steel of a rectangular beam for Mu = 220 kN·m using 25 mm bars.",
        "beam-flexure-design", { mu: 220, b: 300, d: 500, fc: 28, fy: 415, db: 25 }, "tool-beam-required-steel", "Required As and the number of 25 mm bars"),
      problem("3. Lap splice of top bars", "25 mm top bars of a beam (more than 300 mm of concrete below) are spliced in tension. Use cb = 65 mm and Ktr = 0.",
        "dev-length-tension", { db: 25, fy: 415, fc: 28, top: "1.3", cb: 65 }, "tool-development-length-and-lap-splice", "ld and the Class B lap length"),
      problem("4. Short tied column", "A 350 × 350 mm tied column has 8–16 mm bars. Find the maximum design axial strength.",
        "column-axial-max", { type: "tied", b: 350, h: 350, nbars: 8, db: 16, fc: 21, fy: 415 }, "tool-column-maximum-axial-strength", "φPn,max and ρg"),
      problem("5. Bolted tension plate", "A 200 × 12 mm plate is connected with two 20 mm bolts across its width (U = 1.0). A36 steel.",
        "steel-tension-plate", { b: 200, t: 12, nh: 2, db: 20, fy: 248, fu: 400 }, "tool-steel-plate-tension", "Design tensile strength φTn"),
    ] }),
  E({ slug: "problems-amsthc", specialization: "cele",
    title: "Worked problems: scheduling & quantity surveying", summary: "3 board-type problems (PERT probability, concrete and rebar takeoff) with full solutions.",
    tags: ["scheduling", "takeoff", "estimating"], refs: [],
    sections: [
      problem("1. Probability of meeting a deadline", "For the network below (a m b in days), find the expected duration, the critical path and the probability of finishing within 30 days.",
        "pert-cpm", { acts: "A, Site clearing, 2 3 4, -\nB, Excavation, 3 5 7, A\nC, Footings, 4 6 10, B\nD, Column forms, 2 3 4, B\nE, Columns, 3 4 5, C D\nF, Slab, 5 7 12, E", target: 30 },
        "tool-pert-cpm-schedule", "Te, critical path, P(T ≤ 30 days)"),
      problem("2. Materials for slab panels", "Four slab panels each 6.0 × 4.0 × 0.125 m are cast with Class A (1:2:4) site-mixed concrete. Allow 5% waste.",
        "concrete-materials-takeoff", { L: 6, W: 4, H: 0.125, count: 4, mix: "A", waste: 5 }, "tool-concrete-materials-takeoff", "Bags of cement, m³ of sand and gravel"),
      problem("3. Rebar purchase list", "120 pieces of 12 mm bars, each cut 2.4 m long, are needed. Bars are bought in 7.5 m lengths.",
        "rebar-weight-takeoff", { db: 12, pieces: 120, len: 2.4, stock: "7.5" }, "tool-rebar-weight-takeoff", "Net weight and the number of 7.5 m bars to buy"),
    ] }),
  E({ slug: "problems-hge", specialization: "cele",
    title: "Worked problems: hydraulics & geotechnical", summary: "2 board-type problems (inclined gate, OC clay settlement) with full solutions.",
    tags: ["wall", "footing"], refs: [],
    sections: [
      problem("1. Inclined rectangular gate", "A 2.0 m wide, 2.5 m long gate is inclined at 60° to the horizontal. Its top edge is 1.5 m below the water surface.",
        "hydrostatic-plane-surface", { theta: 60, h1: 1.5, b: 2, L: 2.5, sg: 1 }, "tool-hydrostatic-plane-surface", "Total force and location of the center of pressure"),
      problem("2. Settlement of an overconsolidated clay", "A 5 m clay layer (e0 = 1.10, Cc = 0.36, Cs = 0.06) has σ'0 = 90 kPa and σ'c = 120 kPa at mid-depth. A new fill adds 60 kPa.",
        "consolidation-settlement", { H: 5, e0: 1.1, Cc: 0.36, Cs: 0.06, s0: 90, ds: 60, sc: 120 }, "tool-consolidation-settlement", "Primary consolidation settlement"),
    ] }),
);

/* ---------- PH ↔ Global ---------- */
batch.entries.push(
  E({ slug: "nscp-vs-source-codes", specialization: "ph-to-global",
    title: "NSCP 2015 and its US source codes", summary: "How NSCP chapters map to ACI, AISC and ASCE 7, and what is different.",
    tags: [], refs: [],
    sections: [
      { kind: "table", heading: "Chapter map", columns: ["NSCP 2015 Vol. 1", "Based on", "Numbering rule"], rows: [
        ["Ch. 2 Minimum design loads", "ASCE 7-10 (with PH seismic zoning and wind maps)", "Own section numbers"],
        ["Ch. 4 Structural concrete", "ACI 318-14", "Add 400: ACI 25.4.2 → NSCP 425.4.2"],
        ["Ch. 5 Structural steel", "AISC 360-10 (and AISC 341 for seismic)", "AISC chapter letter → 5xx section (verify numbering)"],
        ["Ch. 3 Excavation & foundations", "Local practice + US references", "Own section numbers"],
      ] },
      { kind: "list", heading: "Philippine-specific", items: ["Seismic zones: Zone 4 (Z = 0.40) for most of the country, Zone 2 (Z = 0.20) for Palawan, Sulu and Tawi-Tawi", "Near-source factors from PHIVOLCS active fault maps", "Basic wind speeds by province (3-second gust)", "Units are SI throughout"] },
      { kind: "safe", heading: "Working abroad with US codes", items: ["ACI/AISC equations carry over directly; check which edition the project uses (newer editions renumber)", "Load combinations follow ASCE 7 (1.2D + 1.6L etc.)"] },
    ] }),
  E({ slug: "ph-vs-sea-practice", specialization: "ph-to-global",
    title: "PH vs Brunei, Singapore & Malaysia: codes and practice", summary: "Building law, structural codes, registration and measurement side by side for OFW engineers.",
    tags: [], refs: [],
    sections: [
      { kind: "table", heading: "Side by side", verified: false, columns: ["Item", "Philippines", "Brunei", "Singapore", "Malaysia"], rows: [
        ["Building law", "NBCP (PD 1096) & IRR", "Building Control Order 2014 + Regulations; PBD 12 Building Guidelines & Requirements", "Building Control Act; BCA Approved Document", "Street, Drainage & Building Act; UBBL 1984"],
        ["Authority", "Local building official (OBO)", "ABCi (Authority for Building Control and Construction Industry)", "BCA", "Local authority (PBT)"],
        ["Structural design", "NSCP 2015 (ACI/AISC/ASCE-based)", "British Standards legacy; Eurocodes being adopted: confirm the basis in the spec", "Eurocodes only (SS EN + Singapore NAs) since April 2015", "MS EN Eurocodes (EN 1990–1993, 1997, 1998 parts) with Malaysian NAs; BS legacy on older work"],
        ["Engineer registration", "PRC Board of CE (RA 544)", "Registered PE under the APEQS Order", "PE Board (PEB)", "Board of Engineers Malaysia (BEM)"],
        ["Load factors (gravity)", "1.2D + 1.6L", "1.4Gk + 1.6Qk (BS) or 1.35Gk + 1.5Qk (EC)", "1.35Gk + 1.5Qk", "1.35Gk + 1.5Qk"],
        ["Measurement", "DPWH pay items / BOQ per procurement rules", "SMM2 (common on government jobs)", "SMM / project preambles", "SMM2 / Malaysian standard method"],
        ["Concrete strength", "f'c cylinder (e.g. 21, 28 MPa)", "Grade / class by cube or Cx/y", "C x/y (cylinder/cube)", "Grade (cube) or C x/y"],
        ["Rebar", "PNS 49 Grade 280/420 (Gr 40/60)", "500 MPa grades common", "500 MPa grades common", "500 MPa grades common"],
        ["Cement bag", "40 kg", "50 kg", "50 kg", "50 kg"],
      ] },
      { kind: "avoid", heading: "Avoid", items: ["Mixing code families in one design (e.g. Eurocode loads with ACI resistance)", "Assuming PH mix labels (Class A 1:2:4) are understood abroad: specify strength class", "Pricing with 40 kg bag factors where 50 kg bags are sold"] },
      { kind: "text", heading: "Note", text: VERIFY_SEA },
    ] }),
  E({ slug: "cylinder-vs-cube-strength", specialization: "ph-to-global",
    title: "Cylinder f'c vs cube strength (C x/y)", summary: "Reading Eurocode/BS strength classes as a PH engineer.",
    tags: ["concreting"], refs: [],
    sections: [
      { kind: "list", heading: "Key points", items: ["PH/ACI: f'c on 150 × 300 mm cylinders at 28 days", "Eurocode/EN 206: class C x/y = characteristic cylinder strength / cube strength in MPa (e.g. C25/30)", "BS practice abroad often quotes cube 'Grade 30' = 30 MPa on 150 mm cubes", "Cubes test about 20–25% higher than cylinders of the same concrete", "ACI f'c (specified, acceptance by averages) and EC fck (5% characteristic value) are close but not identical"] },
      { kind: "table", heading: "Nearest classes (for orientation, not substitution)", verified: false, columns: ["PH f'c (cylinder)", "≈ EN class", "≈ BS cube grade"], rows: [
        ["17 MPa", "C16/20", "Grade 20"], ["21 MPa", "C20/25", "Grade 25"], ["28 MPa", "C25/30 – C28/35", "Grade 30 – 35"], ["35 MPa", "C35/45", "Grade 45"], ["42 MPa", "C40/50", "Grade 50"],
      ] },
      { kind: "avoid", heading: "Avoid", items: ["Treating a cube grade as a cylinder f'c (that is about 20% unconservative)", "Swapping classes without the designer's approval"] },
    ] }),
  E({ slug: "site-terminology-ph-commonwealth", specialization: "ph-to-global",
    title: "Site terms: Philippines ↔ Brunei/Malaysia/Singapore", summary: "Words that change when you move from a PH site to a Commonwealth-practice site.",
    tags: [], refs: [],
    sections: [
      { kind: "table", heading: "Glossary", columns: ["PH site", "Commonwealth / BS-practice site", "Note"], rows: [
        ["Plans", "Drawings", ""], ["CHB (concrete hollow block)", "Hollow concrete block", ""], ["Rebar / RSB", "Reinforcement, high-yield bar (T/H bars), mild bar (R)", "T16 = 16 mm high-yield"],
        ["Stirrups / ties", "Links", ""], ["Change order / variation order", "Variation order (VO)", "Valued under the contract's variation clause"],
        ["Progress billing", "Interim payment / progress claim", ""], ["Retention (10%)", "Retention", "Percentage set in the contract"],
        ["Project engineer", "Site engineer / resident engineer", "RE often = the consultant's site rep"], ["Foreman", "Supervisor / chargehand", ""],
        ["Bill of quantities (POW)", "Bill of quantities (BQ)", "Measured to SMM2 on many government jobs"], ["Punch list", "Snag list / defects list", ""],
        ["Turnover", "Handover / practical completion", "Starts the defects liability period"], ["Liquidated damages", "LADs / LDs", ""],
        ["Formworks", "Formwork / shuttering", ""], ["Gravel (G1, ¾\")", "Coarse aggregate (20 mm)", ""],
      ] },
    ] }),
);

export default batch;
