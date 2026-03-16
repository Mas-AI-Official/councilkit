import fs from "node:fs/promises";
import path from "node:path";

import type { MergeLoopSettings, LoadedSettings, WorkerDefinition } from "../types/council.js";
import { normalizePath } from "./path-utils.js";

const LEGACY_ENV_KEYS = ["COUNCILKIT_CONFIG"] as const;
const LEGACY_CONFIG_PATHS = [
  "councilkit.settings.json",
  "~/.councilkit/config.json"
] as const;

const DEFAULT_SETTINGS: MergeLoopSettings = {
  active_host: "generic_mcp_host",
  hosts: {
    claude_code: {
      type: "mcp_host",
      enabled: true,
      notes: "First-class plugin path in this repository."
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
  },
  workers: {
    codex: {
      type: "cli",
      enabled: true,
      command: "codex",
      role_tags: ["coding", "review", "general"],
      strengths: ["refactoring", "coding"],
      privacy_mode: "remote",
      cost_hint: "subscription",
      priority: 30
    },
    gemini: {
      type: "cli",
      enabled: true,
      command: "gemini",
      role_tags: ["research", "analysis", "general"],
      strengths: ["research", "analysis"],
      privacy_mode: "remote",
      cost_hint: "subscription",
      priority: 10
    },
    local: {
      type: "cli",
      enabled: false,
      command: "ollama run qwen3:latest \"{task}\"",
      role_tags: ["local", "general", "analysis", "drafting"],
      strengths: ["local fallback", "privacy-sensitive local execution"],
      privacy_mode: "local",
      cost_hint: "free",
      priority: 20
    },
    ollama: {
      type: "cli",
      enabled: false,
      command: "ollama run qwen3:latest \"{task}\"",
      role_tags: ["local", "coding", "drafting", "general"],
      strengths: ["dedicated ollama worker path"],
      privacy_mode: "local",
      cost_hint: "free",
      priority: 40,
      notes: "Dedicated ollama worker. The local worker is the default compatibility alias."
    }
  },
  discovery: {
    enabled: true,
    mcp_config_paths: [],
    auto_register_mcp_workers: true,
    auto_register_cli_workers: true,
    require_worker_metadata: true,
    include: [],
    exclude: [],
    disabled_workers: [],
    mcp_worker_hints: {},
    cli_candidates: {}
  },
  routing: {
    default_mode: "council",
    fallback_priority: ["gemini", "local", "codex"],
    allow_single_worker: true,
    max_workers_per_task: 3,
    prefer_local_for_sensitive_tasks: true,
    prefer_subscription_before_api: true
  },
  codex_command: "codex",
  gemini_command: "gemini",
  local_command: "ollama run qwen3:latest",
  ollama_command: "ollama",
  ollama_model: "qwen3:latest",
  default_workers: ["gemini", "local", "codex"],
  timeouts: {
    codex_ms: 300_000,
    gemini_ms: 300_000,
    local_ms: 180_000,
    ollama_ms: 180_000
  },
  codex: {
    use_output_schema: true
  },
  worker_registry: {},
  custom_workers: {},
  persistence: {
    enabled: true,
    directory: "~/.mergeloop/runs"
  }
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeSettings<T>(base: T, override: Partial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override ?? base) as T;
  }

  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];
    if (Array.isArray(value)) {
      merged[key] = [...value];
      continue;
    }

    if (isPlainObject(current) && isPlainObject(value)) {
      merged[key] = mergeSettings(current, value);
      continue;
    }

    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged as T;
}

