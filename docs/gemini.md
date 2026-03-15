# Gemini Setup

CouncilKit can be used from Gemini as an MCP server path.

## Config Location

Gemini MCP config lives at:

- `~/.gemini/settings.json`

## Add CouncilKit MCP Server

Example config with another server plus CouncilKit:

```json
{
  "mcpServers": {
    "cloudrun": {
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"]
    },
    "councilkit": {
      "command": "node",
      "args": ["D:/Ideas/councilkit/dist/server.js"]
    }
  }
}
```

You can add CouncilKit alongside existing MCP servers in the same file.

## Apply Changes

1. Save `~/.gemini/settings.json`.
2. Restart/reload Gemini so MCP server definitions are re-read.
3. Run an early test prompt that explicitly asks Gemini to call `council_run`.

Example test prompt:

```text
Use councilkit.council_run in council mode with workers gemini, local, codex.
Task: compare rollout options and list disagreements plus next checks.
```

## Notes

- Gemini CLI/auth must be configured separately.
- CouncilKit orchestrates worker tools; it does not bypass host or worker quotas.
- If a worker is missing, `npm run doctor` reports it as an external local dependency.
