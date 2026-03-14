import type { WorkerResult } from "../types/council.js";
import type { CouncilKitSettings } from "../types/council.js";
import type { WorkerAdapter } from "./types.js";
export declare function listSupportedWorkers(): string[];
export declare function getWorker(name: string): WorkerAdapter | undefined;
export declare function resolveWorker(name: string, settings: CouncilKitSettings): WorkerAdapter | undefined;
export declare function listAvailableWorkers(settings: CouncilKitSettings): string[];
export declare function unsupportedWorkerResult(name: string, settings: CouncilKitSettings): WorkerResult;
