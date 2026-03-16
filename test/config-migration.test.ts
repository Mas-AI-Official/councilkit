import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadSettings } from "../src/core/config.js";

async function createFixture(config: unknown, fileName = "mergeloop.settings.json"): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mergeloop-config-test-"));
  await fs.writeFile(
    path.join(directory, fileName),
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
      directory: "~/.mergeloop/runs"
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
      directory: "~/.mergeloop/runs"
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

test("loads legacy councilkit.settings.json as a fallback alias", async () => {
  const cwd = await createFixture(
    {
      active_host: "generic_mcp_host",
      persistence: {
        enabled: true,
        directory: "~/.mergeloop/runs"
      }
    },
    "councilkit.settings.json"
  );

  const loaded = await loadSettings(cwd);
  assert.equal(path.basename(loaded.configPath ?? ""), "councilkit.settings.json");
  assert.equal(loaded.settings.active_host, "generic_mcp_host");
});

test("loads legacy COUNCILKIT_CONFIG env var as a fallback alias", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mergeloop-config-env-test-"));
  const legacyPath = path.join(cwd, "legacy-config.json");
  await fs.writeFile(
    legacyPath,
    `${JSON.stringify(
      {
        active_host: "gemini_cli",
        persistence: {
          enabled: true,
          directory: "~/.mergeloop/runs"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const previous = process.env.COUNCILKIT_CONFIG;
  delete process.env.MERGELOOP_CONFIG;
  process.env.COUNCILKIT_CONFIG = legacyPath;

  try {
    const loaded = await loadSettings(cwd);
    assert.equal(loaded.configPath, legacyPath);
    assert.equal(loaded.settings.active_host, "gemini_cli");
  } finally {
    if (previous === undefined) {
      delete process.env.COUNCILKIT_CONFIG;
    } else {
      process.env.COUNCILKIT_CONFIG = previous;
    }
  }
});
