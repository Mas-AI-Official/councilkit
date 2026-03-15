# Windsurf Integration

Support level: `documented/manual`.

Template file: [`mcp_config.json`](./mcp_config.json)

## What Is Tested In This Repo

- Template shape and CouncilKit server command/args pattern.
- Windsurf plugin/runtime behavior is not CI-verified in this repo.

## Known-Good Local Test Steps

1. Build CouncilKit: `npm ci && npm run build`
2. Register CouncilKit MCP server with absolute local path in Windsurf config.
3. Reload Windsurf.
4. Trigger `council_run` and verify result payload fields.
