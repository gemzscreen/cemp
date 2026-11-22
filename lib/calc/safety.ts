// Construction safety & health tools (v0.6.0): RA 11058 / DOLE DO 198-18.
import { type Calc, n, r } from "./core";
import { checklist } from "./checklist";

/* 1. OSH personnel for a construction site: DOLE DO 252 s.2025 (Revised IRR of RA 11058), Sec. 22 */
export type OshPersonnel = { so: string; firstAiders: number; nurses: string; physicians: string; dentist: string; bracket: string };
const extra = (N: number, over: number, per: number) => (N > over ? Math.ceil((N - over) / per) : 0);
/** Construction-industry minimums from DO 252-25 Sec. 22 (read from the DPWH-circulated copy, DMC 33 s.2025). */
export function constructionOshPersonnel(N: number): OshPersonnel {
  if (N <= 0) return { so: "none", firstAiders: 0, nurses: "none", physicians: "none", dentist: "none", bracket: "no workers" };
  const bracket = N <= 9 ? "1–9" : N <= 99 ? "10–99" : N <= 199 ? "100–199" : N <= 500 ? "200–500" : N <= 2000 ? "501–2,000" : "over 2,000";
  const so = N <= 9 ? "1 SO2" : N <= 99 ? "2 SO2" : N <= 199 ? "3 SO2 or 2 SO3" : N <= 500 ? "2 SO3 + 1 SO4"
    : `2 SO3 + 1 SO4 + ${extra(N, 500, 500)} SO2`;
  const firstAiders = N <= 9 ? 1 : N <= 99 ? 2 : N <= 199 ? 3 : 6 + extra(N, 500, 500);
  const nurses = N <= 50 ? "none required" : N <= 99 ? "2 part-time" : N <= 2000 ? "1 full-time" : `${1 + extra(N, 2000, 250)} full-time`;
  const physicians = N <= 99 ? "none required" : N <= 199 ? "1 part-time" : N <= 500 ? "2 part-time" : N <= 2000 ? "2 part-time or 1 full-time"
    : `2 part-time or 1 full-time, plus ${extra(N, 2000, 500)} × (1 full-time or 4 part-time)`;
  const dentist = N >= 100 ? "at least 1 part-time" : "none required";
  return { so, firstAiders, nurses, physicians, dentist, bracket };
}

const safetyOfficers: Calc = {
  key: "safety-officer-requirement",
  title: "Construction site OSH personnel (DO 252-25): safety officers, first-aiders, health staff",
  clauses: ["Sec. 22", "Sec. 14"],
  fields: [
    { key: "N", label: "Workers on site (peak, main contractor + all subcontractors)", unit: "workers", type: "number", default: 120, min: 0 },
  ],
  compute(i) {
    const N = Math.max(0, Math.round(n(i.N)));
    const p = constructionOshPersonnel(N);
    return {
      results: [
        { label: "Minimum safety officers", value: p.so, main: true },
        { label: "Certified first-aiders", value: p.firstAiders, main: true },
        { label: "OH nurses", value: p.nurses },
        { label: "OH physicians", value: p.physicians },
        { label: "OH dentist", value: p.dentist },
        { label: "Workforce bracket", value: `${p.bracket} workers` },
        { label: "OSH committee", value: N > 0 ? "Required (all construction establishments, Sec. 14(f))" : "–" },
        { label: "Construction Safety & Health Program", value: N > 0 ? "Required before work starts; revise when scope changes" : "–" },
      ],
      checks: [
        { label: "Regulation in force", ok: true, detail: "DOLE DO 252 s.2025 (Revised IRR of RA 11058) superseded DO 198-18; construction rules are in Sec. 22" },
        { label: "CSHP approval route", ok: true, detail: "Submit to the DOLE provincial/field office with jurisdiction; public projects: approved by DPWH or the implementing agency, then submitted to DOLE" },
        { label: "Table source", ok: true, detail: "Read from the DPWH-circulated scan (DMC 33 s.2025), which has OCR errors: confirm figures against an official printed copy" },
        { label: "Headcount", ok: true, detail: "Use peak workers on site including subcontractors; their SOs coordinate under the main contractor's" },
      ],
      steps: [
        `Peak workers N = ${N} → bracket ${p.bracket}`,
        `Safety officers: 1–9 → 1 SO2; 10–99 → 2 SO2; 100–199 → 3 SO2 or 2 SO3; 200–500 → 2 SO3 + 1 SO4; +1 SO2 per additional 500 or fraction → ${p.so}`,
        `First-aiders: 1–9 → 1; 10–99 → 2; 100–199 → 3; 200–500 → 6; +1 per additional 500 → ${p.firstAiders}`,
        `Nurses: 51–99 → 2 part-time; 100–2,000 → 1 full-time; +1 full-time per additional 250 → ${p.nurses}`,
        `Physicians: 100–199 → 1 PT; 200–500 → 2 PT; 501–2,000 → 2 PT or 1 FT → ${p.physicians}; dentist ≥ 100 workers → ${p.dentist}`,
      ],
    };
  },
};

