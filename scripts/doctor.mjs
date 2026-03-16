#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function expandHome(inputPath) {
  if (inputPath === "~") {
    return os.homedir();
  }
  if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
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

function firstExecutable(command) {
  if (typeof command !== "string") {
    return "";
  }
  const trimmed = command.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.split(/\s+/)[0] ?? "";
}

async function readSettings(cwd) {
  const candidates = [
    process.env.MERGELOOP_CONFIG,
    process.env.COUNCILKIT_CONFIG,
    path.join(cwd, "mergeloop.settings.json"),
    path.join(cwd, "councilkit.settings.json"),
    path.join(expandHome("~/.mergeloop"), "config.json"),
    path.join(expandHome("~/.councilkit"), "config.json")
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const parsed = JSON.parse(raw);
      return { settings: parsed, path: candidate };
    } catch {
      // ignore
    }
  }

  return {
    settings: {
      active_host: "claude_code",
      workers: {},
      worker_registry: {},
      custom_workers: {}
    },
    path: "(default)"
  };
}

function collectCliWorkerChecks(settings) {
  const checks = [];

  const workers = settings.workers ?? {};
  for (const [workerId, worker] of Object.entries(workers)) {
    if (!worker || worker.enabled === false || worker.type !== "cli") {
      continue;
    }

    const executable = firstExecutable(worker.command ?? "");
    checks.push({
      name: `worker: ${workerId}`,
      executable
    });
  }

  const legacyRegistry = settings.worker_registry ?? {};
  for (const [workerId, worker] of Object.entries(legacyRegistry)) {
    if (!worker || worker.enabled === false || worker.type !== "cli") {
      continue;
    }

    const executable = firstExecutable(worker.command ?? "");
    checks.push({
      name: `legacy worker_registry: ${workerId}`,
      executable
    });
  }

  const customWorkers = settings.custom_workers ?? {};
  for (const [workerId, worker] of Object.entries(customWorkers)) {
    const executable = firstExecutable(worker.command ?? "");
    checks.push({
      name: `legacy custom_worker: ${workerId}`,
      executable
    });
  }

  if (checks.length === 0) {
    checks.push(
      {
        name: "legacy codex_command",
        executable: firstExecutable(settings.codex_command ?? "codex")
      },
      {
        name: "legacy gemini_command",
        executable: firstExecutable(settings.gemini_command ?? "gemini")
      }
    );
  }

  const deduped = [];
  const seen = new Set();
  for (const check of checks) {
    const key = `${check.name}:${check.executable}`;
    if (!check.executable || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(check);
  }

  return deduped;
}

async function main() {
  const cwd = process.cwd();
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  const { settings, path: configPath } = await readSettings(cwd);

  const checks = [
    {
      name: "Node.js >= 20",
      ok: nodeMajor >= 20,
      detail: `found ${process.versions.node}`,
      kind: "core"
    }
  ];

  if (typeof settings.active_host === "string" && settings.active_host.trim()) {
    checks.push({
      name: "active host selected",
      ok: true,
      detail: settings.active_host,
      kind: "core"
    });
  }

  for (const cliCheck of collectCliWorkerChecks(settings)) {
    checks.push({
      name: cliCheck.name,
      ok: await commandExists(cliCheck.executable),
      detail: cliCheck.executable,
      kind: "worker"
    });
  }

  console.log("MergeLoop Doctor");
  console.log(`Config: ${configPath}`);
  console.log("");

  for (const check of checks) {
    const status =
      check.ok
        ? "[OK]"
        : check.kind === "worker"
          ? "[MISSING-EXTERNAL]"
          : "[MISSING]";
    console.log(`${status} ${check.name} (${check.detail})`);
  }

  const allGood = checks.every((check) => check.ok);
  const missingWorkers = checks.filter((check) => !check.ok && check.kind === "worker");
  const missingCore = checks.filter((check) => !check.ok && check.kind !== "worker");
  console.log("");
  if (allGood) {
    console.log("All checks passed.");
    process.exitCode = 0;
    return;
  }

  if (missingCore.length > 0) {
    console.log("Core checks failed. Resolve the missing core dependencies first.");
  }

  if (missingWorkers.length > 0) {
    console.log(
      "Missing worker CLIs were detected. This is an expected external dependency check, not a MergeLoop build failure."
    );
    console.log("Next steps:");
    console.log("1. Install and authenticate each missing worker CLI.");
    console.log("2. Or disable missing workers in mergeloop.settings.json.");
    console.log("3. Re-run `npm run doctor`.");
    console.log("");
    for (const worker of missingWorkers) {
      const executable = String(worker.detail ?? "").toLowerCase();
      if (executable === "gemini") {
        console.log("- gemini: install Gemini CLI, then login/auth in your environment.");
        continue;
      }
      if (executable === "codex") {
        console.log("- codex: install Codex CLI, then login/auth in your environment.");
        continue;
      }
      if (executable === "ollama") {
        console.log("- ollama: install Ollama and start the local runtime before retries.");
        continue;
      }
      console.log(`- ${executable}: install and verify '${executable}' is available on PATH.`);
    }
  }

  if (missingCore.length === 0 && missingWorkers.length > 0) {
    console.log("");
    console.log("MergeLoop build/runtime integrity checks are otherwise OK.");
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
