import type { Batch } from "./types";
import v040 from "./batches/v0_4_0";
import v050 from "./batches/v0_5_0";
import v060 from "./batches/v0_6_0";
import v070 from "./batches/v0_7_0";
import v111 from "./batches/v1_1_1";

/** All content batches managed as code. Older batches (v0.1–v0.3) were seeded by SQL migrations. */
export const BATCHES: Batch[] = [v040, v050, v060, v070, v111];
