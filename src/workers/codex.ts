import fs from "node:fs/promises";
import path from "node:path";

import { parseCommand } from "../core/command.js";
import { parseJsonFromText } from "../core/json.js";
import { CODEX_OUTPUT_SCHEMA } from "../core/schema.js";
import type { CommandRunner } from "../core/subprocess.js";
import type { WorkerResult } from "../types/council.js";
import type { WorkerAdapter, WorkerContext } from "./types.js";

function shouldRetryWithoutSchema(stdout: string, stderr: string): boolean {
  const combined = `${stdout}\n${stderr}`.toLowerCase();
  return (
    combined.includes("unknown option") ||
    combined.includes("unrecognized option") ||
    combined.includes("unexpected argument") ||
    combined.includes("unknown argument") ||
    combined.includes("did you mean")
  );
}

async function executeCodexAttempt(
  baseCommand: string,
  args: string[],
  timeoutMs: number,
  context: WorkerContext,
  runner: CommandRunner
) {
  const parsed = parseCommand(baseCommand);
  return runner.execute({
    executable: parsed.executable,
    args: [...parsed.args, ...args],
    timeoutMs,
    cwd: context.cwd,
    env: process.env
  });
}

export const codexWorker: WorkerAdapter = {
  name: "codex",
  async run(context, runner): Promise<WorkerResult> {
    const attemptedCommands: string[] = [];
    const timeoutMs = context.settings.timeouts.codex_ms;

    let schemaPath: string | undefined;
    if (context.settings.codex.use_output_schema) {
      schemaPath = path.join(context.tempDir, "codex-output-schema.json");
      await fs.writeFile(schemaPath, JSON.stringify(CODEX_OUTPUT_SCHEMA, null, 2), "utf8");
    }

    const firstArgs = ["exec", "--json", "--output-last-message"];
    if (schemaPath) {
      firstArgs.push("--output-schema", schemaPath);
    }
    firstArgs.push(context.task);

    const firstAttempt = await executeCodexAttempt(
      context.settings.codex_command,
      firstArgs,
      timeoutMs,
      context,
      runner
    );
    attemptedCommands.push(firstAttempt.command);

    let finalAttempt = firstAttempt;
    if (
      firstAttempt.status === "error" &&
      schemaPath &&
      shouldRetryWithoutSchema(firstAttempt.stdout, firstAttempt.stderr)
    ) {
      const fallbackAttempt = await executeCodexAttempt(
        context.settings.codex_command,
        ["exec", "--json", "--output-last-message", context.task],
        timeoutMs,
        context,
        runner
      );
      attemptedCommands.push(fallbackAttempt.command);
      finalAttempt = fallbackAttempt;
    }

    return {
      worker_name: "codex",
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
