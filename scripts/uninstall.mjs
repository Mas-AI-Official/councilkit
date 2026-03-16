#!/usr/bin/env node

import os from "node:os";
import path from "node:path";

import {
  LEGACY_MERGELOOP_SERVER_NAMES,
  removeMcpServerConfig
} from "./lib/host-config.mjs";

function expandHome(inputPath) {
  if (inputPath === "~") {
    return os.homedir();
  }
  if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function normalizePath(inputPath) {
  return path.resolve(expandHome(inputPath));
}

function parseArgs(argv) {
  const flags = {
    host: "gemini",
    file: undefined,
    dryRun: false
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      flags.dryRun = true;
      continue;
    }
    if (arg.startsWith("--host=")) {
      flags.host = arg.slice("--host=".length);
      continue;
    }
    if (arg.startsWith("--file=")) {
      flags.file = arg.slice("--file=".length);
      continue;
    }
  }

  return flags;
}

function resolvePathForHost(cwd, hostId) {
  if (hostId === "gemini") {
    return normalizePath("~/.gemini/settings.json");
  }
  if (hostId === "antigravity") {
    return normalizePath("~/.gemini/antigravity/mcp_config.json");
  }
  if (hostId === "generic") {
    return path.join(cwd, ".mcp.json");
  }
  throw new Error(`Unsupported host "${hostId}". Use gemini, antigravity, or generic.`);
}

async function main() {
  const cwd = process.cwd();
  const flags = parseArgs(process.argv.slice(2));
  const targetPath = flags.file ? normalizePath(flags.file) : resolvePathForHost(cwd, flags.host);

  const result = await removeMcpServerConfig({
    filePath: targetPath,
    serverName: "mergeloop",
    legacyServerNames: LEGACY_MERGELOOP_SERVER_NAMES,
    dryRun: flags.dryRun
  });

  process.stdout.write("MergeLoop uninstall/rollback helper\n");
  process.stdout.write("------------------------------------\n");
  process.stdout.write(`Target file: ${targetPath}\n`);
  if (!result.changed) {
    process.stdout.write("No MergeLoop MCP entry found. Nothing changed.\n");
    return;
  }

  if (flags.dryRun) {
    process.stdout.write("Dry-run: entry would be removed.\n");
    if (result.backupPath) {
      process.stdout.write(`Dry-run backup path (planned): ${result.backupPath}\n`);
    }
    return;
  }

  if (result.backupPath) {
    process.stdout.write(`Backup created: ${result.backupPath}\n`);
  }
  process.stdout.write("MergeLoop MCP entry removed.\n");
  process.stdout.write("If needed, restore the backup file to roll back this uninstall.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
