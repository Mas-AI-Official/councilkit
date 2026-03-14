import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CouncilOrchestrator } from "../src/index.js";
import type { CommandExecution, CommandRunner, CommandSpec } from "../src/core/subprocess.js";

class FakeRunner implements CommandRunner {
  public readonly calls: CommandSpec[] = [];

  constructor(
    private readonly handler: (spec: CommandSpec, callIndex: number) => Promise<CommandExecution> | CommandExecution
  ) {}

  async execute(spec: CommandSpec): Promise<CommandExecution> {
    this.calls.push(spec);
    return this.handler(spec, this.calls.length - 1);
  }
}

async function createFixture(config: unknown): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "councilkit-test-"));
  await fs.writeFile(
    path.join(directory, "councilkit.settings.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );
  return directory;
}

function success(spec: CommandSpec, stdout: string): CommandExecution {
  return {
    status: "success",
    stdout,
    stderr: "",
    durationMs: 10,
    exitCode: 0,
    command: `${spec.executable} ${spec.args.join(" ")}`
  };
}

function error(spec: CommandSpec, stderr: string): CommandExecution {
  return {
    status: "error",
    stdout: "",
    stderr,
    durationMs: 10,
    exitCode: 1,
    command: `${spec.executable} ${spec.args.join(" ")}`
  };
}

test("runs council mode with default workers, synthesis, and persistence", async () => {
  const persistenceDir = await fs.mkdtemp(path.join(os.tmpdir(), "councilkit-runs-"));
  const cwd = await createFixture({
    codex_command: "codex",
    gemini_command: "gemini",
    default_workers: ["codex", "gemini"],
    persistence: {
      enabled: true,
      directory: persistenceDir
    }
  });

  const runner = new FakeRunner((spec) => {
    if (spec.executable === "codex") {
      return success(
        spec,
        JSON.stringify({
          summary: "Implement the plugin and keep the MCP server bundled locally.",
          key_points: ["Bundle council-hub in the plugin", "Persist each run to disk"],
          risks: ["Plugin packaging may drift from upstream schema"],
          citations_needed: ["Confirm plugin manifest fields against Anthropic docs"]
        })
      );
    }

    return success(
      spec,
      JSON.stringify({
        summary: "Implement the server and document the local-only security model.",
        key_points: ["Explain no direct API calls", "Add Windows WSL guidance"],
        risks: ["Gemini CLI flags can differ by version"],
        citations_needed: ["Verify Gemini CLI JSON output support"]
      })
    );
  });

  const orchestrator = new CouncilOrchestrator(runner);
  const result = await orchestrator.run(
    {
      task: "Build councilkit",
      mode: "council",
      output_format: "json"
    },
    cwd
  );

  assert.equal(result.results.length, 2);
  assert.deepEqual(result.metadata.selected_workers, ["codex", "gemini"]);
  assert.ok(result.disagreements.length >= 1);
  assert.ok(
    result.recommended_next_checks.some((check) =>
      check.includes("Confirm plugin manifest fields against Anthropic docs")
    )
  );
  assert.ok(result.metadata.persisted_to);
  const persistedContent = await fs.readFile(result.metadata.persisted_to as string, "utf8");
  assert.match(persistedContent, /Build councilkit/);
});

test("single mode only runs the first selected worker", async () => {
  const cwd = await createFixture({
    codex_command: "codex",
    gemini_command: "gemini",
    default_workers: ["codex", "gemini"],
    persistence: {
      enabled: false,
      directory: "~/.councilkit/runs"
    }
  });

  const runner = new FakeRunner((spec) =>
    success(
      spec,
      JSON.stringify({
        summary: "Codex completed the task.",
        key_points: ["Only one worker should run"],
        risks: [],
        citations_needed: []
      })
    )
  );

  const orchestrator = new CouncilOrchestrator(runner);
  const result = await orchestrator.run(
    {
      task: "Use single worker mode",
      mode: "single"
    },
    cwd
  );

  assert.equal(result.results.length, 1);
  assert.equal(result.results[0]?.worker_name, "codex");
  assert.equal(runner.calls.length, 1);
});

test("codex retries without output schema when the installed CLI lacks the flag", async () => {
  const cwd = await createFixture({
    codex_command: "codex",
    gemini_command: "gemini",
    default_workers: ["codex"],
    codex: {
      use_output_schema: true
    },
    persistence: {
      enabled: false,
      directory: "~/.councilkit/runs"
    }
  });

  const runner = new FakeRunner((spec, callIndex) => {
    if (callIndex === 0) {
      return error(spec, "error: unknown option '--output-schema'");
    }

    return success(
      spec,
      JSON.stringify({
        summary: "Fallback invocation succeeded.",
        key_points: ["Retried without schema"],
        risks: [],
        citations_needed: []
      })
    );
  });

  const orchestrator = new CouncilOrchestrator(runner);
  const result = await orchestrator.run(
    {
      task: "Fallback test",
      mode: "single",
      workers: ["codex"]
    },
    cwd
  );

  assert.equal(result.results[0]?.status, "success");
  assert.equal(runner.calls.length, 2);
  assert.equal(result.results[0]?.attempted_commands?.length, 2);
});
