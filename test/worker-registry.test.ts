import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadSettings } from "../src/core/config.js";
import { buildWorkerRegistry } from "../src/core/worker-registry.js";

async function createFixture(config: unknown, mcpConfig?: unknown): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "councilkit-registry-test-"));
  await fs.writeFile(
    path.join(directory, "councilkit.settings.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );

  if (mcpConfig) {
    await fs.writeFile(path.join(directory, "mcp.test.json"), `${JSON.stringify(mcpConfig, null, 2)}\n`, "utf8");
  }

  return directory;
}

test("discovery registers only metadata-hinted MCP workers and applies include/exclude rules", async () => {
  const cwd = await createFixture(
    {
      discovery: {
        enabled: true,
        mcp_config_paths: ["mcp.test.json"],
        auto_register_mcp_workers: true,
        require_worker_metadata: true,
        include: ["disc_*"],
        exclude: ["disc_beta"],
        mcp_worker_hints: {
          alpha_server: {
            id: "disc_alpha",
            adapter_type: "cli",
            command: "alpha-cli \"{task}\"",
            enabled: true
          },
          beta_server: {
            id: "disc_beta",
            adapter_type: "cli",
            command: "beta-cli \"{task}\"",
            enabled: true
          }
        }
      },
      persistence: {
        enabled: false,
        directory: "~/.councilkit/runs"
      }
    },
    {
      mcpServers: {
        alpha_server: {
          command: "alpha-cli"
        },
        beta_server: {
          command: "beta-cli"
        },
        unknown_server: {
          command: "unknown-cli"
        }
      }
    }
  );

  const { settings } = await loadSettings(cwd);
  const registry = await buildWorkerRegistry(settings, cwd);
  const ids = registry.entries.map((entry) => entry.id);

  assert.ok(ids.includes("disc_alpha"));
  assert.ok(!ids.includes("disc_beta"));
  assert.ok(!ids.includes("unknown_server"));
});

test("discovery can disable selected workers and auto-register CLI candidates", async () => {
  const cwd = await createFixture({
    discovery: {
      enabled: true,
      auto_register_cli_workers: true,
      disabled_workers: ["candidate_two"],
      cli_candidates: {
        candidate_one: {
          type: "cli",
          enabled: true,
          command: "worker-one \"{task}\"",
          role_tags: ["general"]
        },
        candidate_two: {
          type: "cli",
          enabled: true,
          command: "worker-two \"{task}\"",
          role_tags: ["research"]
        }
      }
    },
    persistence: {
      enabled: false,
      directory: "~/.councilkit/runs"
    }
  });

  const { settings } = await loadSettings(cwd);
  const registry = await buildWorkerRegistry(settings, cwd);
  const one = registry.entries.find((entry) => entry.id === "candidate_one");
  const two = registry.entries.find((entry) => entry.id === "candidate_two");

  assert.ok(one);
  assert.ok(two);
  assert.equal(one?.enabled, true);
  assert.equal(two?.enabled, false);
});
