// v2.10.0: material price list per rate set (code only; this batch carries the release notes).
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.10.0",
  batch_name: "Material price list per rate set",
  notes: [
    "Each labour rate set (e.g. PH Region X, PH Region IX, Brunei) now has its own material price list, in that set's currency",
    "Projects fill blank prices from, and save prices to, the list of the rate set picked in Costing",
    "My rates: the price list follows the selected set tab; adding a set can copy prices from a set with the same currency",
    "Your existing prices moved to the first set (PH Region X); other sets start empty",
  ],
  clauses: [],
  entries: [],
};
export default batch;
