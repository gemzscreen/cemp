// QA/QC calculators and inspection checklists (v0.6.0).
import { type Calc, n, r } from "./core";
import { checklist } from "./checklist";

/* 1. Concrete strength-test sampling frequency (NSCP 426.12.2 vs DPWH Item 405 practice) */
const sampling: Calc = {
  key: "concrete-sampling-frequency",
  title: "Concrete sampling frequency: strength-test sets for a day's pour",
  clauses: ["426.12", "Item 405"],
  fields: [
    { key: "V", label: "Volume of this class placed today", unit: "m³", type: "number", default: 180, min: 0 },
    { key: "A", label: "Slab or wall surface area placed today (0 if none)", unit: "m²", type: "number", default: 1000, min: 0 },
    { key: "size", label: "Cylinder size", type: "select", default: "150",
      options: [{ value: "150", label: "150 × 300 mm (2 cylinders per test)" }, { value: "100", label: "100 × 200 mm (3 cylinders per test)" }] },
    { key: "early", label: "Extra cylinders per set for 7-day breaks", type: "number", default: 1, min: 0 },
  ],
  compute(i) {
    const V = n(i.V), A = n(i.A), small = i.size === "100", early = Math.max(0, Math.round(n(i.early)));
    const byDay = V > 0 ? 1 : 0, byVol = Math.ceil(V / 110), byArea = Math.ceil(A / 460);
    const nscp = Math.max(byDay, byVol, byArea);
    const perTest = small ? 3 : 2;
    const nscpCyl = nscp * (perTest + early);
    const dpwh = V > 0 ? Math.ceil(V / 75) : 0;
    const dpwhCyl = dpwh * (3 + early);
    const gov = Math.max(nscp, dpwh);
    const why = nscp === 0 ? "nothing placed" : nscp === byArea && byArea > byVol ? "surface-area rule" : nscp === byVol && byVol > 1 ? "volume rule" : "once-a-day rule";
    return {
      results: [
        { label: "NSCP: strength tests (samples) required", value: nscp, unit: "tests", main: true },
        { label: `NSCP: cylinders to cast (${perTest}/test + ${early} early)`, value: nscpCyl, unit: "pcs" },
        { label: "DPWH practice: sets of 3 cylinders (1 per 75 m³)", value: dpwh, unit: "sets", main: true },
        { label: `DPWH: cylinders to cast (3/set + ${early} early)`, value: dpwhCyl, unit: "pcs" },
        { label: "Plan for (larger of the two)", value: gov, unit: "samples", main: true },
      ],
      checks: [
        { label: "NSCP governing rule", ok: true, detail: `${why}: day ${byDay}, volume ${byVol}, area ${byArea}` },
        { label: "Fewer than 5 tests for this class on the whole project?", ok: true,
          detail: "Then sample at least 5 randomly chosen batches, or every batch if fewer than 5 are used (426.12.2)" },
        { label: "Sample from the point of discharge, randomly selected", ok: true, detail: "Not all from the first truck; slump and temperature with each sample" },
        { label: "DPWH sampling frequency", ok: true, detail: "Commonly tabulated minimum testing requirement; verify against the Item 405 spec (revised by DPWH DO 32 s2025) and the approved QC program" },
      ],
      steps: [
        `NSCP 426.12.2: tests = max(1 per day, ⌈V/110⌉, ⌈A/460⌉) = max(${byDay}, ⌈${V}/110⌉ = ${byVol}, ⌈${A}/460⌉ = ${byArea}) = ${nscp}`,
        `A strength test = average of ${perTest} ${small ? "100 × 200" : "150 × 300"} mm cylinders at 28 days → ${nscp} × (${perTest} + ${early}) = ${nscpCyl} cylinders`,
        `DPWH: 1 set of 3 cylinders per 75 m³ or fraction, per day's pour = ⌈${V}/75⌉ = ${dpwh} sets → ${dpwh} × (3 + ${early}) = ${dpwhCyl} cylinders`,
      ],
    };
  },
};

