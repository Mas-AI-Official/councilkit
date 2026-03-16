#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";

import {
  buildBackupPath,
  LEGACY_MERGELOOP_SERVER_NAMES,
  upsertMcpServerConfig
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

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArgs(argv) {
  const flags = {
    yes: false,
    dryRun: false,
    host: undefined,
    workers: undefined
  };

  for (const arg of argv) {
    if (arg === "--yes") {
      flags.yes = true;
      continue;
    }
    if (arg === "--dry-run") {
      flags.dryRun = true;
      continue;
    }
    if (arg.startsWith("--host=")) {
      flags.host = arg.slice("--host=".length);
      continue;
    }
    if (arg.startsWith("--workers=")) {
      flags.workers = arg
        .slice("--workers=".length)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0);
      continue;
    }
  }

  return flags;
}

async function commandExists(command) {
  if (!command) {
    return false;
  }

  const commandToRun = process.platform === "win32" ? "cmd.exe" : "which";
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", "where", command] : [command];

  return new Promise((resolve) => {
    const child = spawn(commandToRun, commandArgs, {
      stdio: "ignore",
      windowsHide: true
    });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      windowsHide: true
    });
    child.on("close", (code) => resolve(code ?? -1));
    child.on("error", () => resolve(-1));
  });
}

function mergeObjects(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override;
  }

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (Array.isArray(value)) {
      merged[key] = [...value];
      continue;
    }
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeObjects(merged[key], value);
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      throw new Error(`Expected JSON object: ${filePath}`);
    }
    return {
      exists: true,
      value: parsed
    };
  } catch (error) {
    const nodeError = error;
    if (nodeError?.code === "ENOENT") {
      return {
        exists: false,
        value: {}
      };
    }
    throw error;
  }
}

function detectHostTargets(cwd) {
  return [
    {
      id: "gemini",
      label: "Gemini settings (auto-configured)",
      path: normalizePath("~/.gemini/settings.json"),
      support: "first-class auto-config"
    },
    {
      id: "antigravity",
      label: "Antigravity MCP config (auto-configured)",
      path: normalizePath("~/.gemini/antigravity/mcp_config.json"),
      support: "experimental auto-config"
    },
    {
      id: "generic",
      label: "Generic MCP config in current repo (auto-configured)",
      path: path.join(cwd, ".mcp.json"),
      support: "documented/manual host via auto-config template write"
    },
    {
      id: "claude",
      label: "Claude Code plugin path (no host config file changes)",
      path: cwd,
      support: "first-class manual start command"
    }
  ];
}

async function chooseHost(targets, flags, rl) {
  if (flags.host) {
    const selectedByFlag = targets.find((target) => target.id === flags.host);
    if (selectedByFlag) {
      return selectedByFlag;
    }
  }

  const defaultHost = targets.find((target) => target.id === "gemini") ?? targets[0];
  if (flags.yes || !rl) {
    return defaultHost;
  }

  process.stdout.write("\nSelect host integration target:\n");
  targets.forEach((target, index) => {
    process.stdout.write(`  ${index + 1}. ${target.label} [${target.support}] -> ${target.path}\n`);
  });

  const answer = await rl.question(`Host number [1-${targets.length}] (default 1): `);
  const parsed = Number.parseInt(answer.trim() || "1", 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > targets.length) {
    return defaultHost;
  }
  return targets[parsed - 1];
}

function buildDefaultWorkerSelection(detected) {
  const preferred = ["gemini", "ollama", "codex"];
  return preferred.filter((worker) => detected[worker] === true);
}

function parseWorkerInput(input, fallback) {
  const values = input
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  if (values.length === 0) {
    return [...fallback];
  }
  return values;
}

