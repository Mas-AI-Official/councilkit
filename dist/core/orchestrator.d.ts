import type { CommandRunner } from "./subprocess.js";
import type { CouncilRunInput, CouncilRunOutput } from "../types/council.js";
export declare class CouncilOrchestrator {
    private readonly runner;
    constructor(runner?: CommandRunner);
    run(input: CouncilRunInput, cwd?: string): Promise<CouncilRunOutput>;
}
