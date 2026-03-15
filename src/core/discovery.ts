import fs from "node:fs/promises";
import path from "node:path";

import type { CouncilKitSettings } from "../types/council.js";
import { normalizePath } from "./path-utils.js";

export interface DiscoveredMcpServer {
  name: string;
  config_path: string;
  command?: string;
  args?: string[];
  url?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseServerEntries(configPath: string, rawContent: string): DiscoveredMcpServer[] {
  const parsed = JSON.parse(rawContent) as unknown;
  if (!isObject(parsed)) {
    return [];
  }

  const mcpServers = (parsed.mcpServers ?? parsed.mcp_servers) as unknown;
  if (!isObject(mcpServers)) {
    return [];
  }

  const discovered: DiscoveredMcpServer[] = [];
  for (const [name, server] of Object.entries(mcpServers)) {
    if (!isObject(server)) {
      continue;
    }

    const command = typeof server.command === "string" ? server.command : undefined;
    const args = Array.isArray(server.args)
      ? server.args.filter((value): value is string => typeof value === "string")
      : undefined;
    const url = typeof server.url === "string" ? server.url : undefined;

    discovered.push({
      name,
      config_path: configPath,
      command,
      args,
      url
    });
  }

  return discovered;
}

function resolveMcpConfigPaths(settings: CouncilKitSettings, cwd: string): string[] {
  const configuredPaths = settings.discovery?.mcp_config_paths ?? [];
  const defaults = [path.join(cwd, ".mcp.json")];
  const combined = [...configuredPaths, ...defaults];

  return [...new Set(combined)].map((candidate) => {
    if (path.isAbsolute(candidate)) {
      return normalizePath(candidate);
    }

    return normalizePath(path.join(cwd, candidate));
  });
}

export async function discoverMcpServers(
  settings: CouncilKitSettings,
  cwd: string
): Promise<DiscoveredMcpServer[]> {
  const discoveryEnabled = settings.discovery?.enabled ?? true;
  if (!discoveryEnabled) {
    return [];
  }

  const paths = resolveMcpConfigPaths(settings, cwd);
  const discovered: DiscoveredMcpServer[] = [];

  for (const configPath of paths) {
    try {
      const raw = await fs.readFile(configPath, "utf8");
      discovered.push(...parseServerEntries(configPath, raw));
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  return discovered;
}
