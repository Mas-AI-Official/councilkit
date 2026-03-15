import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadSettings } from "../src/core/config.js";

async function createFixture(config: unknown): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "councilkit-config-test-"));
  await fs.writeFile(
    path.join(directory, "councilkit.settings.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );
  return directory;
}

test("maps legacy default_workers into routing fallback priority", async () => {
  const cwd = await createFixture({
    default_workers: ["gemx", "codex"],
    worker_registry: {
      gemx: {
        type: "cli",
        command: "gemx-cli",
        enabled: true
      }
    },
    persistence: {
      enabled: false,
      directory: "~/.councilkit/runs"
    }
  });

  const { settings } = await loadSettings(cwd);
  assert.deepEqual(settings.routing?.fallback_priority, ["gemx", "codex"]);
  assert.ok(settings.workers?.gemx);
});

test("worker command/timeouts override legacy runtime fields for built-ins", async () => {
  const cwd = await createFixture({
    workers: {
      codex: {
        type: "cli",
        command: "codex --profile team",
        timeout_ms: 123000,
        enabled: true
      },
      gemini: {
        type: "cli",
        command: "gemini --sandbox",
        timeout_ms: 124000,
        enabled: true
      },
      local: {
        type: "cli",
        command: "python local_runner.py \"{task}\"",
        timeout_ms: 125000,
        enabled: true
      },
      ollama: {
        type: "cli",
        command: "ollama run llama3.2 \"{task}\"",
        timeout_ms: 126000,
        enabled: true
      }
    },
    persistence: {
      enabled: false,
      directory: "~/.councilkit/runs"
    }
  });

  const { settings } = await loadSettings(cwd);
  assert.equal(settings.codex_command, "codex --profile team");
  assert.equal(settings.gemini_command, "gemini --sandbox");
  assert.equal(settings.local_command, "python local_runner.py \"{task}\"");
  assert.equal(settings.ollama_command, "ollama run llama3.2 \"{task}\"");
  assert.equal(settings.timeouts.codex_ms, 123000);
  assert.equal(settings.timeouts.gemini_ms, 124000);
  assert.equal(settings.timeouts.local_ms, 125000);
  assert.equal(settings.timeouts.ollama_ms, 126000);
});
