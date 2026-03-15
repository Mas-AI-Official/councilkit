# JetBrains Integration (Manual)

Support level: `documented/manual`.

Use an MCP-compatible plugin or external tool launcher and register:

- Command: `node`
- Args: `/absolute/path/to/councilkit/dist/server.js`

For plugin-specific config, copy the same `mcpServers` JSON pattern used in `integrations/vscode/mcp.json`.

## What Is Tested In This Repo

- CouncilKit server entrypoint and template shape.
- JetBrains plugin-specific behavior is not CI-verified here.

## Known-Good Local Test Steps

1. Build CouncilKit: `npm ci && npm run build`
2. Register `node D:/Ideas/councilkit/dist/server.js` in your JetBrains MCP plugin/tool settings.
3. Restart IDE/plugin.
4. Run a prompt that explicitly invokes `council_run`.
