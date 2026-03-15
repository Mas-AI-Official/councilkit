import type { CouncilKitSettings } from "../types/council.js";
import type { WorkerAdapter } from "./types.js";
export declare function createCliWorkerAdapter(name: string, config: {
    command: string;
    timeout_ms?: number;
    output_format?: "auto" | "json" | "text";
}): WorkerAdapter;
export declare function getCustomWorker(name: string, settings: CouncilKitSettings): WorkerAdapter | undefined;
