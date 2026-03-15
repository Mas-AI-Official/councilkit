import type { CouncilKitSettings, WorkerRegistryEntry, WorkerResult } from "../types/council.js";
import type { WorkerAdapter } from "./types.js";
export declare function listSupportedBuiltinWorkers(): string[];
export declare function resolveWorkerAdapter(entry: WorkerRegistryEntry, settings: CouncilKitSettings): WorkerAdapter | undefined;
export declare function unsupportedWorkerResult(name: string, supportedWorkers: string[]): WorkerResult;
export declare function disabledWorkerResult(entry: WorkerRegistryEntry): WorkerResult;
export declare function unavailableAdapterResult(entry: WorkerRegistryEntry): WorkerResult;
