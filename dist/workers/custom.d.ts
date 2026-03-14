import type { CouncilKitSettings } from "../types/council.js";
import type { WorkerAdapter } from "./types.js";
export declare function getCustomWorker(name: string, settings: CouncilKitSettings): WorkerAdapter | undefined;
