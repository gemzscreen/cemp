// v2.4.0: second game, Critical Path Rush.
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.4.0",
  batch_name: "Games: Critical Path Rush",
  notes: [
    "New game on the Games hub: Critical Path Rush (6 levels), playable offline",
    "Levels 1–3 (water tank, septic tank, bungalow): tap the critical activities and give the project duration against the clock; the reveal shows ES/EF/LS/LF, total and free float, a Gantt chart and the worked forward and backward pass",
    "Levels 4–6 (footbridge, house finishing, barangay road): crash activities to meet the deadline at the lowest total cost: crash cost per day, site overhead per day and liquidated damages per day late. 3★ = the true optimum, found by checking every crash combination",
    "Liquidated damages in the game are a simplified ₱/day (marked verify); PH government rule: at least 1/10 of 1% of the unperformed portion per day of delay",
    "Dashboard and Games hub count stars across both games",
  ],
  clauses: [],
  entries: [],
};
export default batch;
