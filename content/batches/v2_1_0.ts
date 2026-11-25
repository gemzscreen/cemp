// v2.1.0: dashboard cards, Games hub, darkwizscroll inside CEMP, revise saved estimates, BOM by item, notes fix.
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.1.0",
  batch_name: "Projects, Games and darkwizscroll on the dashboard",
  notes: [
    "Dashboard: Games, Projects and darkwizscroll are now cards next to Tools, Practices, Codes, Conversions and Learn. Library menu lists them too",
    "Games is its own hub page with a card per game: Truss Builder now, six more coming",
    "darkwizscroll lives inside CEMP at /scroll (same sign-in). Community cards, roadmap votes and suggestions are stored in CEMP",
    "Projects: click a saved item (or 'revise') to reopen it in its calculator with the saved inputs, change them and Update item. Save as new item keeps the original",
    "Bill of materials is grouped by item (Painting → its materials, CHB wall → its materials) with subtotals; one unit price per material fills every item. Combined purchase list below",
    "Header: shorter brand (CEMP only) and new line icons for Dashboard, Learn and Games",
    "Notes: formulas written back to back ($a$$b$) no longer turn the following sentences into formula text",
  ],
  clauses: [],
  entries: [],
};
export default batch;
