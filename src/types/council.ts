export type CouncilMode = "single" | "council";
export type OutputFormat = "markdown" | "json";
export type WorkerName = "codex" | "gemini" | "local";
export type WorkerStatus = "success" | "error" | "timeout" | "skipped";

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

export interface CouncilRunMetadata {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  config_path?: string;
  persisted_to?: string;
  selected_workers: string[];
  requested_mode: CouncilMode;
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

export interface CouncilKitSettings {
  codex_command: string;
  gemini_command: string;
  local_command?: string | null;
  default_workers: string[];
  timeouts: {
    codex_ms: number;
    gemini_ms: number;
    local_ms: number;
  };
  codex: {
    use_output_schema: boolean;
  };
  persistence: {
    enabled: boolean;
    directory: string;
  };
}

export interface LoadedSettings {
  settings: CouncilKitSettings;
  configPath?: string;
}
