// v1.1.1: clearer "lo" card (what lo is, end zones vs middle zone).
import type { Batch } from "../types";

const batch: Batch = {
  version: "v1.1.1",
  batch_name: "Profile, mobile, clearer lo card",
  notes: [
    "Column confinement zone card rewritten: what lo (ℓo) is, why it exists, and the end-zone vs middle-zone hoop limits",
  ],
  clauses: [],
  entries: [
    {
      slug: "column-confinement-zone-lo",
      module: "practice",
      title: "Column confinement zone (lo)",
      summary: "lo (ℓo) is the length at each end of a seismic column, measured from the beam/slab face, where hoops must be closely spaced. Length and spacing rules.",
      specialization: "concrete",
      category: "concrete-rebar",
      tags: ["column", "rebar", "inspection"],
      refs: [{ doc: "NSCP", section: "418.7.5", note: "Special moment frame columns: transverse reinforcement (= ACI 318-14 §18.7.5)" }],
      sections: [
        { kind: "text", heading: "What is lo?",
          text: "lo (written ℓo, 'L-sub-o') is the length of the confinement zone at each end of a column in a special moment frame. It is measured from the face of the joint (top of slab/beam at the bottom, soffit of the beam at the top) along the column. In a strong earthquake the column ends are where plastic hinges form, so the concrete there must be held in by closely spaced hoops and crossties. Outside lo (the middle of the column) the hoops may be spaced wider. Through the beam-column joint itself, hoops continue as required for the joint." },
        { kind: "safe", heading: "Length of lo (each end): the largest of",
          items: ["The column depth h (larger cross-section dimension) at the joint face", "One-sixth of the clear height of the column", "450 mm"] },
        { kind: "safe", heading: "Hoop spacing inside lo: the smallest of",
          items: ["1/4 of the smallest column dimension", "6 × diameter of the smallest longitudinal bar (NSCP 2015 / ACI 318-14)", "so = 100 + (350 − hx)/3 mm, taken not more than 150 mm and not less than 100 mm",
            "First hoop within 50 mm of the joint face"] },
        { kind: "safe", heading: "Hoop spacing outside lo (middle zone)",
          items: ["Not more than 6 × longitudinal bar diameter and not more than 150 mm, unless the design requires closer"] },
        { kind: "table", heading: "Worked example", columns: ["Item", "Value"], rows: [
          ["Column", "400 × 400 mm, 8–20 mm bars, clear height 2.70 m"],
          ["lo", "max(400, 2700/6 = 450, 450) = 450 mm at top and bottom"],
          ["s in lo (hx ≈ 170 mm assumed)", "min(400/4 = 100, 6×20 = 120, so = 100 + (350−170)/3 = 160 → 150) = 100 mm"],
          ["s outside lo", "min(6×20 = 120, 150) = 120 mm"],
        ] },
        { kind: "avoid", heading: "Common site errors",
          items: ["Spacing hoops uniformly at the middle-zone spacing all the way up", "Measuring lo from the floor finish or from the top of the beam instead of the joint face", "Leaving out hoops inside the beam-column joint because of congestion", "135° seismic hooks bent to 90°, or hook extensions shorter than 6db (min. 75 mm)", "Lap splices placed inside lo (laps belong in the middle half of the column, confined by hoops)"] },
        { kind: "list", heading: "Terms",
          items: ["ℓo: length of the end confinement zone", "h: column cross-section dimension in the direction considered", "hx: max. centre-to-centre spacing of longitudinal bars laterally supported by hoop corners or crossties", "db: longitudinal bar diameter", "so: spacing limit from the hx formula"] },
        { kind: "text", heading: "Note",
          text: "Rules apply to columns of special moment frames (typical for PH seismic zone 4). Check the structural drawings first: if they show closer spacing or longer zones, follow the drawings. Newer ACI 318-19 uses 6db for Grade 420 and 5db for Grade 550 bars." },
      ],
      diagram: { type: "column", hoops: "confined-ends",
        zones: [{ h: 0.2, label: "ℓo: tight hoops", status: "confine" }, { h: 0.6, label: "middle: s ≤ 6db, 150", status: "neutral" }, { h: 0.2, label: "ℓo: tight hoops", status: "confine" }],
        dims: ["ℓo ≥ h, Hc/6, 450", "s ≤ 6db, 150 mm", "ℓo ≥ h, Hc/6, 450"],
        caption: "ℓo measured from each joint face; Hc = clear height" },
    },
  ],
};
export default batch;
