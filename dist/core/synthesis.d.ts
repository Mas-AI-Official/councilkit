import type { CouncilRunOutput, WorkerResult, WorkerSynthesisInput } from "../types/council.js";
export declare function buildSynthesisInputs(results: WorkerResult[]): WorkerSynthesisInput[];
export declare function detectDisagreements(synthesisInputs: WorkerSynthesisInput[], results: WorkerResult[]): string[];
export declare function recommendNextChecks(synthesisInputs: WorkerSynthesisInput[], results: WorkerResult[]): string[];
export declare function formatCouncilRunMarkdown(result: CouncilRunOutput): string;
