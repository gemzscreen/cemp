import type { Batch } from "../types";

const BB = "DPWH Blue Book";
const VERIFY_BB = "DPWH Blue Book item numbers and values are summarized in our own words. Check them against the edition named in your contract, as specs and Department Orders can modify them.";
const tool = (use: string, limits: string[]) => [
  { kind: "text" as const, heading: "When to use", text: use },
  { kind: "avoid" as const, heading: "Limitations", items: limits },
];

const batch: Batch = {
  version: "v0.5.0",
  batch_name: "Construction Management I: Scheduling, QS & Cost",
  notes: [
    "PERT/CPM scheduler: activity table → ES/EF/LS/LF, float, critical path, σ and probability of meeting a target date",
    "Cost build-up: materials, labor (crew × rate × days), equipment, OCM, profit, VAT → total and unit cost",
    "QS takeoffs: concrete materials by class (cement/sand/gravel) and rebar weight with commercial-length cutting",
    "3 QS practice cards + 2 education explainers (CPM/PERT, cost estimate structure)",
    "DPWH Blue Book Items 404 and 405 indexed; tools now support text inputs and result tables",
  ],
  clauses: [
    { doc: BB, section: "Item 404", title: "Reinforcing steel",
      summary: "Covers furnishing, bending and placing bars per the plans. Measured by the computed mass (kg) of steel actually placed as shown, using nominal unit masses. Laps are paid only where shown or approved; extra laps for the contractor's convenience are not paid. Bars must be clean, accurately placed and tied, and supported on approved chairs/spacers." },
    { doc: BB, section: "Item 405", title: "Structural concrete",
      summary: "Defines concrete classes (A, B, C, P, Seal) by minimum cement content and minimum compressive strength, plus batching, placing, curing and sampling requirements. Measured by volume (m³) to the neat dimensions shown on the plans." },
  ],
  entries: [
    /* ---------- tools ---------- */
    { slug: "tool-pert-cpm-schedule", module: "tool", calc_key: "pert-cpm", specialization: "pert-cpm",
      title: "PERT / CPM schedule: critical path, float and probability", summary: "Paste an activity list; get the critical path, floats and the chance of meeting a deadline.",
      tags: ["scheduling", "pre-construction"], refs: [],
      sections: tool("Bid schedules, look-ahead planning, checking a contractor's program, and estimating the probability of meeting a contract duration.",
        ["Finish-to-start links only (no lags, SS/FF)", "PERT probability uses the critical path only; parallel near-critical paths can lower the real probability", "Resource leveling is not included"]) },
    { slug: "tool-cost-buildup", module: "tool", calc_key: "cost-buildup", specialization: "cost-estimation",
      title: "Cost estimate build-up: direct cost, OCM, profit, VAT, unit cost", summary: "Turn materials, labor and equipment into a priced unit cost.",
      tags: ["estimating"], refs: [],
      sections: tool("Detailed unit price analysis for a pay item, or checking a subcontractor's quote.",
        ["Enter current wage rates for your region (they change with wage orders)", "DPWH indirect cost percentages follow the current Department Order by cost bracket", "Taxes beyond VAT (withholding etc.) are not computed"]) },
    { slug: "tool-concrete-materials-takeoff", module: "tool", calc_key: "concrete-materials-takeoff", specialization: "quantity-surveying",
      title: "Concrete materials takeoff: cement, sand, gravel", summary: "Volume of repeated members → bags of cement and m³ of sand and gravel by class.",
      tags: ["takeoff", "estimating", "concreting"], refs: [{ doc: BB, section: "Item 405" }],
      sections: tool("Site-mixed concrete estimates for footings, columns, beams and slabs.",
        ["Factors are typical estimating values for 40 kg bags; actual depends on aggregates and the mix design", "Ready-mix: order by m³ from the approved mix design"]) },
    { slug: "tool-rebar-weight-takeoff", module: "tool", calc_key: "rebar-weight-takeoff", specialization: "quantity-surveying",
      title: "Rebar takeoff: weight and commercial lengths", summary: "Bar count and cut length → kg and how many 6/7.5/9/10.5/12 m bars to buy.",
      tags: ["takeoff", "rebar", "estimating"], refs: [{ doc: BB, section: "Item 404" }],
      sections: tool("Bar schedules, purchase lists and checking supplier quotations.",
        ["One bar size and cut length per run; combine runs in your schedule", "Optimizing mixed cut lengths across stock bars (cutting optimization) is not included"]) },

    /* ---------- practice cards ---------- */
    { slug: "qs-takeoff-workflow", module: "practice", specialization: "quantity-surveying",
      title: "Quantity takeoff workflow", summary: "A repeatable order for taking off a building, so nothing is missed or double-counted.",
      tags: ["takeoff", "estimating", "pre-construction"], refs: [{ doc: BB, section: "Item 405" }, { doc: BB, section: "Item 404" }],
      sections: [
        { kind: "list", heading: "Order of work", items: ["Read all sheets first: general notes, schedules, typical details", "Set up the BOQ by trade/division before measuring", "Measure substructure → superstructure → finishes → MEP", "Take off by grid line and floor, marking each member as it is measured", "Keep a dimension sheet: description, number, L × W × H, quantity, unit"] },
        { kind: "safe", heading: "Measurement rules of thumb", items: ["Measure to the neat dimensions on the plans (the basis of payment)", "Concrete: deduct the column volume inside beams/slabs once, so it is counted in only one member", "Rebar: from schedules and typical details; include hooks and laps shown", "Formwork: contact area, by member type", "Add waste as a separate line, not hidden in quantities"] },
        { kind: "avoid", heading: "Common errors", items: ["Double-counting beam-column intersections", "Missing typical details (lintels, stiffener columns, stair landings)", "Mixing units (m² vs m³; kg vs pcs)", "Scaling from drawings instead of using written dimensions"] },
        { kind: "text", heading: "Note", text: VERIFY_BB },
      ] },
    { slug: "rebar-takeoff-and-cutting-list", module: "practice", specialization: "quantity-surveying",
      title: "Rebar takeoff and cutting list", summary: "From bar schedule to purchase list with low cutting waste.",
      tags: ["takeoff", "rebar", "estimating"], refs: [{ doc: BB, section: "Item 404" }, { section: "425.5.2", note: "Lap lengths" }],
      sections: [
        { kind: "list", heading: "Steps", items: ["List every bar: mark, diameter, shape, cut length, number", "Cut length = straight length + hooks + laps (Class B lap unless noted)", "Group by diameter; fit cut lengths into 6, 7.5, 9, 10.5 or 12 m stock", "Total kg = Σ length × d²/162.2", "Order by size and length; note mill certificates required"] },
        { kind: "safe", heading: "Reduce waste", items: ["Choose stock length to fit the most common cut (e.g. 2.9 m → 6 m bars: 2 cuts)", "Use offcuts for short bars: dowels, stirrup extensions, chairs", "Place lap splices where the bar schedule allows to suit stock lengths"] },
        { kind: "avoid", heading: "Avoid", items: ["Paying by kg for laps the contractor added for convenience (not paid under Item 404)", "Ignoring hook lengths on stirrups and ties", "Assuming all bars come in 6 m"] },
        { kind: "text", heading: "Note", text: VERIFY_BB },
      ] },
    { slug: "concrete-classes-dpwh", module: "practice", specialization: "quantity-surveying",
      title: "Concrete classes (DPWH Item 405)", summary: "Which class goes where, with minimum cement content and strength.",
      tags: ["concreting", "estimating", "inspection"], refs: [{ doc: BB, section: "Item 405" }],
      sections: [
        { kind: "list", heading: "Classes (minimum cement content · minimum 28-day f'c)", items: ["Class A: 360 kg/m³ (9 bags) · 20.7 MPa: general structural concrete", "Class B: 320 kg/m³ (8 bags) · 16.5 MPa: non-reinforced/massive work", "Class C: 380 kg/m³ (9.5 bags) · 20.7 MPa: thin reinforced sections, railings", "Class P: 440 kg/m³ (11 bags) · 37.7 MPa: prestressed members", "Seal: 380 kg/m³ (9.5 bags) · 20.7 MPa: placed under water"] },
        { kind: "safe", heading: "On site", items: ["Check the class on the plans for each member", "Trial mix / design mix approved before pouring", "Slump and cylinder samples per the specs"] },
        { kind: "avoid", heading: "Avoid", items: ["Confusing DPWH classes with 1:2:4-style site-mix labels", "Adding water to restore slump"] },
        { kind: "text", heading: "Note", text: "Values as commonly tabulated from the Blue Book. " + VERIFY_BB },
      ] },

    /* ---------- education ---------- */
    { slug: "cpm-pert-explained", module: "education", specialization: "pert-cpm",
      title: "CPM and PERT explained", summary: "Forward/backward pass, float, critical path and probability: the board-exam and site versions.",
      tags: ["scheduling"], refs: [],
      sections: [
        { kind: "list", heading: "Key terms", items: ["ES/EF: earliest start/finish (forward pass)", "LS/LF: latest start/finish (backward pass)", "Total float = LS − ES: delay allowed without delaying the project", "Free float: delay allowed without delaying any successor", "Critical path: longest path; zero total float"] },
        { kind: "list", heading: "PERT", items: ["Three-time estimate: te = (a + 4m + b)/6", "Variance = ((b − a)/6)²", "Project σ = √(Σ variances on the critical path)", "z = (T − Te)/σ → probability from the normal table"] },
        { kind: "safe", heading: "Site use", items: ["Update the schedule weekly; float is shared, so track who uses it", "Watch near-critical paths (small float)", "Use the tool's table to explain delays in time-extension requests"] },
      ] },
    { slug: "cost-estimate-structure", module: "education", specialization: "cost-estimation",
      title: "How a construction cost estimate is structured", summary: "Direct cost, indirect cost, taxes and how they roll up into unit prices.",
      tags: ["estimating"], refs: [],
      sections: [
        { kind: "list", heading: "Direct cost", items: ["Materials: quantity × price + waste, delivered to site", "Labor: crew composition × daily rate × days (rate includes mandatory contributions)", "Equipment: rental or ownership cost × days, fuel, operator"] },
        { kind: "list", heading: "Indirect cost", items: ["Overhead, contingencies and miscellaneous (OCM)", "Contractor's profit", "On government jobs, the percentages follow the current DPWH Department Order by cost bracket"] },
        { kind: "list", heading: "Taxes", items: ["VAT applied on direct + indirect cost", "Withholding taxes affect cash flow, not the estimate total"] },
        { kind: "safe", heading: "Good practice", items: ["Build each pay item as a detailed unit price analysis", "Keep prices dated and sourced (supplier quotes)", "Compare the result with recent awarded contracts"] },
      ] },
  ],
};

export default batch;
