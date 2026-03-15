# Neovim Integration (Manual)

Support level: `documented/manual`.

Use any MCP-capable Neovim plugin and point it at:

```bash
node /absolute/path/to/councilkit/dist/server.js
```

If your plugin expects JSON config, use this shape:

```json
{
  "mcpServers": {
    "council-hub": {
      "command": "node",
      "args": ["/absolute/path/to/councilkit/dist/server.js"]
    }
  }
}
```

## What Is Tested In This Repo

- CouncilKit server entrypoint and config shape.
- Neovim plugin-specific runtime behavior is not CI-verified in this repo.

## Known-Good Local Test Steps

1. Build CouncilKit: `npm ci && npm run build`
2. Add MCP config for `council-hub`.
3. Reload Neovim/plugin.
4. Run an explicit `council_run` test prompt and verify tool output fields.
