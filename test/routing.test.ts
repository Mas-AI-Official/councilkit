import assert from "node:assert/strict";
import test from "node:test";

import { classifyTask, selectWorkersForTask } from "../src/core/routing.js";
import type { CouncilKitSettings, WorkerRegistryEntry } from "../src/types/council.js";

const workerPool: WorkerRegistryEntry[] = [
  {
    id: "codex",
    display_name: "Codex",
    adapter_type: "cli",
    transport: "subprocess",
    role_tags: ["coding", "review", "general"],
    strengths: ["refactoring"],
    privacy_mode: "remote",
    cost_hint: "subscription",
    enabled: true,
    health_status: "healthy",
    command: "codex",
    source: "builtin",
    priority: 10
  },
  {
    id: "gemini",
    display_name: "Gemini",
    adapter_type: "cli",
    transport: "subprocess",
    role_tags: ["research", "analysis", "general"],
    strengths: ["research"],
    privacy_mode: "remote",
    cost_hint: "subscription",
    enabled: true,
    health_status: "healthy",
    command: "gemini",
    source: "builtin",
    priority: 20
  },
  {
    id: "ollama",
    display_name: "Ollama",
    adapter_type: "cli",
    transport: "subprocess",
    role_tags: ["local", "coding", "general"],
    strengths: ["local"],
    privacy_mode: "local",
    cost_hint: "free",
    enabled: true,
    health_status: "healthy",
    command: "ollama run llama3.1 \"{task}\"",
    source: "builtin",
    priority: 30
  }
];

const settings: CouncilKitSettings = {
  codex_command: "codex",
  gemini_command: "gemini",
  local_command: null,
  ollama_command: "ollama",
  ollama_model: "llama3.1",
  default_workers: ["codex", "gemini"],
  timeouts: {
    codex_ms: 300000,
    gemini_ms: 300000,
    local_ms: 180000,
    ollama_ms: 180000
  },
  codex: {
    use_output_schema: true
  },
  persistence: {
    enabled: false,
    directory: "~/.councilkit/runs"
  },
  routing: {
    default_mode: "council",
    fallback_priority: ["codex", "gemini", "ollama"],
    max_workers_per_task: 2,
    prefer_local_for_sensitive_tasks: true,
    prefer_subscription_before_api: true
  }
};

test("classifyTask marks privacy-sensitive tasks", () => {
  const profile = classifyTask("Refactor this private module without sending secrets externally.");
  assert.equal(profile.sensitive, true);
  assert.ok(profile.categories.includes("coding"));
  assert.ok(profile.categories.includes("local"));
});

test("routing prefers research worker for research-heavy tasks", () => {
  const result = selectWorkersForTask(
    {
      task: "Research and compare tradeoffs between these architectures with evidence.",
      mode: "single"
    },
    workerPool,
    settings
  );

  assert.equal(result.selected_worker_ids[0], "gemini");
});

test("routing prefers local worker for sensitive tasks when configured", () => {
  const result = selectWorkersForTask(
    {
      task: "Private and sensitive refactor for local-only code.",
      mode: "single"
    },
    workerPool,
    settings
  );

  assert.equal(result.selected_worker_ids[0], "ollama");
});
