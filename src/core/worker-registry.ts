import type {
  CostHint,
  CouncilKitSettings,
  DiscoverySettings,
  PrivacyMode,
  WorkerAdapterType,
  WorkerDefinition,
  WorkerHealthStatus,
  WorkerRegistryEntry,
  WorkerSource,
  WorkerTransport
} from "../types/council.js";
import type { DiscoveredMcpServer } from "./discovery.js";
import { discoverMcpServers } from "./discovery.js";

function toDisplayName(id: string): string {
  return id
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeTransport(type: WorkerAdapterType, value: WorkerTransport | undefined): WorkerTransport {
  if (value) {
    return value;
  }

  if (type === "mcp") {
    return "stdio";
  }

  if (type === "api") {
    return "http";
  }

  return "subprocess";
}

function normalizePrivacy(value: PrivacyMode | undefined): PrivacyMode {
  return value ?? "remote";
}

function normalizeCost(value: CostHint | undefined): CostHint {
  return value ?? "unknown";
}

function normalizeHealth(value: WorkerHealthStatus | undefined): WorkerHealthStatus {
  return value ?? "unknown";
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function matchesAnyPattern(value: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (wildcardToRegex(pattern).test(value)) {
      return true;
    }
  }

  return false;
}

function isIncluded(id: string, sourceName: string | undefined, discovery: DiscoverySettings | undefined): boolean {
  const include = discovery?.include ?? [];
  if (include.length === 0) {
    return true;
  }

  return matchesAnyPattern(id, include) || (sourceName ? matchesAnyPattern(sourceName, include) : false);
}

function isExcluded(id: string, sourceName: string | undefined, discovery: DiscoverySettings | undefined): boolean {
  const exclude = discovery?.exclude ?? [];
  if (exclude.length === 0) {
    return false;
  }

  return matchesAnyPattern(id, exclude) || (sourceName ? matchesAnyPattern(sourceName, exclude) : false);
}

function normalizeDefinitionEntry(
  id: string,
  definition: WorkerDefinition,
  source: WorkerSource,
  sourceName?: string
): WorkerRegistryEntry {
  const adapterType = definition.type;
  const transport = normalizeTransport(adapterType, definition.transport);
  const displayName = definition.display_name ?? toDisplayName(id);

  return {
    id,
    display_name: displayName,
    adapter_type: adapterType,
    transport,
    role_tags: definition.role_tags ?? ["general"],
    strengths: definition.strengths ?? [],
    privacy_mode: normalizePrivacy(definition.privacy_mode),
    cost_hint: normalizeCost(definition.cost_hint),
    enabled: definition.enabled ?? true,
    health_status: normalizeHealth(definition.health_status),
    command: definition.command,
    args: definition.args,
    url: definition.url,
    endpoint: definition.endpoint,
    model: definition.model,
    timeout_ms: definition.timeout_ms,
    output_format: definition.output_format,
    source,
    mcp_server: definition.mcp_server ?? sourceName,
    notes: definition.notes,
    priority: definition.priority ?? 100
  };
}

function createBuiltinWorkers(settings: CouncilKitSettings): WorkerRegistryEntry[] {
  const ollamaCommand = settings.ollama_command ?? "ollama";
  const ollamaModel = settings.ollama_model ?? "qwen3:latest";
  const normalizedOllamaCommand = (() => {
    const trimmed = ollamaCommand.trim();
    if (trimmed.includes("{task}")) {
      return trimmed;
    }

    if (trimmed.split(/\s+/).length > 1) {
      return `${trimmed} "{task}"`;
    }

    return `${trimmed} run ${ollamaModel} "{task}"`;
  })();

  return [
    {
      id: "codex",
      display_name: "Codex",
      adapter_type: "cli",
      transport: "subprocess",
      role_tags: ["coding", "review", "general"],
      strengths: ["refactoring", "code generation", "test planning"],
      privacy_mode: "remote",
      cost_hint: "subscription",
      enabled: true,
      health_status: "unknown",
      command: settings.codex_command,
      source: "builtin",
      priority: 30
    },
    {
      id: "gemini",
      display_name: "Gemini",
      adapter_type: "cli",
      transport: "subprocess",
      role_tags: ["research", "analysis", "general"],
      strengths: ["exploration", "comparative analysis"],
      privacy_mode: "remote",
      cost_hint: "subscription",
      enabled: true,
      health_status: "unknown",
      command: settings.gemini_command,
      source: "builtin",
      priority: 10
    },
    {
      id: "local",
      display_name: "Local Worker",
      adapter_type: "cli",
      transport: "subprocess",
      role_tags: ["local", "general", "analysis", "drafting"],
      strengths: ["local fallback", "privacy-sensitive local execution"],
      privacy_mode: "local",
      cost_hint: "free",
      enabled: Boolean(settings.local_command),
      health_status: "unknown",
      command: settings.local_command ?? undefined,
      source: "builtin",
      priority: 20
    },
    {
      id: "ollama",
      display_name: "Ollama",
      adapter_type: "cli",
      transport: "subprocess",
      role_tags: ["local", "coding", "drafting", "general"],
      strengths: ["privacy-sensitive local execution"],
      privacy_mode: "local",
      cost_hint: "free",
      enabled: false,
      health_status: "unknown",
      command: normalizedOllamaCommand,
      source: "builtin",
      priority: 40
    }
  ];
}

function mapLegacyWorkerRegistry(settings: CouncilKitSettings): Record<string, WorkerDefinition> {
  const combined: Record<string, WorkerDefinition> = {};

  for (const [id, definition] of Object.entries(settings.worker_registry ?? {})) {
    combined[id] = { ...definition };
  }

  for (const [id, definition] of Object.entries(settings.workers ?? {})) {
    combined[id] = { ...definition };
  }

  for (const [id, legacy] of Object.entries(settings.custom_workers ?? {})) {
    if (combined[id]) {
      continue;
    }

    combined[id] = {
      type: "cli",
      command: legacy.command,
      enabled: true,
      timeout_ms: legacy.timeout_ms,
      output_format: legacy.output_format,
      role_tags: ["general"],
      source: "manual",
      privacy_mode: "remote",
      cost_hint: "unknown"
    };
  }

  return combined;
}

function mapDiscoveredServer(
  server: DiscoveredMcpServer,
  settings: CouncilKitSettings
): WorkerRegistryEntry | undefined {
  const discovery = settings.discovery;
  if (!(discovery?.auto_register_mcp_workers ?? true)) {
    return undefined;
  }

  const hint = discovery?.mcp_worker_hints?.[server.name];
  const requireMetadata = discovery?.require_worker_metadata ?? true;
  if (!hint && requireMetadata) {
    return undefined;
  }

  const workerId = hint?.id ?? server.name;
  if (!isIncluded(workerId, server.name, discovery) || isExcluded(workerId, server.name, discovery)) {
    return undefined;
  }

  const adapterType = hint?.adapter_type ?? "mcp";
  const transport = hint?.transport ?? (server.url ? "http" : "stdio");

  return {
    id: workerId,
    display_name: hint?.display_name ?? toDisplayName(workerId),
    adapter_type: adapterType,
    transport,
    role_tags: hint?.role_tags ?? ["general"],
    strengths: hint?.strengths ?? [],
    privacy_mode: hint?.privacy_mode ?? "mixed",
    cost_hint: hint?.cost_hint ?? "unknown",
    enabled: hint?.enabled ?? true,
    health_status: hint?.health_status ?? "unknown",
    command: hint?.command ?? server.command,
    args: hint?.args ?? server.args,
    url: hint?.url ?? server.url,
    endpoint: hint?.endpoint,
    model: hint?.model,
    timeout_ms: hint?.timeout_ms,
    output_format: hint?.output_format,
    mcp_server: server.name,
    source: "discovered",
    config_ref: server.config_path,
    notes: hint?.notes,
    priority: 70
  };
}

function mapDiscoveredCliCandidates(settings: CouncilKitSettings): WorkerRegistryEntry[] {
  const discovery = settings.discovery;
  if (!(discovery?.auto_register_cli_workers ?? true)) {
    return [];
  }

  const entries: WorkerRegistryEntry[] = [];
  for (const [id, definition] of Object.entries(discovery?.cli_candidates ?? {})) {
    if (!isIncluded(id, undefined, discovery) || isExcluded(id, undefined, discovery)) {
      continue;
    }

    const entry = normalizeDefinitionEntry(
      id,
      {
        ...definition,
        type: "cli"
      },
      "discovered"
    );

    entries.push(entry);
  }

  return entries;
}

function applyDisableList(
  workers: WorkerRegistryEntry[],
  discovery: DiscoverySettings | undefined
): WorkerRegistryEntry[] {
  const disabledSet = new Set(discovery?.disabled_workers ?? []);
  if (disabledSet.size === 0) {
    return workers;
  }

  return workers.map((worker) => ({
    ...worker,
    enabled: disabledSet.has(worker.id) ? false : worker.enabled
  }));
}

function sortByPriority(workers: WorkerRegistryEntry[]): WorkerRegistryEntry[] {
  return [...workers].sort((left, right) => left.priority - right.priority);
}

export interface WorkerRegistryBuildResult {
  entries: WorkerRegistryEntry[];
  discovered_servers: DiscoveredMcpServer[];
}

export async function buildWorkerRegistry(
  settings: CouncilKitSettings,
  cwd: string
): Promise<WorkerRegistryBuildResult> {
  const registry = new Map<string, WorkerRegistryEntry>();

  const pushEntries = (entries: WorkerRegistryEntry[]) => {
    for (const entry of entries) {
      if (!isIncluded(entry.id, entry.mcp_server, settings.discovery)) {
        continue;
      }
      if (isExcluded(entry.id, entry.mcp_server, settings.discovery)) {
        continue;
      }
      registry.set(entry.id, entry);
    }
  };

  pushEntries(createBuiltinWorkers(settings));

  const discoveredServers = await discoverMcpServers(settings, cwd);
  pushEntries(discoveredServers.map((server) => mapDiscoveredServer(server, settings)).filter(Boolean) as WorkerRegistryEntry[]);
  pushEntries(mapDiscoveredCliCandidates(settings));

  const manualWorkers = mapLegacyWorkerRegistry(settings);
  const manualEntries = Object.entries(manualWorkers).map(([id, definition]) =>
    normalizeDefinitionEntry(id, definition, definition.source ?? "manual")
  );
  pushEntries(manualEntries);

  const finalEntries = applyDisableList(sortByPriority([...registry.values()]), settings.discovery);
  return {
    entries: finalEntries,
    discovered_servers: discoveredServers
  };
}
