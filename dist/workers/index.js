import { codexWorker } from "./codex.js";
import { createCliWorkerAdapter, getCustomWorker } from "./custom.js";
import { geminiWorker } from "./gemini.js";
import { localWorker } from "./local.js";
import { ollamaWorker } from "./ollama.js";
const BUILTIN_WORKERS = new Map([
    [codexWorker.name, codexWorker],
    [geminiWorker.name, geminiWorker],
    [localWorker.name, localWorker],
    [ollamaWorker.name, ollamaWorker]
]);
export function listSupportedBuiltinWorkers() {
    return [...BUILTIN_WORKERS.keys()];
}
export function resolveWorkerAdapter(entry, settings) {
    const builtin = BUILTIN_WORKERS.get(entry.id);
    if (builtin) {
        return builtin;
    }
    if (entry.adapter_type === "cli" && entry.command) {
        return createCliWorkerAdapter(entry.id, {
            command: entry.command,
            timeout_ms: entry.timeout_ms,
            output_format: entry.output_format
        });
    }
    return getCustomWorker(entry.id, settings);
}
export function unsupportedWorkerResult(name, supportedWorkers) {
    return {
        worker_name: name,
        status: "error",
        stdout: "",
        stderr: `Unsupported worker "${name}". Supported workers: ${supportedWorkers.join(", ")}.`,
        duration_ms: 0,
        command: "(unsupported worker)"
    };
}
export function disabledWorkerResult(entry) {
    return {
        worker_name: entry.id,
        status: "skipped",
        stdout: "",
        stderr: `Worker "${entry.id}" is disabled in configuration.`,
        duration_ms: 0,
        command: entry.command ?? "(disabled)"
    };
}
export function unavailableAdapterResult(entry) {
    return {
        worker_name: entry.id,
        status: "error",
        stdout: "",
        stderr: `Worker "${entry.id}" uses adapter type "${entry.adapter_type}" which is not active in this runtime.`,
        duration_ms: 0,
        command: entry.command ?? entry.url ?? "(adapter unavailable)"
    };
}
//# sourceMappingURL=index.js.map