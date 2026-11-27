// v2.8.0: Night mode, dashboard badges, labour rate sets, game and darkwizscroll fixes.
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.8.0",
  batch_name: "Night mode, badges and labour rate sets",
  notes: [
    "Night / Light / Auto display switch in the header, like darkwizscroll (Auto follows your device)",
    "Red badges on the dashboard cards: entries waiting for review, games in progress, projects not quoted yet, new darkwizscroll cards, plus a Needs attention strip",
    "My rates: several labour rate sets (e.g. PH Region X, PH Region IX, Brunei) with their own currency and VAT setting; each project picks one in Costing, and a Brunei set quotes in B$ without VAT",
    "Beam Optimizer controls aligned; Critical Path Rush arrows re-routed so none pass behind a box",
    "darkwizscroll: bigger Back to CEMP button and an accuracy review of every built-in card",
  ],
  clauses: [],
  entries: [],
};
export default batch;
