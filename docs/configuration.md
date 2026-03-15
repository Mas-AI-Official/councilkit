# Configuration

CouncilKit loads settings from:

1. `COUNCILKIT_CONFIG` (if set)
2. `./councilkit.settings.json`
3. `~/.councilkit/config.json`

## Core Schema

```json
{
  "active_host": "generic_mcp_host",
  "hosts": {
    "claude_code": { "type": "mcp_host", "enabled": true },
    "codex_cli": { "type": "cli_host", "enabled": true, "command": "codex" },
    "gemini_cli": { "type": "cli_host", "enabled": true, "command": "gemini" }
  },
  "workers": {
    "codex": {
      "type": "cli",
      "command": "codex",
      "role_tags": ["coding", "review", "general"],
      "cost_hint": "subscription",
      "privacy_mode": "remote",
      "enabled": true,
      "priority": 30
    },
    "gemini": {
      "type": "cli",
      "command": "gemini",
      "role_tags": ["research", "analysis", "general"],
      "cost_hint": "subscription",
      "privacy_mode": "remote",
      "enabled": true,
      "priority": 10
    },
    "local": {
      "type": "cli",
      "command": "ollama run qwen3:latest \"{task}\"",
      "role_tags": ["local", "analysis", "general"],
      "cost_hint": "free",
      "privacy_mode": "local",
      "enabled": true,
      "priority": 20
    },
    "ollama": {
      "type": "cli",
      "command": "ollama run qwen3:latest \"{task}\"",
      "role_tags": ["local", "coding", "general"],
      "cost_hint": "free",
      "privacy_mode": "local",
      "enabled": true,
      "priority": 40
    }
  },
  "discovery": {
    "enabled": true,
    "mcp_config_paths": [".mcp.json"],
    "auto_register_mcp_workers": true,
    "auto_register_cli_workers": true,
    "require_worker_metadata": true,
    "include": [],
    "exclude": [],
    "disabled_workers": [],
    "mcp_worker_hints": {},
    "cli_candidates": {}
  },
  "routing": {
    "default_mode": "council",
    "fallback_priority": ["gemini", "local", "codex"],
    "max_workers_per_task": 3,
    "prefer_local_for_sensitive_tasks": true,
    "prefer_subscription_before_api": true
  },
  "codex_command": "codex",
  "gemini_command": "gemini",
  "local_command": "ollama run qwen3:latest",
  "default_workers": ["gemini", "local", "codex"]
}
```

## Hosts

- `mcp_host`: host calls `council_run` via MCP.
- `cli_host`: host wrapper or CLI path.
- `api_host`: optional/future host pattern.

Host definitions describe entrypoints, not worker executors.

## Workers

`workers.<id>` supports:

- `type`: `cli`, `mcp`, `api`
- `command`/`args` (CLI)
- `url`/`endpoint` (MCP/API)
- `role_tags`, `strengths`, `privacy_mode`, `cost_hint`
- `enabled`, `health_status`, `priority`

## Backward Compatibility

CouncilKit still supports legacy fields:

- `codex_command`, `gemini_command`, `local_command`, `ollama_command`
- `worker_registry`
- `custom_workers`
- `default_workers`

Legacy values are merged into `workers` + `routing` at load time.

## Fast Local Profile (Codex + Gemini + Ollama)

```json
{
  "codex_command": "codex",
  "gemini_command": "gemini",
  "local_command": "ollama run qwen3:latest",
  "default_workers": ["gemini", "local", "codex"],
  "routing": {
    "fallback_priority": ["gemini", "local", "codex"]
  }
}
```

Run `npm run doctor` after setup; missing workers are reported as local external dependencies.

## Persistence

Runs are written to `~/.councilkit/runs/<timestamp>.json` by default.

```json
{
  "persistence": {
    "enabled": true,
    "directory": "~/.councilkit/runs"
  }
}
```
