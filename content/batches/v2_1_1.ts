// v2.1.1: Truss Builder live cost meter.
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.1.1",
  batch_name: "Truss Builder: live cost meter",
  notes: [
    "Truss Builder shows the bridge cost live at the top of the canvas: every joint, member, section change, delete and undo updates it, with a +₱ / −₱ flash for the change",
    "The bar fills against the budget with 3★ (≤ 90%) and 2★ (100%) marks; it turns amber in the 2★ zone and red when over budget, and shows ₱ left or ₱ over",
    "Breakdown under the bar: steel kg and ₱, joints × ₱1,200 (both trusses). Loose joints are flagged: every joint on the canvas is paid for",
    "On a computer, hovering the next joint in Members mode previews the cost of that member. A selected member shows its length, weight and cost. Section list shows ₱ per metre; results table has a cost column",
  ],
  clauses: [],
  entries: [],
};
export default batch;
