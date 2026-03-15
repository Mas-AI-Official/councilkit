export type CouncilMode = "single" | "council";
export type OutputFormat = "markdown" | "json";
export type WorkerStatus = "success" | "error" | "timeout" | "skipped";
export type WorkerAdapterType = "mcp" | "cli" | "api";
export type HostAdapterType = "mcp_host" | "cli_host" | "api_host";
export type WorkerTransport = "stdio" | "http" | "subprocess" | "local_api" | "other";
export type PrivacyMode = "local" | "remote" | "mixed";
export type CostHint = "free" | "subscription" | "api" | "unknown";
export type WorkerHealthStatus = "unknown" | "healthy" | "unavailable";
export type WorkerSource = "builtin" | "discovered" | "manual";

export interface CouncilRunInput {
  task: string;
  mode: CouncilMode;
  workers?: string[];
  output_format?: OutputFormat;
}

export interface WorkerResult {
  worker_name: string;
  status: WorkerStatus;
  stdout: string;
  stderr: string;
  parsed_json_if_any?: unknown;
  duration_ms: number;
  command: string;
  attempted_commands?: string[];
  exit_code?: number | null;
}

export interface WorkerSynthesisInput {
  worker_name: string;
  status: WorkerStatus;
  summary: string;
  key_points: string[];
  risks: string[];
  citations_needed: string[];
}

export interface RoutingScore {
  worker_id: string;
  score: number;
}

export interface TaskProfile {
  categories: string[];
  sensitive: boolean;
}

export interface CouncilRunMetadata {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  config_path?: string;
  persisted_to?: string;
  selected_workers: string[];
  requested_mode: CouncilMode;
  task_profile?: TaskProfile;
  routing_scores?: RoutingScore[];
}

export interface CouncilRunOutput {
  task: string;
  mode: CouncilMode;
  output_format: OutputFormat;
  results: WorkerResult[];
  synthesis_inputs: WorkerSynthesisInput[];
  disagreements: string[];
  recommended_next_checks: string[];
  metadata: CouncilRunMetadata;
}

export interface HostDefinition {
  type: HostAdapterType;
  command?: string;
  args?: string[];
  notes?: string;
  enabled?: boolean;
}

export interface WorkerDefinition {
  type: WorkerAdapterType;
  display_name?: string;
  transport?: WorkerTransport;
  role_tags?: string[];
  strengths?: string[];
  privacy_mode?: PrivacyMode;
  cost_hint?: CostHint;
  enabled?: boolean;
  health_status?: WorkerHealthStatus;
  command?: string;
  args?: string[];
  url?: string;
  endpoint?: string;
  model?: string;
  timeout_ms?: number;
  output_format?: "auto" | "json" | "text";
  mcp_server?: string;
  source?: WorkerSource;
  notes?: string;
  priority?: number;
}

export interface MappedMcpWorkerHint {
  id?: string;
  display_name?: string;
  adapter_type?: WorkerAdapterType;
  transport?: WorkerTransport;
  role_tags?: string[];
  strengths?: string[];
  privacy_mode?: PrivacyMode;
  cost_hint?: CostHint;
  health_status?: WorkerHealthStatus;
  enabled?: boolean;
  command?: string;
  args?: string[];
  url?: string;
  endpoint?: string;
  model?: string;
  timeout_ms?: number;
  output_format?: "auto" | "json" | "text";
  notes?: string;
}

export interface DiscoverySettings {
  enabled?: boolean;
  mcp_config_paths?: string[];
  auto_register_mcp_workers?: boolean;
  auto_register_cli_workers?: boolean;
  require_worker_metadata?: boolean;
  include?: string[];
  exclude?: string[];
  disabled_workers?: string[];
  mcp_worker_hints?: Record<string, MappedMcpWorkerHint>;
  cli_candidates?: Record<string, WorkerDefinition>;
}

export interface RoutingSettings {
  default_mode?: CouncilMode;
  fallback_priority?: string[];
  allow_single_worker?: boolean;
  max_workers_per_task?: number;
  prefer_local_for_sensitive_tasks?: boolean;
  prefer_subscription_before_api?: boolean;
}

export interface CouncilKitSettings {
  active_host?: string;
  hosts?: Record<string, HostDefinition>;
  workers?: Record<string, WorkerDefinition>;
  discovery?: DiscoverySettings;
  routing?: RoutingSettings;

  // Legacy compatibility fields:
  worker_registry?: Record<string, WorkerDefinition>;
  codex_command: string;
  gemini_command: string;
  local_command?: string | null;
  ollama_command?: string;
  ollama_model?: string;
  default_workers: string[];
  timeouts: {
    codex_ms: number;
    gemini_ms: number;
    local_ms: number;
    ollama_ms?: number;
  };
  codex: {
    use_output_schema: boolean;
  };
  custom_workers?: Record<
    string,
    {
      command: string;
      timeout_ms?: number;
      output_format?: "auto" | "json" | "text";
    }
  >;
  persistence: {
    enabled: boolean;
    directory: string;
  };
}

export interface WorkerRegistryEntry {
  id: string;
  display_name: string;
  adapter_type: WorkerAdapterType;
  transport: WorkerTransport;
  role_tags: string[];
  strengths: string[];
  privacy_mode: PrivacyMode;
  cost_hint: CostHint;
  enabled: boolean;
  health_status: WorkerHealthStatus;
  command?: string;
  args?: string[];
  url?: string;
  endpoint?: string;
  model?: string;
  timeout_ms?: number;
  output_format?: "auto" | "json" | "text";
  mcp_server?: string;
  source: WorkerSource;
  config_ref?: string;
  notes?: string;
  priority: number;
}

export interface LoadedSettings {
  settings: CouncilKitSettings;
  configPath?: string;
}
