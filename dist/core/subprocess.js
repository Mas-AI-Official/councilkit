import { spawn } from "node:child_process";
import { formatCommand } from "./command.js";
export class SpawnCommandRunner {
    async execute(spec) {
        const started = Date.now();
        const isWindows = process.platform === "win32";
        const commandText = formatCommand(spec.executable, spec.args, isWindows);
        return new Promise((resolve) => {
            let stdout = "";
            let stderr = "";
            let settled = false;
            let timedOut = false;
            let spawnError;
            const child = isWindows
                ? spawn("cmd.exe", ["/d", "/s", "/c", commandText], {
                    cwd: spec.cwd,
                    env: spec.env,
                    windowsHide: true,
                    stdio: "pipe"
                })
                : spawn(spec.executable, spec.args, {
                    cwd: spec.cwd,
                    env: spec.env,
                    windowsHide: true,
                    stdio: "pipe"
                });
            const timeout = setTimeout(() => {
                timedOut = true;
                child.kill("SIGTERM");
            }, spec.timeoutMs);
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => {
                stdout += chunk;
            });
            child.stderr.on("data", (chunk) => {
                stderr += chunk;
            });
            child.on("error", (error) => {
                spawnError = error;
            });
            child.on("close", (exitCode) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                const durationMs = Date.now() - started;
                if (timedOut) {
                    resolve({
                        status: "timeout",
                        stdout,
                        stderr: stderr || `Command timed out after ${spec.timeoutMs}ms.`,
                        durationMs,
                        exitCode,
                        command: commandText
                    });
                    return;
                }
                if (spawnError) {
                    resolve({
                        status: "error",
                        stdout,
                        stderr: stderr || spawnError.message,
                        durationMs,
                        exitCode,
                        command: commandText
                    });
                    return;
                }
                if (exitCode === 0) {
                    resolve({
                        status: "success",
                        stdout,
                        stderr,
                        durationMs,
                        exitCode,
                        command: commandText
                    });
                    return;
                }
                resolve({
                    status: "error",
                    stdout,
                    stderr: stderr || `Command exited with code ${exitCode ?? "unknown"}.`,
                    durationMs,
                    exitCode,
                    command: commandText
                });
            });
            if (spec.stdin) {
                child.stdin.write(spec.stdin);
            }
            child.stdin.end();
        });
    }
}
//# sourceMappingURL=subprocess.js.map