import type { WorkerResult } from "../types/council.js";
import type { WorkerAdapter } from "./types.js";
export declare function listSupportedWorkers(): string[];
export declare function getWorker(name: string): WorkerAdapter | undefined;
export declare function unsupportedWorkerResult(name: string): WorkerResult;
