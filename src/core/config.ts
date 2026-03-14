import fs from "node:fs/promises";
import path from "node:path";

import type { CouncilKitSettings, LoadedSettings } from "../types/council.js";
import { normalizePath } from "./path-utils.js";

const DEFAULT_SETTINGS: CouncilKitSettings = {
  codex_command: "codex",
  gemini_command: "gemini",
  local_command: null,
  default_workers: ["codex", "gemini"],
  timeouts: {
    codex_ms: 300_000,
    gemini_ms: 300_000,
    local_ms: 180_000
  },
  codex: {
    use_output_schema: true
  },
  persistence: {
    enabled: true,
    directory: "~/.councilkit/runs"
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

async function readJsonConfig(configPath: string): Promise<Partial<CouncilKitSettings>> {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!isPlainObject(parsed)) {
    throw new Error(`Config file must contain an object: ${configPath}`);
  }

  return parsed as Partial<CouncilKitSettings>;
}

export async function loadSettings(cwd = process.cwd()): Promise<LoadedSettings> {
  const candidatePaths = [
    process.env.COUNCILKIT_CONFIG,
    path.join(cwd, "councilkit.settings.json"),
    normalizePath("~/.councilkit/config.json")
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidatePaths) {
    try {
      const config = await readJsonConfig(candidate);
      return {
        settings: mergeSettings(DEFAULT_SETTINGS, config),
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
    settings: DEFAULT_SETTINGS
  };
}
