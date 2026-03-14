import { codexWorker } from "./codex.js";
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
export function unsupportedWorkerResult(name) {
    return {
        worker_name: name,
        status: "error",
        stdout: "",
        stderr: `Unsupported worker "${name}". Supported workers: ${listSupportedWorkers().join(", ")}.`,
        duration_ms: 0,
        command: "(unsupported worker)"
    };
}
//# sourceMappingURL=index.js.map