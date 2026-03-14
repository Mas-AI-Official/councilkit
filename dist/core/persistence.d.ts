import type { CouncilKitSettings, CouncilRunOutput } from "../types/council.js";
export declare function persistRun(result: CouncilRunOutput, settings: CouncilKitSettings): Promise<string | undefined>;
