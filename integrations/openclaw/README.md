# OpenClaw Integration

Support level: `documented/manual`.

This repo supports OpenClaw in two practical ways.

## 1) Use OpenClaw As A Worker In CouncilKit (Supported Now)

Add this to `councilkit.settings.json`:

```json
{
  "workers": {
    "openclaw": {
      "type": "cli",
      "enabled": true,
      "command": "openclaw \"{task}\"",
      "output_format": "auto",
      "role_tags": ["general"],
      "cost_hint": "unknown",
      "privacy_mode": "remote",
      "priority": 60
    }
  }
}
```

Then call:

```json
{
  "task": "Your task",
  "mode": "council",
  "workers": ["codex", "gemini", "openclaw"]
}
```

## 2) Load CouncilKit Server From OpenClaw (documented/manual path)

If your OpenClaw setup supports MCP server entries, point it to:

- `command`: `node`
- `args`: `/absolute/path/to/councilkit/dist/server.js`

Use [`mcp-server-template.json`](./mcp-server-template.json) as a base snippet.

## Notes

- OpenClaw integration behavior depends on the OpenClaw version and wrappers you use.
- CouncilKit does not include OpenClaw auth logic; OpenClaw must already be installed and authenticated separately.
- Legacy `custom_workers` remains supported for backward compatibility.

## What Is Tested In This Repo

- Template JSON files are maintained and smoke-checked for path correctness.
- CouncilKit runtime behavior is tested independently; host-specific OpenClaw behavior is not CI-verified.

## Known-Good Local Test Steps

1. Run `npm ci && npm run build`.
2. Register CouncilKit MCP server in your OpenClaw config.
3. Restart OpenClaw.
4. Run a prompt that explicitly calls `council_run`.
5. Verify output includes `results`, `disagreements`, and `recommended_next_checks`.