/* 2. Injury frequency & severity rates */
const injuryRates: Calc = {
  key: "injury-rates",
  title: "Safety statistics: frequency rate, severity rate and TRIR",
  clauses: [],
  fields: [
    { key: "workers", label: "Average workers", type: "number", default: 120 },
    { key: "hours", label: "Hours per worker per day", unit: "h", type: "number", default: 8 },
    { key: "days", label: "Workdays in the period", unit: "days", type: "number", default: 156 },
    { key: "dis", label: "Disabling (lost-time) injuries", type: "number", default: 2 },
    { key: "lost", label: "Days lost / charged", unit: "days", type: "number", default: 30 },
    { key: "rec", label: "Recordable cases (lost-time + medical treatment + restricted)", type: "number", default: 5 },
  ],
  compute(i) {
    const mh = n(i.workers) * n(i.hours) * n(i.days);
    if (!(mh > 0)) return { results: [{ label: "Input error", value: "Man-hours must be > 0", main: true }], checks: [], steps: [] };
    const fr = (n(i.dis) * 1e6) / mh, sr = (n(i.lost) * 1e6) / mh, trir = (n(i.rec) * 2e5) / mh;
    const avg = n(i.dis) > 0 ? n(i.lost) / n(i.dis) : 0;
    return {
      results: [
        { label: "Man-hours worked", value: Math.round(mh).toLocaleString("en-US"), unit: "h", main: true },
        { label: "Frequency rate (per 1,000,000 h)", value: r(fr, 2), main: true },
        { label: "Severity rate (days per 1,000,000 h)", value: r(sr, 1), main: true },
        { label: "TRIR (per 200,000 h)", value: r(trir, 2) },
        { label: "Average days lost per injury", value: r(avg, 1), unit: "days" },
      ],
      checks: [
        { label: "Man-hours source", ok: true, detail: "Use actual timesheet hours incl. overtime and subcontractors when available" },
        { label: "Reporting", ok: true, detail: "Report work accidents and dangerous occurrences to DOLE in the prescribed forms and periods; keep the injury log" },
        { label: "Fatality / permanent disability", ok: true, detail: "Days charged follow the standard time-charge table (e.g. 6,000 days for a fatality): enter the charged days" },
      ],
      steps: [
        `Man-hours = ${i.workers} × ${i.hours} × ${i.days} = ${Math.round(mh)} h`,
        `FR = injuries × 1,000,000 / man-hours = ${i.dis} × 1,000,000 / ${Math.round(mh)} = ${r(fr, 3)}`,
        `SR = days lost × 1,000,000 / man-hours = ${i.lost} × 1,000,000 / ${Math.round(mh)} = ${r(sr, 2)}`,
        `TRIR = recordables × 200,000 / man-hours = ${i.rec} × 200,000 / ${Math.round(mh)} = ${r(trir, 3)}`,
      ],
    };
  },
};

