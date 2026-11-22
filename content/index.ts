import type { Batch } from "./types";
import v040 from "./batches/v0_4_0";

/** All content batches managed as code. Older batches (v0.1–v0.3) were seeded by SQL migrations. */
export const BATCHES: Batch[] = [v040];
