export interface CommandSpec {
    executable: string;
    args: string[];
    timeoutMs: number;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdin?: string;
}
export interface CommandExecution {
    status: "success" | "error" | "timeout";
    stdout: string;
    stderr: string;
    durationMs: number;
    exitCode: number | null;
    command: string;
}
export interface CommandRunner {
    execute(spec: CommandSpec): Promise<CommandExecution>;
}
export declare class SpawnCommandRunner implements CommandRunner {
    execute(spec: CommandSpec): Promise<CommandExecution>;
}