async function chooseWorkers(detected, flags, rl) {
  const detectedDefaults = buildDefaultWorkerSelection(detected);
  const fallbackDefaults = detectedDefaults.length > 0 ? detectedDefaults : ["gemini", "codex"];

  if (flags.workers?.length) {
    return [...flags.workers];
  }

  if (flags.yes || !rl) {
    return fallbackDefaults;
  }

  process.stdout.write("\nDetected local CLIs:\n");
  process.stdout.write(`  codex: ${detected.codex ? "found" : "missing"}\n`);
  process.stdout.write(`  gemini: ${detected.gemini ? "found" : "missing"}\n`);
  process.stdout.write(`  ollama: ${detected.ollama ? "found" : "missing"}\n`);
  process.stdout.write(`  claude: ${detected.claude ? "found" : "missing"}\n`);
  process.stdout.write("Choose worker stack (comma list from: gemini, ollama, codex).\n");

  const answer = await rl.question(
    `Workers (default ${fallbackDefaults.join(",")}): `
  );
  return parseWorkerInput(answer, fallbackDefaults);
}

async function chooseRoutingStyle(flags, rl) {
  const styles = [
    { id: "balanced", label: "Balanced council" },
    { id: "gemini_first", label: "Gemini-first (reduce Codex usage)" },
    { id: "local_first", label: "Local-first privacy fallback" },
    { id: "codex_first", label: "Codex-first code review" }
  ];

  if (flags.yes || !rl) {
    return styles[1];
  }

  process.stdout.write("\nChoose routing preference:\n");
  styles.forEach((style, index) => {
    process.stdout.write(`  ${index + 1}. ${style.label}\n`);
  });
  const answer = await rl.question(`Routing number [1-${styles.length}] (default 2): `);
  const parsed = Number.parseInt(answer.trim() || "2", 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > styles.length) {
    return styles[1];
  }
  return styles[parsed - 1];
}

function orderedWorkers(selectedWorkers, routingStyle) {
  const selected = new Set(selectedWorkers);
  const hasOllama = selected.has("ollama");
  const normalized = [
    ...(selected.has("gemini") ? ["gemini"] : []),
    ...(hasOllama ? ["local"] : []),
    ...(selected.has("codex") ? ["codex"] : [])
  ];

  const orders = {
    balanced: ["gemini", "codex", "local"],
    gemini_first: ["gemini", "local", "codex"],
    local_first: ["local", "gemini", "codex"],
    codex_first: ["codex", "gemini", "local"]
  };

  const preferred = orders[routingStyle] ?? orders.gemini_first;
  const ordered = preferred.filter((worker) => normalized.includes(worker));
  for (const worker of normalized) {
    if (!ordered.includes(worker)) {
      ordered.push(worker);
    }
  }
  return ordered;
}

function buildSettingsPatch({
  host,
  selectedWorkers,
  routingStyle,
  persistenceDirectory
}) {
  const hasGemini = selectedWorkers.includes("gemini");
  const hasCodex = selectedWorkers.includes("codex");
  const hasOllama = selectedWorkers.includes("ollama");
  const fallback = orderedWorkers(selectedWorkers, routingStyle);

  const hosts = {
    claude_code: {
      type: "mcp_host",
      enabled: true
    },
    codex_cli: {
      type: "cli_host",
      enabled: true,
      command: "codex"
    },
    gemini_cli: {
      type: "cli_host",
      enabled: true,
      command: "gemini"
    },
    generic_mcp_host: {
      type: "mcp_host",
      enabled: true
    }
  };

  if (host.id === "antigravity") {
    hosts.antigravity = {
      type: "mcp_host",
      enabled: true,
      notes: "Antigravity MCP config path"
    };
  }

  const activeHost =
    host.id === "claude"
      ? "claude_code"
      : host.id === "gemini"
        ? "gemini_cli"
        : host.id === "antigravity"
          ? "antigravity"
          : "generic_mcp_host";

  return {
    active_host: activeHost,
    hosts,
    workers: {
      gemini: {
        type: "cli",
        command: "gemini",
        role_tags: ["research", "analysis", "general"],
        strengths: ["research", "comparative analysis"],
        cost_hint: "subscription",
        privacy_mode: "remote",
        enabled: hasGemini,
        priority: 10
      },
      local: {
        type: "cli",
        command: "ollama run qwen3:latest \"{task}\"",
        role_tags: ["local", "analysis", "general", "drafting"],
        strengths: ["privacy-sensitive local fallback"],
        cost_hint: "free",
        privacy_mode: "local",
        enabled: hasOllama,
        priority: 20
      },
      codex: {
        type: "cli",
        command: "codex",
        role_tags: ["coding", "review", "general"],
        strengths: ["refactoring", "code generation"],
        cost_hint: "subscription",
        privacy_mode: "remote",
        enabled: hasCodex,
        priority: 30
      },
      ollama: {
        type: "cli",
        command: "ollama run qwen3:latest \"{task}\"",
        role_tags: ["local", "coding", "general"],
        strengths: ["local runtime path"],
        cost_hint: "free",
        privacy_mode: "local",
        enabled: false,
        priority: 40,
        notes: "Dedicated Ollama worker; local worker is the primary compatibility alias."
      }
    },
    routing: {
      default_mode: "council",
      fallback_priority: fallback,
      allow_single_worker: true,
      max_workers_per_task: 3,
      prefer_local_for_sensitive_tasks: true,
      prefer_subscription_before_api: true
    },
    codex_command: "codex",
    gemini_command: "gemini",
    local_command: hasOllama ? "ollama run qwen3:latest" : null,
    ollama_command: "ollama",
    ollama_model: "qwen3:latest",
    default_workers: fallback,
    persistence: {
      enabled: true,
      directory: persistenceDirectory
    }
  };
}

