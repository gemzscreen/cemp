// v2.0.0: Games. Truss Builder (engine in lib/truss, UI in components/TrussBuilder.tsx). No library content in this batch;
// the batch records the release notes shown on the dashboard.
import type { Batch } from "../types";

const batch: Batch = {
  version: "v2.0.0",
  batch_name: "Games: Truss Builder",
  notes: [
    "New Games section with Truss Builder: span a gap with steel angles, double angles, square tubes and pipes",
    "Every member is checked to AISC 360-10 / NSCP 2015 (tension yielding and rupture, compression buckling, slenderness) under 1.4D and 1.2D + 1.6L; live-load deflection ≤ L/360",
    "6 levels (6 to 24 m), ₱ cost from steel weight and joints, up to 3 stars per level; Pratt, Howe and Warren starter templates",
    "Tap any member for the full step-by-step check. Works offline; runs sync to your account when you are back online",
  ],
  clauses: [],
  entries: [],
};

export default batch;