/* 3. Job hazard analysis with a 5 × 5 risk matrix */
export const riskBand = (s: number) => (s >= 20 ? "Extreme" : s >= 10 ? "High" : s >= 5 ? "Medium" : "Low");
const jha: Calc = {
  key: "jha-risk-matrix",
  title: "Job hazard analysis (JHA) with 5 × 5 risk rating",
  clauses: ["Sec. 12"],
  fields: [
    { key: "task", label: "Task / location / crew", type: "text", rows: 2, default: "Trench excavation for drainage line, 1.8 m deep, Grid A–C\nCrew: 1 operator, 4 laborers, 1 foreman" },
    { key: "rows", label: "Steps: Step | Hazard | L | S | Controls | L after | S after", type: "text", rows: 7,
      help: "One hazard per line, fields separated by |. L = likelihood 1–5, S = severity 1–5.",
      default: [
        "Excavate trench | Cave-in of trench walls | 3 | 5 | Bench or shore sides; spoil and equipment ≥ 1 m from edge; inspect daily and after rain | 1 | 5",
        "Excavate trench | Worker struck by excavator | 3 | 4 | Banksman; exclusion zone; reversing alarm; no one in swing radius | 1 | 4",
        "Work in trench | Fall into trench | 3 | 3 | Barricade and signage; ladder access within easy reach | 1 | 3",
        "Lay pipes | Back strain from manual handling | 3 | 2 | Two-person or mechanical lift; toolbox talk on lifting | 2 | 2",
        "Backfill | Buried utility strike | 2 | 5 | Utility drawings and locator before digging; hand-dig near services | 1 | 5",
      ].join("\n") },
  ],
  compute(i) {
    const lines = String(i.rows).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const errs: string[] = [];
    const rows = lines.map((l, k) => {
      const p = l.split("|").map((x) => x.trim());
      const [step, hazard, L, S, ctrl, L2, S2] = p;
      const nums = [L, S, L2, S2].map(Number);
      if (p.length < 7 || nums.some((x) => !Number.isInteger(x) || x < 1 || x > 5)) errs.push(`Line ${k + 1}: need 7 fields; L and S must be whole numbers 1–5`);
      const r0 = nums[0] * nums[1], r1 = nums[2] * nums[3];
      return { step, hazard, ctrl, r0, r1, s1: nums[3] };
    });
    if (errs.length || !rows.length) return { results: [{ label: "Input error", value: errs[0] ?? "No hazards entered", main: true }], checks: errs.map((e) => ({ label: "Input", ok: false, detail: e })), steps: [] };
    const max0 = Math.max(...rows.map((x) => x.r0)), max1 = Math.max(...rows.map((x) => x.r1));
    const stop = rows.filter((x) => x.r1 >= 10);
    return {
      results: [
        { label: "Verdict", value: stop.length ? `STOP: ${stop.length} hazard(s) still High/Extreme after controls` : "Proceed with controls in place", main: true },
        { label: "Highest initial risk", value: `${max0} (${riskBand(max0)})`, main: true },
        { label: "Highest residual risk", value: `${max1} (${riskBand(max1)})`, main: true },
        { label: "Hazards assessed", value: rows.length },
      ],
      checks: [
        { label: "Residual risk ≤ Medium (≤ 9) for every hazard", ok: !stop.length, detail: stop.length ? stop.map((x) => x.hazard).join("; ") : "OK" },
        { label: "Severity 5 hazards", ok: true, detail: `${rows.filter((x) => x.s1 === 5).length} remain severity 5: controls must be verified on site every shift` },
        { label: "Hierarchy of controls", ok: true, detail: "Eliminate → substitute → engineering → administrative → PPE (last resort)" },
      ],
      steps: [
        "Risk = Likelihood × Severity (1–5 each)",
        "Bands: 1–4 Low, 5–9 Medium, 10–16 High, 20–25 Extreme (a common matrix; use your company CSHP matrix if different)",
        "Work proceeds only when every residual risk is Medium or lower and controls are briefed in the toolbox talk",
      ],
      table: {
        columns: ["#", "Step", "Hazard", "Initial", "Controls", "Residual"],
        rows: rows.map((x, k) => [k + 1, x.step, x.hazard, `${x.r0} ${riskBand(x.r0)}`, x.ctrl, `${x.r1} ${riskBand(x.r1)}`]),
        highlight: rows.map((x, k) => (x.r1 >= 10 ? k : -1)).filter((k) => k >= 0),
      },
    };
  },
};

