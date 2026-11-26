import type { Batch } from "./types";
import v040 from "./batches/v0_4_0";
import v050 from "./batches/v0_5_0";
import v060 from "./batches/v0_6_0";
import v070 from "./batches/v0_7_0";
import v111 from "./batches/v1_1_1";
import v120 from "./batches/v1_2_0";
import v130 from "./batches/v1_3_0";
import v200 from "./batches/v2_0_0";
import v201 from "./batches/v2_0_1";
import v202 from "./batches/v2_0_2";
import v210 from "./batches/v2_1_0";
import v211 from "./batches/v2_1_1";
import v220 from "./batches/v2_2_0";
import v230 from "./batches/v2_3_0";
import v240 from "./batches/v2_4_0";
import v250 from "./batches/v2_5_0";

/** All content batches managed as code. Older batches (v0.1–v0.3) were seeded by SQL migrations. */
export const BATCHES: Batch[] = [v040, v050, v060, v070, v111, v120, v130, v200, v201, v202, v210, v211, v220, v230, v240, v250];
