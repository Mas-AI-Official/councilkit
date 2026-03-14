import { parseCommand } from "../core/command.js";
import { parseJsonFromText } from "../core/json.js";
function shouldRetryPlainText(stdout, stderr) {
    const combined = `${stdout}\n${stderr}`.toLowerCase();
    return (combined.includes("unknown option") ||
        combined.includes("unknown flag") ||
        combined.includes("unrecognized option") ||
        combined.includes("did you mean"));
}
async function executeGeminiAttempt(baseCommand, args, timeoutMs, context, runner) {
    const parsed = parseCommand(baseCommand);
    return runner.execute({
        executable: parsed.executable,
        args: [...parsed.args, ...args],
        timeoutMs,
        cwd: context.cwd,
        env: process.env
    });
}
export const geminiWorker = {
    name: "gemini",
    async run(context, runner) {
        const attemptedCommands = [];
        const timeoutMs = context.settings.timeouts.gemini_ms;
        const firstAttempt = await executeGeminiAttempt(context.settings.gemini_command, ["-p", context.task, "--output-format", "json"], timeoutMs, context, runner);
        attemptedCommands.push(firstAttempt.command);
        let finalAttempt = firstAttempt;
        if (firstAttempt.status === "error" && shouldRetryPlainText(firstAttempt.stdout, firstAttempt.stderr)) {
            const fallbackAttempt = await executeGeminiAttempt(context.settings.gemini_command, ["-p", context.task], timeoutMs, context, runner);
            attemptedCommands.push(fallbackAttempt.command);
            finalAttempt = fallbackAttempt;
        }
        return {
            worker_name: "gemini",
            status: finalAttempt.status,
            stdout: finalAttempt.stdout,
            stderr: finalAttempt.stderr,
            parsed_json_if_any: parseJsonFromText(finalAttempt.stdout),
            duration_ms: finalAttempt.durationMs,
            command: finalAttempt.command,
            attempted_commands: attemptedCommands,
            exit_code: finalAttempt.exitCode
        };
    }
};
//# sourceMappingURL=gemini.js.map