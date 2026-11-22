// Construction safety & health tools (v0.6.0): RA 11058 / DOLE DO 198-18.
import { type Calc, n, r } from "./core";
import { checklist } from "./checklist";

/* 1. Safety officer staffing for a construction site (high-risk workplace) */
type SO = { so2: number; so3: number; extra: number };
/** DO 198-18 Sec. 14 minimum safety officers, high-risk column. Values from secondary summaries:
 *  verify against the official DO 198-18 table before relying on brackets above 50 workers. */
export function safetyOfficersHighRisk(N: number): SO {
  if (N <= 0) return { so2: 0, so3: 0, extra: 0 };
  if (N <= 9) return { so2: 1, so3: 0, extra: 0 };
  if (N <= 50) return { so2: 0, so3: 1, extra: 0 };
  if (N <= 199) return { so2: 1, so3: 1, extra: 0 };
  if (N <= 250) return { so2: 0, so3: 2, extra: 0 };
  if (N <= 750) return { so2: 1, so3: 2, extra: 0 };
  return { so2: 1, so3: 2, extra: Math.ceil((N - 750) / 250) };
}
const soText = (s: SO) => [s.so2 && `${s.so2} SO2`, s.so3 && `${s.so3} SO3`, s.extra && `${s.extra} additional SO3/SO4`].filter(Boolean).join(" + ") || "none";

const safetyOfficers: Calc = {
  key: "safety-officer-requirement",
  title: "Construction site OSH personnel: safety officers, committee and program type",
  clauses: ["Sec. 12", "Sec. 13", "Sec. 14", "Sec. 15"],
  fields: [
    { key: "N", label: "Workers on site (peak, all contractors and subcontractors)", unit: "workers", type: "number", default: 120, min: 0 },
    { key: "shifts", label: "Shifts per day", type: "number", default: 1, min: 1 },
  ],
  compute(i) {
    const N = Math.max(0, Math.round(n(i.N))), shifts = Math.max(1, Math.round(n(i.shifts)));
    const so = safetyOfficersHighRisk(N);
    const perShift = Math.ceil(N / shifts);
    const bracket = N <= 9 ? "1–9" : N <= 50 ? "10–50" : N <= 99 ? "51–99" : N <= 199 ? "100–199" : N <= 250 ? "200–250" : N <= 500 ? "251–500" : N <= 750 ? "501–750" : "over 750";
    const simple = N < 10;
    return {
      results: [
        { label: "Minimum safety officers (high risk)", value: soText(so), main: true },
        { label: "Workforce bracket", value: `${bracket} workers` },
        { label: "OSH committee", value: simple ? "Simplified committee (owner/manager, SO, worker rep)" : "Full committee: PM as chair, SO as secretary, sub-contractor and worker reps", main: true },
        { label: "OSH program / CSHP", value: simple ? "Simplified program" : "Full CSHP, approved before work starts", main: true },
        { label: "First-aiders", value: `At least 1 certified first-aider per shift (${shifts} shift${shifts > 1 ? "s" : ""}, ~${perShift} workers each)` },
        { label: "Nurse / physician / dentist", value: N > 50 ? "Required: size by the DO 198-18 Sec. 15 table" : "Not required at this size (first-aider + nearby clinic)" },
      ],
      checks: [
        { label: "Construction is a high-risk workplace", ok: true, detail: "Use the high-risk column regardless of contract size" },
        { label: "SO qualifications", ok: true, detail: "SO2 = 40-h COSH (construction); SO3 = COSH + 48 h advanced/specialized training + 2 years OSH experience; SO4 = OSH practitioner/consultant" },
        { label: "Table values", ok: N <= 50, detail: N <= 50 ? "1–9 → 1 SO2 and 10–50 → 1 SO3 are well established" : "Brackets above 50 workers are from secondary summaries of DO 198-18 Sec. 14: verify against the official table" },
        { label: "Owner/main contractor coordination", ok: true, detail: "Each subcontractor's SOs add to, and coordinate under, the main contractor's general SO" },
      ],
      steps: [
        `Peak workers N = ${N} → bracket ${bracket} (high risk)`,
        N > 750 ? `Over 750: 1 SO2 + 2 SO3, plus 1 SO3/SO4 for every additional 250 or fraction: ⌈(${N} − 750)/250⌉ = ${so.extra}` : `Table row ${bracket}: ${soText(so)}`,
        simple ? "Fewer than 10 workers → simplified committee and program" : "10 or more workers on a high-risk site → full committee and full program",
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
