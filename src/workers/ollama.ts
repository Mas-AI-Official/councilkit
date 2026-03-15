import { parseCommand } from "../core/command.js";
import { parseJsonFromText } from "../core/json.js";
import type { CommandRunner } from "../core/subprocess.js";
import type { WorkerResult } from "../types/council.js";
import type { WorkerAdapter, WorkerContext } from "./types.js";

function buildOllamaCommand(context: WorkerContext): { executable: string; args: string[] } {
  const command = context.settings.ollama_command ?? "ollama";
  const model = context.settings.ollama_model ?? "llama3.1";
  if (command.includes("{task}")) {
    const parsedWithTask = parseCommand(command.replaceAll("{task}", context.task));
    return {
      executable: parsedWithTask.executable,
      args: parsedWithTask.args
    };
  }

  const parsed = parseCommand(command);

  if (parsed.args.length > 0) {
    return {
      executable: parsed.executable,
      args: [...parsed.args, context.task]
    };
  }

  return {
    executable: parsed.executable,
    args: ["run", model, context.task]
  };
}

export const ollamaWorker: WorkerAdapter = {
  name: "ollama",
  async run(context, runner): Promise<WorkerResult> {
    const parsed = buildOllamaCommand(context);
    const execution = await runner.execute({
      executable: parsed.executable,
      args: parsed.args,
      timeoutMs: context.settings.timeouts.ollama_ms ?? context.settings.timeouts.local_ms,
      cwd: context.cwd,
      env: process.env
    });

    return {
      worker_name: "ollama",
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
