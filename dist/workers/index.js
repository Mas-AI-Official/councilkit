import { codexWorker } from "./codex.js";
import { getCustomWorker } from "./custom.js";
import { geminiWorker } from "./gemini.js";
import { localWorker } from "./local.js";
const WORKERS = new Map([
    [codexWorker.name, codexWorker],
    [geminiWorker.name, geminiWorker],
    [localWorker.name, localWorker]
]);
export function listSupportedWorkers() {
    return [...WORKERS.keys()];
}
export function getWorker(name) {
    return WORKERS.get(name);
}
export function resolveWorker(name, settings) {
    return getWorker(name) ?? getCustomWorker(name, settings);
}
export function listAvailableWorkers(settings) {
    return [...listSupportedWorkers(), ...Object.keys(settings.custom_workers ?? {})];
}
export function unsupportedWorkerResult(name, settings) {
    return {
        worker_name: name,
        status: "error",
        stdout: "",
        stderr: `Unsupported worker "${name}". Supported workers: ${listAvailableWorkers(settings).join(", ")}.`,
        duration_ms: 0,
        command: "(unsupported worker)"
    };
}
//# sourceMappingURL=index.js.map