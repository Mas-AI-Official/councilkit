import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  mergeMcpServerEntry,
  removeMcpServerEntry,
  upsertMcpServerConfig,
  removeMcpServerConfig
} from "../scripts/lib/host-config.mjs";

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "councilkit-hostcfg-test-"));
}

test("mergeMcpServerEntry preserves unrelated fields and adds councilkit entry", () => {
  const source = {
    name: "sample",
    mcpServers: {
      existing: {
        command: "node",
        args: ["existing.js"]
      }
    }
  };

  const result = mergeMcpServerEntry(source, "councilkit", {
    command: "node",
    args: ["dist/server.js"]
  });

  assert.equal(result.changed, true);
  assert.equal(result.merged.name, "sample");
  assert.ok(result.merged.mcpServers.existing);
  assert.ok(result.merged.mcpServers.councilkit);
});

test("mergeMcpServerEntry avoids duplicate write for equivalent entry", () => {
  const source = {
    mcpServers: {
      councilkit: {
        command: "node",
        args: ["dist/server.js"]
      }
    }
  };

  const result = mergeMcpServerEntry(source, "councilkit", {
    command: "node",
    args: ["dist/server.js"]
  });

  assert.equal(result.changed, false);
  assert.equal(result.duplicated, true);
});

test("upsertMcpServerConfig creates a backup when existing config changes", async () => {
  const tempDir = await createTempDir();
  const targetPath = path.join(tempDir, "settings.json");

  await fs.writeFile(
    targetPath,
    `${JSON.stringify(
      {
        mcpServers: {
          existing: {
            command: "node",
            args: ["existing.js"]
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const result = await upsertMcpServerConfig({
    filePath: targetPath,
    serverName: "councilkit",
    serverEntry: {
      command: "node",
      args: ["dist/server.js"]
    }
  });

  assert.equal(result.changed, true);
  assert.equal(result.wrote, true);
  assert.ok(result.backupPath);
  await fs.access(result.backupPath as string);

  const raw = await fs.readFile(targetPath, "utf8");
  const parsed = JSON.parse(raw);
  assert.ok(parsed.mcpServers.councilkit);
  assert.ok(parsed.mcpServers.existing);
});

test("upsertMcpServerConfig preserves unrelated config in existing file", async () => {
  const tempDir = await createTempDir();
  const targetPath = path.join(tempDir, "mcp.json");
  await fs.writeFile(
    targetPath,
    `${JSON.stringify(
      {
        metadata: {
          team: "alpha"
        },
        mcpServers: {
          cloudrun: {
            command: "npx",
            args: ["-y", "@google-cloud/cloud-run-mcp"]
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  await upsertMcpServerConfig({
    filePath: targetPath,
    serverName: "councilkit",
    serverEntry: {
      command: "node",
      args: ["dist/server.js"]
    }
  });

  const raw = await fs.readFile(targetPath, "utf8");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.metadata.team, "alpha");
  assert.ok(parsed.mcpServers.cloudrun);
  assert.ok(parsed.mcpServers.councilkit);
});

test("removeMcpServerEntry removes only target server and preserves others", () => {
  const source = {
    mcpServers: {
      councilkit: {
        command: "node",
        args: ["dist/server.js"]
      },
      cloudrun: {
        command: "npx",
        args: ["-y", "@google-cloud/cloud-run-mcp"]
      }
    }
  };

  const result = removeMcpServerEntry(source, "councilkit");
  assert.equal(result.changed, true);
  assert.equal(result.merged.mcpServers.councilkit, undefined);
  assert.ok(result.merged.mcpServers.cloudrun);
});

test("removeMcpServerConfig writes backup and removes councilkit entry", async () => {
  const tempDir = await createTempDir();
  const targetPath = path.join(tempDir, "settings.json");

  await fs.writeFile(
    targetPath,
    `${JSON.stringify(
      {
        mcpServers: {
          councilkit: {
            command: "node",
            args: ["dist/server.js"]
          },
          other: {
            command: "node",
            args: ["other.js"]
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const result = await removeMcpServerConfig({
    filePath: targetPath,
    serverName: "councilkit"
  });

  assert.equal(result.changed, true);
  assert.equal(result.wrote, true);
  assert.ok(result.backupPath);

  const raw = await fs.readFile(targetPath, "utf8");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.mcpServers.councilkit, undefined);
  assert.ok(parsed.mcpServers.other);
});