/* 4–6. Safety inspection checklists */
const scaffold = checklist({
  key: "checklist-scaffold",
  title: "Scaffold inspection checklist (before use, daily, after storms)",
  clauses: ["Sec. 10"],
  readyText: "SAFE TO USE (tag green)", notReadyText: "DO NOT USE (tag red)",
  groups: [
    { name: "Foundation & structure", items: [
      "Base plates and sole boards on firm, level ground; no missing or undermined bases",
      "Standards plumb; ledgers and transoms level and at design spacing",
      "Bracing (cross/diagonal/plan) complete; no parts removed",
      "Ties/anchors to the structure at the required spacing",
      "Couplers and pins tight; no damaged, bent or corroded tubes/frames",
    ] },
    { name: "Platforms & access", items: [
      "Platforms fully planked, secured, no gaps or overhang beyond limits",
      "Guardrails, mid-rails and toe boards on all open sides",
      "Safe access ladder or stair; ladder secured and extends above landing",
      "Load on platform within rated capacity; materials not stacked on guardrails",
    ] },
    { name: "Control", items: [
      "Erected/altered under a competent person; inspection tag filled and signed",
      "Clearance from overhead power lines maintained",
      "Users wearing harness where required and briefed",
    ] },
  ],
});

const excavation = checklist({
  key: "checklist-excavation",
  title: "Excavation & trench inspection checklist",
  clauses: ["Sec. 10"],
  readyText: "SAFE TO ENTER", notReadyText: "NO ENTRY",
  groups: [
    { name: "Before digging", items: [
      "Underground utilities located and marked; permits obtained",
      "Excavation method and support (slope, bench, shore, shield) planned by competent person",
    ] },
    { name: "Daily / after rain", items: [
      "Sides sloped, benched or supported as planned; no cracks, bulging or sloughing",
      "Spoil, materials and equipment kept back from the edge",
      "Water accumulation controlled (pump, drainage)",
      "Adjacent structures, roads and footings checked for movement",
      "Atmosphere tested where gas or low oxygen is possible (confined space rules)",
    ] },
    { name: "Access & protection", items: [
      "Ladders or ramps within easy reach of workers in the trench",
      "Barricades, warning signs and night lights around the excavation",
      "Stop blocks for vehicles near the edge; banksman for equipment",
      "No one working under suspended loads or within the excavator swing radius",
    ] },
  ],
});

const siteWalk = checklist({
  key: "checklist-daily-site-safety",
  title: "Daily site safety walk checklist",
  clauses: ["Sec. 8", "Sec. 9", "Sec. 14"],
  readyText: "NO ISSUES", notReadyText: "CORRECTIVE ACTION REQUIRED",
  groups: [
    { name: "People", items: [
      "Toolbox talk held and attendance signed",
      "Correct PPE worn by all, incl. visitors",
      "Permits to work valid (hot work, confined space, work at height, lifting)",
      "Operators and riggers with valid TESDA/DOLE-recognized certificates",
    ] },
    { name: "Workplace", items: [
      "Edge protection, floor openings covered and marked",
      "Housekeeping: clear walkways, no protruding nails or rebar ends (caps installed)",
      "Temporary electrical: GFCI/RCD, no damaged cords, panels closed",
      "Fire extinguishers in place and charged; hot work fire watch",
      "Safety signage posted (PPE, hazards, emergency exits, assembly point)",
    ] },
    { name: "Equipment & welfare", items: [
      "Heavy equipment daily checks done; lifting gear inspected and tagged",
      "Drinking water, toilets, rest area and first-aid kit available",
      "Emergency contacts and nearest hospital route posted",
    ] },
  ],
});

export const SAFETY_CALCS: Calc[] = [safetyOfficers, injuryRates, jha, scaffold, excavation, siteWalk];
