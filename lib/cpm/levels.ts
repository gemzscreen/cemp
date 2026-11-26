// Critical Path Rush levels (v2.4.0). Durations in working days; finish-to-start links. Typical small-project
// durations for PH practice, for the game (not a programme for a real job). Crash costs are indicative ₱ per day saved
// (overtime, extra crew, accelerator, crane hire). `best` = exhaustive optimum from scripts/cpm-optimum.ts: re-run it
// after editing a crash level.
import type { Act, CrashTerms } from "./index";

export type CpmLevel = {
  id: number; name: string; blurb: string; mode: "find" | "crash";
  acts: Act[];
  timeLimit?: number;            // find: seconds for 3 stars (2 stars within 2×)
  terms?: CrashTerms;            // crash
  best?: { total: number; T: number; crash: Record<string, number> };
};

export const LD_NOTE = "Liquidated damages here are a fixed ₱ per day to keep the game simple. In PH government contracts they are at least 1/10 of 1% of the cost of the unperformed portion per day of delay (RA 9184 IRR Sec. 68; RA 12009 now governs procurement: verify against its current IRR).";

export const CPM_LEVELS: CpmLevel[] = [
  {
    id: 1, name: "Ground water tank", mode: "find", timeLimit: 60,
    blurb: "A 4,000 L concrete tank. The pump arrives by delivery while the tank is built. Which chain sets the finish date?",
    acts: [
      { id: "A", name: "Layout & excavation", d: 2, pred: [] },
      { id: "B", name: "Lean concrete & base rebar", d: 1, pred: ["A"] },
      { id: "C", name: "Pour base slab", d: 1, pred: ["B"] },
      { id: "D", name: "Wall rebar & formwork", d: 3, pred: ["C"] },
      { id: "E", name: "Order & deliver pump", d: 4, pred: [] },
      { id: "F", name: "Pour walls", d: 1, pred: ["D"] },
      { id: "G", name: "Cure walls, strip forms", d: 7, pred: ["F"] },
      { id: "H", name: "Plumbing connections", d: 1, pred: ["E", "G"] },
      { id: "I", name: "Leak test & backfill", d: 2, pred: ["H"] },
    ],
  },
  {
    id: 2, name: "Septic tank", mode: "find", timeLimit: 90,
    blurb: "Three-chamber septic tank. Careful: two activities can tie, and then both are critical.",
    acts: [
      { id: "A", name: "Excavation", d: 2, pred: [] },
      { id: "B", name: "Gravel bed & base slab", d: 2, pred: ["A"] },
      { id: "C", name: "CHB walls & baffles", d: 4, pred: ["B"] },
      { id: "D", name: "Waterproof plaster", d: 2, pred: ["C"] },
      { id: "E", name: "Cover slab forms & rebar", d: 2, pred: ["C"] },
      { id: "F", name: "Inlet, outlet & vent pipes", d: 1, pred: ["C"] },
      { id: "G", name: "Pour cover slab", d: 1, pred: ["D", "E"] },
      { id: "H", name: "Cure cover slab", d: 7, pred: ["G"] },
      { id: "I", name: "Water test", d: 1, pred: ["F", "H"] },
      { id: "J", name: "Backfill & restore", d: 1, pred: ["I"] },
    ],
  },
  {
    id: 3, name: "Bungalow structure", mode: "find", timeLimit: 150,
    blurb: "Single-storey house up to plaster. Walls wait for the slab and the columns; the roof waits for the beams.",
    acts: [
      { id: "A", name: "Mobilization & layout", d: 2, pred: [] },
      { id: "B", name: "Excavate footings", d: 3, pred: ["A"] },
      { id: "C", name: "Footings & column stubs", d: 4, pred: ["B"] },
      { id: "D", name: "Wall footing & CHB below grade", d: 3, pred: ["C"] },
      { id: "E", name: "Backfill & slab prep", d: 2, pred: ["D"] },
      { id: "F", name: "Columns to roof beam", d: 5, pred: ["C"] },
      { id: "G", name: "Roof beams", d: 4, pred: ["F"] },
      { id: "H", name: "Slab on grade", d: 2, pred: ["E"] },
      { id: "I", name: "CHB walls", d: 6, pred: ["H", "F"] },
      { id: "J", name: "Steel roof trusses", d: 4, pred: ["G"] },
      { id: "K", name: "Roofing & flashing", d: 3, pred: ["J"] },
      { id: "L", name: "Plastering", d: 6, pred: ["I", "K"] },
    ],
  },
  {
    id: 4, name: "Steel footbridge", mode: "crash",
    blurb: "The barangay wants it open for the fiesta: 21 days, no excuses. Buy back days at the lowest cost.",
    best: {total: 25000, T: 21, crash: {"B": 1, "C": 1, "E": 2, "G": 1, "H": 1}}, // scripts/cpm-optimum.ts
    terms: { deadline: 21, overhead: 0, ld: null },
    acts: [
      { id: "A", name: "Survey & layout", d: 2, pred: [] },
      { id: "B", name: "Abutment excavation", d: 3, pred: ["A"], min: 2, cost: 3000 },
      { id: "C", name: "Abutment concrete", d: 5, pred: ["B"], min: 4, cost: 6000 },
      { id: "D", name: "Fabricate trusses (shop)", d: 10, pred: ["A"], min: 7, cost: 4000 },
      { id: "E", name: "Cure abutments", d: 7, pred: ["C"], min: 5, cost: 5000 },
      { id: "F", name: "Erect trusses", d: 3, pred: ["D", "E"], min: 2, cost: 8000 },
      { id: "G", name: "Deck & railings", d: 4, pred: ["F"], min: 3, cost: 3500 },
      { id: "H", name: "Painting & touch-up", d: 3, pred: ["G"], min: 2, cost: 2500 },
    ],
  },
  {
    id: 5, name: "Two-storey house finishing", mode: "crash",
    blurb: "Every site day costs overhead; finishing after day 25 costs liquidated damages too. Crash only where it pays.",
    best: {total: 101900, T: 25, crash: {"C": 1, "F": 3, "H": 3, "I": 1}}, // scripts/cpm-optimum.ts
    terms: { deadline: 25, overhead: 3000, ld: 6000 },
    acts: [
      { id: "A", name: "Ceiling framing", d: 5, pred: [], min: 4, cost: 2500 },
      { id: "B", name: "Electrical rough-in", d: 6, pred: [], min: 4, cost: 3000 },
      { id: "C", name: "Plumbing rough-in", d: 5, pred: [], min: 4, cost: 3500 },
      { id: "D", name: "Ceiling boards", d: 6, pred: ["A", "B"], min: 4, cost: 2000 },
      { id: "E", name: "Wall tiles (T&B, kitchen)", d: 8, pred: ["C"], min: 6, cost: 4000 },
      { id: "F", name: "Floor tiles", d: 9, pred: ["D", "E"], min: 6, cost: 3500 },
      { id: "G", name: "Doors & windows", d: 4, pred: ["D"], min: 3, cost: 2500 },
      { id: "H", name: "Painting", d: 8, pred: ["F", "G"], min: 5, cost: 2800 },
      { id: "I", name: "Fixtures & testing", d: 3, pred: ["H"], min: 2, cost: 4500 },
    ],
  },
  {
    id: 6, name: "Barangay road", mode: "crash",
    blurb: "A 200 m concrete road. Overhead runs every day, LDs bite after day 34. Two crews, one batch plant.",
    best: {total: 379000, T: 34, crash: {"A": 1, "B": 1, "D": 2, "E": 1, "F": 2, "I": 6, "J": 1}}, // scripts/cpm-optimum.ts
    terms: { deadline: 34, overhead: 8000, ld: 15000 },
    acts: [
      { id: "A", name: "Mobilization & survey", d: 3, pred: [], min: 2, cost: 5000 },
      { id: "B", name: "Clearing & grubbing", d: 4, pred: ["A"], min: 3, cost: 6000 },
      { id: "C", name: "Drainage: pipe culverts", d: 8, pred: ["A"], min: 5, cost: 7000 },
      { id: "D", name: "Subgrade preparation", d: 6, pred: ["B"], min: 4, cost: 9000 },
      { id: "E", name: "Aggregate base course", d: 5, pred: ["D"], min: 4, cost: 10000 },
      { id: "F", name: "PCCP pour, lane 1", d: 6, pred: ["E"], min: 4, cost: 12000 },
      { id: "G", name: "Cure lane 1 (14 days)", d: 14, pred: ["F"], min: 7, cost: 6500 },
      { id: "H", name: "PCCP pour, lane 2", d: 6, pred: ["F", "C"], min: 4, cost: 12000 },
      { id: "I", name: "Cure lane 2 (14 days)", d: 14, pred: ["H"], min: 7, cost: 6500 },
      { id: "J", name: "Shoulders, signs & cleanup", d: 4, pred: ["G", "I"], min: 3, cost: 5000 },
    ],
  },
];
export const cpmLevelById = (id: number) => CPM_LEVELS.find((l) => l.id === id) ?? CPM_LEVELS[0];
