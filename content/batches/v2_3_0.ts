// v2.3.0: Truss Builder patches.
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.3.0",
  batch_name: "Truss Builder: drag joints, deck types, BS 5950, crowd crossing",
  notes: [
    "Drag joints to move them: with a mouse drag any joint; on a phone tap the joint first, then drag it. The cost meter follows the move",
    "Deck type menu: timber planks, steel grating, precast concrete planks or a 100 mm RC slab. Each changes the dead load and has its own budget",
    "Design code menu: AISC 360-10 / NSCP 2015 (standard) or BS 5950-1:2000 (1.4D + 1.6L, Perry–Robertson strut curve c, angle tension rules). BS mode is marked verify",
    "Crowd loading: members are now checked for the crowd on any run of panels from either end, not only the full span. Diagonals can see 1.5–2.8× their full-span force",
    "Crowd crossing animation: people walk across, the truss sags (exaggerated) and members change colour with their utilisation, with the worst ratio so far",
    "Budgets re-calibrated for every level × deck × code. Standard settings: levels 5 and 6 now ₱102,000 and ₱191,000. Stars count in any setting; best cost only on the standard setting",
  ],
  clauses: [],
  entries: [],
};
export default batch;
