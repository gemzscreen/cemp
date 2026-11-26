// v2.6.0: darkwizscroll shows CEMP Practice cards.
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.6.0",
  batch_name: "darkwizscroll: CEMP Practice cards",
  notes: [
    "darkwizscroll now pulls Practice entries from CEMP as cards in a new 'CEMP Practices' topic: title, summary, diagram, Do and Avoid lists, code references and 'Open in CEMP'",
    "Published entries show a 'Verified in CEMP' badge. Editors and the admin can choose 'Include in review' in darkwizscroll → More, to see entries still in review (badge: In review · not yet verified)",
    "CEMP stays the only place where Practice content is written and verified; edits and publishing in CEMP show up in the feed on the next visit",
    "Cards are cached on the device, so the feed still works offline; they are searchable in the darkwizscroll Library and can be saved like any card",
  ],
  clauses: [],
  entries: [],
};
export default batch;