async function writeSettingsConfig({ cwd, patch, dryRun, now }) {
  const settingsPath = path.join(cwd, "mergeloop.settings.json");
  const legacySettingsPath = path.join(cwd, "councilkit.settings.json");

  let basePath = settingsPath;
  let existing = await readJsonIfExists(settingsPath);
  if (!existing.exists) {
    const legacy = await readJsonIfExists(legacySettingsPath);
    if (legacy.exists) {
      existing = legacy;
      basePath = legacySettingsPath;
    }
  }

  const merged = mergeObjects(existing.value, patch);
  const changed = JSON.stringify(existing.value) !== JSON.stringify(merged) || basePath !== settingsPath;
  if (!changed) {
    return {
      settingsPath,
      changed: false,
      wrote: false,
      backupPath: undefined,
      migratedLegacyPath: undefined
    };
  }

  const backupPath = existing.exists ? buildBackupPath(basePath, now) : undefined;
  if (dryRun) {
    return {
      settingsPath,
      changed: true,
      wrote: false,
      backupPath,
      dryRun: true,
      migratedLegacyPath: basePath !== settingsPath ? basePath : undefined
    };
  }

  if (existing.exists && backupPath) {
    await fs.copyFile(basePath, backupPath);
  }
  await fs.writeFile(settingsPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return {
    settingsPath,
    changed: true,
    wrote: true,
    backupPath,
    dryRun: false,
    migratedLegacyPath: basePath !== settingsPath ? basePath : undefined
  };
}

async function choosePersistenceDirectory(flags, rl) {
  const defaultDir = "~/.mergeloop/runs";
  if (flags.yes || !rl) {
    return defaultDir;
  }

  const answer = await rl.question(
    `\nPersistence directory for run logs (default ${defaultDir}): `
  );
  const value = answer.trim();
  return value.length > 0 ? value : defaultDir;
}

async function maybeConfigureHostMcp({
  host,
  cwd,
  dryRun
}) {
  if (host.id === "claude") {
    return {
      hostConfigPath: undefined,
      hostConfigBackup: undefined,
      changed: false,
      wrote: false,
      note: "Claude Code uses plugin-dir startup; no host JSON file was modified."
    };
  }

  const serverEntry = {
    command: "node",
    args: [path.join(cwd, "dist", "server.js").replaceAll("\\", "/")]
  };

  const result = await upsertMcpServerConfig({
    filePath: host.path,
    serverName: "mergeloop",
    legacyServerNames: LEGACY_MERGELOOP_SERVER_NAMES,
    serverEntry,
    dryRun
  });

  return {
    hostConfigPath: host.path,
      hostConfigBackup: result.backupPath,
      changed: result.changed,
      wrote: result.wrote,
      note: result.changed
      ? "MergeLoop MCP server entry merged. Legacy CouncilKit MCP ids are replaced automatically if present."
      : "MergeLoop MCP server entry already present; no change."
  };
}

function printSummary({
  host,
  selectedWorkers,
  routingStyle,
  settingsResult,
  hostResult,
  dryRun
}) {
  process.stdout.write("\nSetup summary\n");
  process.stdout.write("-------------\n");
  process.stdout.write(`Selected host: ${host.label}\n`);
  process.stdout.write(`Enabled workers: ${selectedWorkers.join(", ")}\n`);
  process.stdout.write(`Routing style: ${routingStyle}\n`);
  process.stdout.write(`MergeLoop config: ${settingsResult.settingsPath}\n`);
  if (settingsResult.migratedLegacyPath) {
    process.stdout.write(`Migrated legacy config source: ${settingsResult.migratedLegacyPath}\n`);
  }
  if (settingsResult.backupPath) {
    process.stdout.write(`MergeLoop config backup: ${settingsResult.backupPath}\n`);
  }
  if (hostResult.hostConfigPath) {
    process.stdout.write(`Host config path: ${hostResult.hostConfigPath}\n`);
  }
  if (hostResult.hostConfigBackup) {
    process.stdout.write(`Host config backup: ${hostResult.hostConfigBackup}\n`);
  }
  process.stdout.write(`${hostResult.note}\n`);
  if (dryRun) {
    process.stdout.write("Dry-run mode: no files were modified.\n");
  }

  process.stdout.write("\nNext steps\n");
  process.stdout.write("----------\n");
  process.stdout.write("1. npm run doctor\n");
  process.stdout.write("2. npm run smoke\n");
  if (host.id === "claude") {
    process.stdout.write("3. claude --plugin-dir ./MergeLoop\n");
  } else {
    process.stdout.write("3. Restart/reload your selected host and run a mergeloop_run prompt.\n");
  }

  process.stdout.write("\nStarter prompts\n");
  process.stdout.write("---------------\n");
  process.stdout.write(
    "1. Use mergeloop.mergeloop_run in council mode with workers gemini, local, codex. Task: review this repository for release risks.\n"
  );
  process.stdout.write(
    "2. Use mergeloop.mergeloop_run in single mode with worker gemini. Task: summarize setup docs and list missing onboarding steps.\n"
  );
  process.stdout.write(
    "3. Use mergeloop.mergeloop_run in council mode. Task: produce disagreements and next checks for the current migration plan.\n"
  );
}

async function main() {
  const cwd = process.cwd();
  const flags = parseArgs(process.argv.slice(2));
  const now = new Date();

  const detectedCommands = {
    codex: await commandExists("codex"),
    gemini: await commandExists("gemini"),
    ollama: await commandExists("ollama"),
    claude: await commandExists("claude")
  };

  const hostTargets = detectHostTargets(cwd);
  const interactive = !flags.yes && process.stdin.isTTY;
  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

  try {
    process.stdout.write("MergeLoop setup wizard\n");
    process.stdout.write("=======================\n");
    process.stdout.write(`Working directory: ${cwd}\n`);
    if (flags.dryRun) {
      process.stdout.write("Mode: dry-run (no files will be changed)\n");
    }

    const host = await chooseHost(hostTargets, flags, rl);
    const selectedWorkers = await chooseWorkers(detectedCommands, flags, rl);
    const routing = await chooseRoutingStyle(flags, rl);
    const persistenceDirectory = await choosePersistenceDirectory(flags, rl);

    const patch = buildSettingsPatch({
      host,
      selectedWorkers,
      routingStyle: routing.id,
      persistenceDirectory
    });

    const settingsResult = await writeSettingsConfig({
      cwd,
      patch,
      dryRun: flags.dryRun,
      now
    });
    const hostResult = await maybeConfigureHostMcp({
      host,
      cwd,
      dryRun: flags.dryRun
    });

    printSummary({
      host,
      selectedWorkers,
      routingStyle: routing.label,
      settingsResult,
      hostResult,
      dryRun: flags.dryRun
    });

    if (!flags.dryRun) {
      const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
      process.stdout.write("\nRunning doctor and smoke checks...\n");
      await runCommand(npmCommand, ["run", "doctor"], cwd);
      await runCommand(npmCommand, ["run", "smoke"], cwd);
    }
  } finally {
    await rl?.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
