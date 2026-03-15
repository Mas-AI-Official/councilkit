# Discovery

CouncilKit discovery is metadata-driven. It does not assume every MCP server is a worker.

## Discovery Flow

1. Load CouncilKit config.
2. Read MCP config files from `discovery.mcp_config_paths` (plus local `.mcp.json`).
3. Parse `mcpServers` entries.
4. Register only servers with explicit worker metadata when `require_worker_metadata` is true.
5. Merge discovered candidates with built-ins and manual workers.

## Key Settings

```json
{
  "discovery": {
    "enabled": true,
    "mcp_config_paths": [".mcp.json", "~/.config/myhost/mcp.json"],
    "auto_register_mcp_workers": true,
    "auto_register_cli_workers": true,
    "require_worker_metadata": true,
    "include": [],
    "exclude": [],
    "disabled_workers": [],
    "mcp_worker_hints": {},
    "cli_candidates": {}
  }
}
```

## MCP Worker Hints

Use `mcp_worker_hints` to explicitly map discovered MCP servers into worker entries.

```json
{
  "discovery": {
    "mcp_worker_hints": {
      "research_server": {
        "id": "research_cli_bridge",
        "adapter_type": "cli",
        "command": "research-worker \"{task}\"",
        "role_tags": ["research", "analysis"],
        "privacy_mode": "mixed",
        "cost_hint": "unknown",
        "enabled": true
      }
    }
  }
}
```

## Include/Exclude Rules

- `include`: allow-list patterns (`*` wildcard).
- `exclude`: deny-list patterns (`*` wildcard).
- `disabled_workers`: force-disable final entries by worker ID.

These rules apply to discovered and manual workers after merge.

## Important Constraints

- Discovery does not infer full capabilities from arbitrary servers.
- You should provide role/cost/privacy metadata for reliable routing.
- Experimental adapters should be labeled clearly in team configs.
