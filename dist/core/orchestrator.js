import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SpawnCommandRunner } from "./subprocess.js";
import { loadSettings } from "./config.js";
import { persistRun } from "./persistence.js";
import { buildSynthesisInputs, detectDisagreements, recommendNextChecks } from "./synthesis.js";
import { resolveWorker, unsupportedWorkerResult } from "../workers/index.js";
function normalizeWorkers(inputWorkers, fallbackWorkers) {
    const workers = inputWorkers?.filter((worker) => worker.trim().length > 0) ?? fallbackWorkers;
    return workers.length > 0 ? workers : fallbackWorkers;
}
function validateInput(input) {
    if (typeof input.task !== "string" || input.task.trim().length === 0) {
        throw new Error("council_run requires a non-empty task string.");
    }
    if (input.mode !== "single" && input.mode !== "council") {
        throw new Error('council_run mode must be "single" or "council".');
    }
    if (input.output_format !== undefined &&
        input.output_format !== "json" &&
        input.output_format !== "markdown") {
        throw new Error('council_run output_format must be "json" or "markdown".');
    }
}
export class CouncilOrchestrator {
    runner;
    constructor(runner = new SpawnCommandRunner()) {
        this.runner = runner;
    }
    async run(input, cwd = process.cwd()) {
        validateInput(input);
        const startedAt = new Date();
        const { settings, configPath } = await loadSettings(cwd);
        const requestedWorkers = normalizeWorkers(input.workers, settings.default_workers);
        const selectedWorkers = input.mode === "single" ? requestedWorkers.slice(0, 1) : requestedWorkers;
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "councilkit-"));
        try {
            const results = await Promise.all(selectedWorkers.map(async (workerName) => {
                const worker = resolveWorker(workerName, settings);
                if (!worker) {
                    return unsupportedWorkerResult(workerName, settings);
                }
                return worker.run({
                    task: input.task,
                    settings,
                    cwd,
                    tempDir
                }, this.runner);
            }));
            const synthesisInputs = buildSynthesisInputs(results);
            const disagreements = detectDisagreements(synthesisInputs, results);
            const recommendedNextChecks = recommendNextChecks(synthesisInputs, results);
            const finishedAt = new Date();
            const output = {
                task: input.task,
                mode: input.mode,
                output_format: input.output_format ?? "json",
                results,
                synthesis_inputs: synthesisInputs,
                disagreements,
                recommended_next_checks: recommendedNextChecks,
                metadata: {
                    started_at: startedAt.toISOString(),
                    finished_at: finishedAt.toISOString(),
                    duration_ms: finishedAt.getTime() - startedAt.getTime(),
                    config_path: configPath,
                    selected_workers: selectedWorkers,
                    requested_mode: input.mode
                }
            };
            output.metadata.persisted_to = await persistRun(output, settings);
            return output;
        }
        finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }
}
//# sourceMappingURL=orchestrator.js.map