function arraysEqual(left: string[] | undefined, right: string[] | undefined): boolean {
  if (!left || !right) {
    return left === right;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

async function readJsonConfig(configPath: string): Promise<Partial<MergeLoopSettings>> {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!isPlainObject(parsed)) {
    throw new Error(`Config file must contain an object: ${configPath}`);
  }

  return parsed as Partial<MergeLoopSettings>;
}

function mapLegacyFieldsToWorkers(settings: MergeLoopSettings): void {
  const workers: Record<string, WorkerDefinition> = { ...(settings.workers ?? {}) };
  const configuredDefaultWorkers = [...(settings.default_workers ?? [])];

  if (settings.codex_command && !workers.codex?.command) {
    workers.codex = {
      ...(workers.codex ?? { type: "cli" }),
      type: "cli",
      command: settings.codex_command,
      enabled: workers.codex?.enabled ?? true
    };
  }

  if (settings.gemini_command && !workers.gemini?.command) {
    workers.gemini = {
      ...(workers.gemini ?? { type: "cli" }),
      type: "cli",
      command: settings.gemini_command,
      enabled: workers.gemini?.enabled ?? true
    };
  }

  if (settings.local_command && !workers.local?.command) {
    workers.local = {
      ...(workers.local ?? { type: "cli" }),
      type: "cli",
      command: settings.local_command,
      enabled: workers.local?.enabled ?? true
    };
  }

  if (settings.ollama_command && !workers.ollama?.command) {
    const model = settings.ollama_model ?? "llama3.1";
    workers.ollama = {
      ...(workers.ollama ?? { type: "cli" }),
      type: "cli",
      command: `${settings.ollama_command} run ${model} "{task}"`,
      enabled: workers.ollama?.enabled ?? false
    };
  }

  for (const [workerId, worker] of Object.entries(settings.worker_registry ?? {})) {
    workers[workerId] = {
      ...(workers[workerId] ?? {}),
      ...worker,
      type: worker.type
    };
  }

  for (const [workerId, legacyWorker] of Object.entries(settings.custom_workers ?? {})) {
    if (workers[workerId]) {
      continue;
    }

    workers[workerId] = {
      type: "cli",
      command: legacyWorker.command,
      enabled: true,
      timeout_ms: legacyWorker.timeout_ms,
      output_format: legacyWorker.output_format,
      role_tags: ["general"],
      source: "manual",
      cost_hint: "unknown",
      privacy_mode: "remote"
    };
  }

  const fallbackPriority = settings.routing?.fallback_priority;
  const fallbackLooksDefault = arraysEqual(
    fallbackPriority,
    DEFAULT_SETTINGS.routing?.fallback_priority
  );

  if (
    configuredDefaultWorkers.length > 0 &&
    (!fallbackPriority?.length || fallbackLooksDefault)
  ) {
    settings.routing = {
      ...(settings.routing ?? {}),
      fallback_priority: [...configuredDefaultWorkers]
    };
    settings.default_workers = [...configuredDefaultWorkers];
  } else if (fallbackPriority?.length) {
    settings.default_workers = [...fallbackPriority];
  }

  const codexWorker = workers.codex;
  if (codexWorker?.command) {
    settings.codex_command = codexWorker.command;
  }
  if (typeof codexWorker?.timeout_ms === "number" && codexWorker.timeout_ms > 0) {
    settings.timeouts.codex_ms = codexWorker.timeout_ms;
  }

  const geminiWorker = workers.gemini;
  if (geminiWorker?.command) {
    settings.gemini_command = geminiWorker.command;
  }
  if (typeof geminiWorker?.timeout_ms === "number" && geminiWorker.timeout_ms > 0) {
    settings.timeouts.gemini_ms = geminiWorker.timeout_ms;
  }

  const localWorker = workers.local;
  if (localWorker?.command) {
    settings.local_command = localWorker.command;
  }
  if (typeof localWorker?.timeout_ms === "number" && localWorker.timeout_ms > 0) {
    settings.timeouts.local_ms = localWorker.timeout_ms;
  }

  const ollamaWorker = workers.ollama;
  if (ollamaWorker?.command) {
    settings.ollama_command = ollamaWorker.command;
  }
  if (typeof ollamaWorker?.timeout_ms === "number" && ollamaWorker.timeout_ms > 0) {
    settings.timeouts.ollama_ms = ollamaWorker.timeout_ms;
  }

  settings.workers = workers;
}

function normalizeRuntimeSettings(settings: MergeLoopSettings): MergeLoopSettings {
  const normalized = mergeSettings(DEFAULT_SETTINGS, settings);
  mapLegacyFieldsToWorkers(normalized);
  return normalized;
}

export async function loadSettings(cwd = process.cwd()): Promise<LoadedSettings> {
  const envCandidates = [
    process.env.MERGELOOP_CONFIG,
    ...LEGACY_ENV_KEYS.map((key) => process.env[key])
  ].filter((value): value is string => Boolean(value));

  const candidatePaths = [
    ...envCandidates,
    path.join(cwd, "mergeloop.settings.json"),
    path.join(cwd, LEGACY_CONFIG_PATHS[0]),
    normalizePath("~/.mergeloop/config.json"),
    normalizePath(LEGACY_CONFIG_PATHS[1])
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidatePaths) {
    try {
      const config = await readJsonConfig(candidate);
      const merged = mergeSettings(DEFAULT_SETTINGS, config);
      return {
        settings: normalizeRuntimeSettings(merged),
        configPath: candidate
      };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  return {
    settings: normalizeRuntimeSettings(DEFAULT_SETTINGS)
  };
}
