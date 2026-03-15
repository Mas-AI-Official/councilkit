import { parseCommand } from "../core/command.js";
import { parseJsonFromText } from "../core/json.js";
function buildArgs(command, task) {
    if (command.includes("{task}")) {
        const parsed = parseCommand(command.replaceAll("{task}", task));
        return {
            executable: parsed.executable,
            args: parsed.args
        };
    }
    const parsed = parseCommand(command);
    return {
        executable: parsed.executable,
        args: [...parsed.args, task]
    };
}
export function createCliWorkerAdapter(name, config) {
    return {
        name,
        async run(context, runner) {
            const parsed = buildArgs(config.command, context.task);
            const execution = await runner.execute({
                executable: parsed.executable,
                args: parsed.args,
                timeoutMs: config.timeout_ms ?? context.settings.timeouts.local_ms,
                cwd: context.cwd,
                env: process.env
            });
            const shouldParseJson = config.output_format !== "text";
            return {
                worker_name: name,
                status: execution.status,
                stdout: execution.stdout,
                stderr: execution.stderr,
                parsed_json_if_any: shouldParseJson ? parseJsonFromText(execution.stdout) : undefined,
                duration_ms: execution.durationMs,
                command: execution.command,
                attempted_commands: [execution.command],
                exit_code: execution.exitCode
            };
        }
    };
}
export function getCustomWorker(name, settings) {
    const config = settings.custom_workers?.[name];
    if (!config) {
        return undefined;
    }
    return createCliWorkerAdapter(name, config);
}
//# sourceMappingURL=custom.js.map