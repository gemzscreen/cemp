// Truss Builder levels. Each truss carries half the deck width. Loads are applied at the deck panel points.
// Live load and deflection limit follow pedestrian-bridge practice used for DPWH footbridges (AASHTO LRFD
// pedestrian bridge guide: 90 psf ≈ 4.3 kPa, L/360). VERIFY before treating any result as design.

// v2.3.0: deck types (dead load of deck + stringers, kPa) and design codes. Typical values for the game: VERIFY.
export type DeckKey = "timber" | "grating" | "planks" | "rcslab";
export const DECKS: Record<DeckKey, { name: string; dl: number; note: string }> = {
  timber: { name: "Timber planks", dl: 1.0, note: "50 mm hardwood planks on timber stringers" },
  grating: { name: "Steel grating", dl: 0.5, note: "Steel bar grating on light steel stringers" },
  planks: { name: "Precast concrete planks", dl: 1.8, note: "Thin precast planks on steel stringers" },
  rcslab: { name: "RC slab 100 mm", dl: 2.6, note: "100 mm cast-in-place slab (2.4 kPa) + topping on stringers" },
};
export type CodeKey = "aisc" | "bs";
export const CODES: Record<CodeKey, { name: string; short: string; combos: string }> = {
  aisc: { name: "AISC 360-10 / NSCP 2015 (LRFD)", short: "NSCP / AISC", combos: "1.4D and 1.2D + 1.6L" },
  bs: { name: "BS 5950-1:2000", short: "BS 5950", combos: "1.4D + 1.6L" },
};
export type Settings = { deck: DeckKey; code: CodeKey };

export type Level = {
  id: number; name: string; blurb: string;
  span: number; panels: number;     // m, number of deck panels
  width: number;                    // deck width, m (two trusses)
  deck: DeckKey;                    // default deck
  extra: number;                    // other dead load on the deck, kPa (railings, pipes, services)
  dl: number; ll: number;           // deck dead load with the default deck (= deck + extra) and live load, kPa
  above: number; below: number;     // build area above / below the deck, m
  grid: number;                     // snap grid, m
  budget: number;                   // ₱ for 2 stars, default deck + AISC (see budgetFor)
  height: number;                   // template truss depth, m
};

export const LIVE_NOTE = "Live load 4.3 kPa and deflection limit L/360 follow pedestrian-bridge practice (AASHTO pedestrian guide, used for DPWH footbridges). Verify for real design.";
// Budgets: about 1.1 × the cheapest auto-sized template found during calibration (2 stars); 3 stars at ≤ 90% of budget.
export const JOINT_COST = 600; // ₱ per joint: gusset, welding/bolts, labour (indicative)

export const LEVELS: Level[] = [
  { id: 1, deck: "timber", extra: 0, name: "Creek footbridge", blurb: "A short crossing to learn the basics: triangles carry load, rectangles fold.", span: 6, panels: 4, width: 1.2, dl: 1.0, ll: 4.3, above: 2.5, below: 1.5, grid: 0.5, height: 1.5, budget: 24000 },
  { id: 2, deck: "timber", extra: 0, name: "Irrigation canal", blurb: "Longer span, same deck. Watch the top chord: it is in compression.", span: 9, panels: 6, width: 1.5, dl: 1.0, ll: 4.3, above: 3, below: 1.5, grid: 0.5, height: 1.5, budget: 39000 },
  { id: 3, deck: "timber", extra: 0.2, name: "Barangay footbridge", blurb: "A school crossing. Slender diagonals in compression will buckle.", span: 12, panels: 6, width: 1.8, dl: 1.2, ll: 4.3, above: 3, below: 2, grid: 1, height: 2, budget: 50000 },
  { id: 4, deck: "grating", extra: 3.0, name: "Pipe bridge", blurb: "Carries water mains: heavy dead load, light maintenance walkway.", span: 15, panels: 5, width: 1.2, dl: 3.5, ll: 2.0, above: 3, below: 2, grid: 1, height: 2.5, budget: 65000 },
  { id: 5, deck: "planks", extra: 0, name: "River crossing", blurb: "Concrete deck planks add dead load. Deflection starts to govern.", span: 18, panels: 9, width: 2.0, dl: 1.8, ll: 4.3, above: 4, below: 2, grid: 1, height: 2.5, budget: 102000 },
  { id: 6, deck: "planks", extra: 0, name: "Long-span walkway", blurb: "The big one. Depth is your friend; cost is your enemy.", span: 24, panels: 12, width: 2.4, dl: 1.8, ll: 4.3, above: 5, below: 2, grid: 1, height: 3, budget: 191000 },
];
/** Deck dead load for a setting: chosen deck + the level's other dead load. */
export const dlOf = (lv: Level, deck: DeckKey = lv.deck) => Math.round((DECKS[deck].dl + lv.extra) * 100) / 100;
export const defaultSettings = (lv: Level): Settings => ({ deck: lv.deck, code: "aisc" });
export const isDefault = (lv: Level, s: Settings) => s.deck === lv.deck && s.code === "aisc";

/** v2.3.0 budgets per level × deck × code (2 stars), from scripts/truss-calibrate.ts. Re-run it if loads, prices,
 *  sections or JOINT_COST change. Keys: "<deck>-<code>". */
export const BUDGETS: Record<number, Record<string, number>> = {"1":{"timber-aisc":24000,"timber-bs":24000,"grating-aisc":23000,"grating-bs":24000,"planks-aisc":24000,"planks-bs":24000,"rcslab-aisc":24000,"rcslab-bs":24000},"2":{"timber-aisc":39000,"timber-bs":40000,"grating-aisc":38000,"grating-bs":39000,"planks-aisc":40000,"planks-bs":41000,"rcslab-aisc":40000,"rcslab-bs":41000},"3":{"timber-aisc":50000,"timber-bs":52000,"grating-aisc":50000,"grating-bs":51000,"planks-aisc":52000,"planks-bs":55000,"rcslab-aisc":52000,"rcslab-bs":56000},"4":{"timber-aisc":65000,"timber-bs":69000,"grating-aisc":65000,"grating-bs":66000,"planks-aisc":66000,"planks-bs":70000,"rcslab-aisc":69000,"rcslab-bs":73000},"5":{"timber-aisc":100000,"timber-bs":103000,"grating-aisc":100000,"grating-bs":101000,"planks-aisc":102000,"planks-bs":105000,"rcslab-aisc":106000,"rcslab-bs":108000},"6":{"timber-aisc":178000,"timber-bs":188000,"grating-aisc":175000,"grating-bs":178000,"planks-aisc":191000,"planks-bs":195000,"rcslab-aisc":197000,"rcslab-bs":217000}};
export const budgetFor = (lv: Level, s: Settings) => BUDGETS[lv.id]?.[`${s.deck}-${s.code}`] ?? lv.budget;

export const levelById = (id: number) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
