// v2.5.0: costing extras: my rates, trade-crew labour, quotation revisions.
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.5.0",
  batch_name: "Costing extras: rates, trade crews, quotation revisions",
  notes: [
    "My rates (Estimate menu → My rates): labour rates per trade (₱/day incl. benefits) and a material price list reused across projects",
    "On a project: '⇣ Fill blanks from my price list' fills unpriced materials; '⇡ Save prices to my list' stores this project's prices (as typed)",
    "Costing: new labour option 'Trade crew' for every calculator: work quantity ÷ output per crew-day × crew day cost (e.g. CHB 12 m² ÷ 10 m²/day = 1.5 days × 1 mason + 1 helper). Output is editable per item; presets are marked verify",
    "Default helper rate starts from the Region X minimum wage ₱500/day (Category I, from 1 May 2026) plus benefits; skilled rates are estimates to edit",
    "Quotations: 'Issue as Rev 0 / R1 / R2…' freezes a copy (number gets -R1, -R2); a Revisions table shows each issue, its total and what changed; old revisions open and print exactly as sent",
    "Excel export carries trade-crew labour (method 'trade') with live formulas",
  ],
  clauses: [],
  entries: [],
};
export default batch;