/* 2. Concrete strength acceptance (NSCP 426.12.3) */
const acceptance: Calc = {
  key: "concrete-strength-acceptance",
  title: "Concrete strength acceptance: running average and low-test check",
  clauses: ["426.12"],
  fields: [
    { key: "fc", label: "Specified strength f'c", unit: "MPa", type: "number", default: 21 },
    { key: "tests", label: "Strength test results in pour order (each = average of the cylinders in one test)", unit: "MPa", type: "text", rows: 3,
      default: "22.5, 20.1, 23.4, 17.0, 24.0", help: "Separate with commas, spaces or new lines." },
  ],
  compute(i) {
    const fc = n(i.fc);
    const t = String(i.tests).split(/[\s,;]+/).filter(Boolean).map(Number);
    if (!t.length || t.some((x) => !Number.isFinite(x) || x <= 0)) {
      return { results: [{ label: "Input error", value: "Enter positive numbers only", main: true }], checks: [], steps: [] };
    }
    const lim = fc <= 35 ? fc - 3.5 : 0.9 * fc;
    const rows = t.map((x, k) => {
      const avg = k >= 2 ? (t[k] + t[k - 1] + t[k - 2]) / 3 : NaN;
      return { k: k + 1, x, avg, lowSingle: x < lim, lowAvg: Number.isFinite(avg) && avg < fc };
    });
    const badAvg = rows.filter((x) => x.lowAvg), badSingle = rows.filter((x) => x.lowSingle);
    const mean = t.reduce((s, x) => s + x, 0) / t.length;
    const ok = !badAvg.length && !badSingle.length;
    return {
      results: [
        { label: "Verdict", value: ok ? "ACCEPTED: both criteria met" : "NOT MET: investigate low-strength results", main: true },
        { label: "Averages of 3 consecutive below f'c", value: badAvg.length },
        { label: `Single tests below ${r(lim, 2)} MPa`, value: badSingle.length },
        { label: "Mean of all tests", value: r(mean, 2), unit: "MPa" },
        { label: "Number of tests", value: t.length },
      ],
      checks: [
        { label: "Every average of 3 consecutive tests ≥ f'c", ok: !badAvg.length,
          detail: badAvg.length ? `Fails at test(s) ${badAvg.map((x) => x.k).join(", ")}` : t.length < 3 ? "Fewer than 3 tests: not yet assessable" : "OK" },
        { label: `No single test below ${fc <= 35 ? "f'c − 3.5 MPa" : "0.90 f'c"}`, ok: !badSingle.length,
          detail: badSingle.length ? `Test(s) ${badSingle.map((x) => x.k).join(", ")} below ${r(lim, 2)} MPa` : "OK" },
        { label: "If not met", ok: true, detail: "Check testing first (curing of specimens, capping, lab). Then cores from the area represented, per 426.12.4; get the designer's evaluation" },
      ],
      steps: [
        `Single-test limit = ${fc <= 35 ? `f'c − 3.5 = ${fc} − 3.5` : `0.90 × ${fc}`} = ${r(lim, 2)} MPa (f'c ${fc <= 35 ? "≤" : ">"} 35 MPa)`,
        ...rows.filter((x) => x.k >= 3).map((x) => `Avg tests ${x.k - 2}–${x.k} = (${t[x.k - 3]} + ${t[x.k - 2]} + ${t[x.k - 1]})/3 = ${r(x.avg, 2)} MPa ${x.lowAvg ? "< f'c ✕" : "≥ f'c ✓"}`),
      ],
      table: {
        columns: ["Test", "Result (MPa)", "Avg of 3 (MPa)", "Single-test check", "Average check"],
        rows: rows.map((x) => [x.k, r(x.x, 2), Number.isFinite(x.avg) ? r(x.avg, 2) : "–", x.lowSingle ? "LOW" : "ok", Number.isFinite(x.avg) ? (x.lowAvg ? "LOW" : "ok") : "–"]),
        highlight: rows.map((x, k) => (x.lowSingle || x.lowAvg ? k : -1)).filter((k) => k >= 0),
      },
    };
  },
};

/* 3–6. Inspection checklists */
const prePour = checklist({
  key: "checklist-pre-pour",
  title: "Pre-pour inspection checklist (concrete)",
  clauses: ["426.13", "420.6.1", "425.2", "426.11"],
  readyText: "CLEARED FOR POURING", notReadyText: "HOLD: DO NOT POUR",
  groups: [
    { name: "Approvals & readiness", items: [
      "Approved plans and latest revisions on site; pour area and limits agreed",
      "Approved mix design / concrete class matches the plans for each member",
      "Formwork and rebar inspections signed off (separate checklists)",
      "Concrete supply confirmed: volume, trucks, interval, pump or chute set up",
      "Weather checked; rain protection and curing materials ready",
      "Slump cone, cylinder molds, thermometer and sampling crew ready",
    ] },
    { name: "Formwork", items: [
      "Line, level, plumb and dimensions within tolerance",
      "Forms clean, wetted or release agent applied; no debris, sawdust or tie wire",
      "Joints tight against grout loss; cleanouts closed",
      "Shoring/props on firm base, braced, wedges secured",
    ] },
    { name: "Reinforcement", items: [
      "Bar sizes, number, spacing and layers match the plans",
      "Cover blocks/chairs in place at the specified cover; bars tied and stable",
      "Laps at the allowed locations and of the required length",
      "Dowels and starter bars for next lift placed and secured",
    ] },
    { name: "Embedments & joints", items: [
      "Sleeves, conduits, boxes, inserts and anchor bolts placed and fixed",
      "MEP rough-ins signed off by the trades",
      "Construction joints prepared at approved locations (clean, rough, wet)",
      "Waterstops placed and continuous where specified",
    ] },
    { name: "Placing plan", items: [
      "Pour sequence, vibrators (incl. standby) and crew assigned",
      "Max free-fall and lift height controlled (tremie/chute where needed)",
      "Safe access, edge protection and lighting for the pour crew",
    ] },
  ],
});

const rebarInspection = checklist({
  key: "checklist-rebar",
  title: "Reinforcement placement inspection checklist",
  clauses: ["426.6", "420.6.1", "425.2", "425.3", "425.5.2", "Item 404"],
  groups: [
    { name: "Material", items: [
      "Mill certificates and tension/bend test results approved for each size and heat",
      "Grade marking matches the specified grade (e.g., Grade 40/60 per PNS 49)",
      "Bars free of loose rust, mud, oil and form release that would affect bond",
      "No bars bent/straightened on site in a way that cracks or weakens them",
    ] },
    { name: "Placement", items: [
      "Size, number and spacing per bar schedule",
      "Clear spacing between bars meets the minimum (coarse aggregate can pass)",
      "Concrete cover per the plans (blocks of proper thickness, not stones or wood)",
      "Top bars supported on chairs; no deflection when walked on",
    ] },
    { name: "Splices, hooks & ties", items: [
      "Lap lengths and stagger as shown; laps outside no-splice zones",
      "Standard and seismic hooks with correct bend diameter and tail length",
      "Stirrups/ties: spacing, hook angle (135° seismic) and closed hoops where required",
      "Confinement zones at beam ends and column ends detailed as shown",
      "Mechanical couplers / welded splices approved and tested (if used)",
    ] },
  ],
});

const formwork = checklist({
  key: "checklist-formwork",
  title: "Formwork & shoring inspection checklist",
  clauses: ["426.11"],
  groups: [
    { name: "Design & materials", items: [
      "Formwork/shoring design or approved method statement for this element",
      "Plywood, lumber or system panels in serviceable condition",
      "Props/shores of the specified type and capacity; no damaged or mixed parts",
    ] },
    { name: "Erection", items: [
      "Dimensions, line, level and plumb within tolerance; camber where specified",
      "Shores on sole plates over firm, compacted ground or slab",
      "Bracing in both directions; props plumb; wedges/pins locked",
      "Ties, clamps and walers at the designed spacing",
      "Joints tight; chamfer strips placed where shown",
      "Access, working platforms and edge protection installed",
    ] },
    { name: "Stripping & reshoring", items: [
      "Stripping times agreed (strength or age basis) and recorded",
      "Reshoring/backprops planned for slabs carrying construction loads",
      "No construction loads beyond what the design allows on young concrete",
    ] },
  ],
});

const steelInspection = checklist({
  key: "checklist-steel-bolting-welding",
  title: "Structural steel: erection, bolting & visual weld inspection",
  clauses: ["N5", "510.2", "510.3"],
  groups: [
    { name: "Before erection / welding", items: [
      "Shop drawings approved; mill certificates match member and plate grades",
      "Welding procedure specifications (WPS) available and approved",
      "Welders qualified for the process and position (valid certificates)",
      "Electrodes/consumables as specified and stored dry",
      "Fit-up: root opening, bevel, alignment and backing within tolerance",
    ] },
    { name: "Erection & bolting", items: [
      "Anchor bolts: position, projection and grout gap checked before erection",
      "Members plumb and aligned; temporary bracing in place until permanent",
      "Bolt grade, diameter, length, washers and nuts as specified",
      "Holes not flame-cut or reamed without approval",
      "Snug-tight or pretensioned as specified; pretension method verified (turn-of-nut, DTI or calibrated wrench)",
    ] },
    { name: "During & after welding", items: [
      "Preheat and interpass temperature as per WPS",
      "Weld size, length and location per drawings",
      "No cracks, lack of fusion, unacceptable undercut, porosity or overlap",
      "Slag and spatter removed; arc strikes repaired",
      "NDT done where specified and results accepted",
    ] },
  ],
});

export const QAQC_CALCS: Calc[] = [sampling, acceptance, prePour, rebarInspection, formwork, steelInspection];
