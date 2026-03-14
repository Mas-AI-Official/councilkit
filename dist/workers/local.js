import { parseCommand } from "../core/command.js";
import { parseJsonFromText } from "../core/json.js";
function buildLocalArgs(baseCommand, task) {
    if (baseCommand.includes("{task}")) {
        const parsed = parseCommand(baseCommand.replaceAll("{task}", task));
        return {
            executable: parsed.executable,
            args: parsed.args
        };
    }
    const parsed = parseCommand(baseCommand);
    return {
        executable: parsed.executable,
        args: [...parsed.args, task]
    };
}
export const localWorker = {
    name: "local",
    async run(context, runner) {
        if (!context.settings.local_command) {
            return {
                worker_name: "local",
                status: "error",
                stdout: "",
                stderr: "local worker requested but local_command is not configured.",
                duration_ms: 0,
                command: "(not configured)"
            };
        }
        const parsed = buildLocalArgs(context.settings.local_command, context.task);
        const execution = await runner.execute({
            executable: parsed.executable,
            args: parsed.args,
            timeoutMs: context.settings.timeouts.local_ms,
            cwd: context.cwd,
            env: process.env
        });
        return {
            worker_name: "local",
            status: execution.status,
            stdout: execution.stdout,
            stderr: execution.stderr,
            parsed_json_if_any: parseJsonFromText(execution.stdout),
            duration_ms: execution.durationMs,
            command: execution.command,
            attempted_commands: [execution.command],
            exit_code: execution.exitCode
        };
    }
};
//# sourceMappingURL=local.js.map