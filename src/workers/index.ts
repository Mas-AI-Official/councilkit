import type { WorkerResult } from "../types/council.js";
import { codexWorker } from "./codex.js";
import { geminiWorker } from "./gemini.js";
import { localWorker } from "./local.js";
import type { WorkerAdapter } from "./types.js";

const WORKERS = new Map<string, WorkerAdapter>([
  [codexWorker.name, codexWorker],
  [geminiWorker.name, geminiWorker],
  [localWorker.name, localWorker]
]);

export function listSupportedWorkers(): string[] {
  return [...WORKERS.keys()];
}

export function getWorker(name: string): WorkerAdapter | undefined {
  return WORKERS.get(name);
}

export function unsupportedWorkerResult(name: string): WorkerResult {
  return {
    worker_name: name,
    status: "error",
    stdout: "",
    stderr: `Unsupported worker "${name}". Supported workers: ${listSupportedWorkers().join(", ")}.`,
    duration_ms: 0,
    command: "(unsupported worker)"
  };
}
