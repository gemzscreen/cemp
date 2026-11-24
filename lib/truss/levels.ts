// Truss Builder levels. Each truss carries half the deck width. Loads are applied at the deck panel points.
// Live load and deflection limit follow pedestrian-bridge practice used for DPWH footbridges (AASHTO LRFD
// pedestrian bridge guide: 90 psf ≈ 4.3 kPa, L/360). VERIFY before treating any result as design.

export type Level = {
  id: number; name: string; blurb: string;
  span: number; panels: number;     // m, number of deck panels
  width: number;                    // deck width, m (two trusses)
  dl: number; ll: number;           // deck dead load and live load, kPa
  above: number; below: number;     // build area above / below the deck, m
  grid: number;                     // snap grid, m
  budget: number;                   // ₱ for 2 stars
  height: number;                   // template truss depth, m
};

export const LIVE_NOTE = "Live load 4.3 kPa and deflection limit L/360 follow pedestrian-bridge practice (AASHTO pedestrian guide, used for DPWH footbridges). Verify for real design.";
// Budgets: about 1.1 × the cheapest auto-sized template found during calibration (2 stars); 3 stars at ≤ 90% of budget.
export const JOINT_COST = 600; // ₱ per joint: gusset, welding/bolts, labour (indicative)

export const LEVELS: Level[] = [
  { id: 1, name: "Creek footbridge", blurb: "A short crossing to learn the basics: triangles carry load, rectangles fold.", span: 6, panels: 4, width: 1.2, dl: 1.0, ll: 4.3, above: 2.5, below: 1.5, grid: 0.5, height: 1.5, budget: 24000 },
  { id: 2, name: "Irrigation canal", blurb: "Longer span, same deck. Watch the top chord: it is in compression.", span: 9, panels: 6, width: 1.5, dl: 1.0, ll: 4.3, above: 3, below: 1.5, grid: 0.5, height: 1.5, budget: 39000 },
  { id: 3, name: "Barangay footbridge", blurb: "A school crossing. Slender diagonals in compression will buckle.", span: 12, panels: 6, width: 1.8, dl: 1.2, ll: 4.3, above: 3, below: 2, grid: 1, height: 2, budget: 50000 },
  { id: 4, name: "Pipe bridge", blurb: "Carries water mains: heavy dead load, light maintenance walkway.", span: 15, panels: 5, width: 1.2, dl: 3.5, ll: 2.0, above: 3, below: 2, grid: 1, height: 2.5, budget: 65000 },
  { id: 5, name: "River crossing", blurb: "Concrete deck planks add dead load. Deflection starts to govern.", span: 18, panels: 9, width: 2.0, dl: 1.8, ll: 4.3, above: 4, below: 2, grid: 1, height: 2.5, budget: 101000 },
  { id: 6, name: "Long-span walkway", blurb: "The big one. Depth is your friend; cost is your enemy.", span: 24, panels: 12, width: 2.4, dl: 1.8, ll: 4.3, above: 5, below: 2, grid: 1, height: 3, budget: 187000 },
];
export const levelById = (id: number) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
