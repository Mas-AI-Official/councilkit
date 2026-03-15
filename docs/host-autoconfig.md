# Host Auto-Config

CouncilKit setup supports safe host config merge for selected hosts.

## Auto-Configured Targets

- Gemini settings (`~/.gemini/settings.json`)  
  Level: first-class auto-config in this repo.
- Antigravity MCP config (`~/.gemini/antigravity/mcp_config.json`)  
  Level: experimental auto-config.
- Generic local MCP config (`./.mcp.json`)  
  Level: documented/manual host with auto-written template.

## Manual Target

- Claude Code plugin path (`claude --plugin-dir ./councilkit`)  
  No host JSON file is modified by setup for this path.

## Merge Behavior

When auto-configuring a host JSON file, setup:

1. reads existing JSON config
2. preserves unrelated entries
3. upserts `mcpServers.councilkit` with `node .../dist/server.js`
4. avoids duplicate CouncilKit entry if equivalent entry already exists
5. creates timestamped backup before any file rewrite

## Claims and Limits

- Auto-config support is explicit by host and does not imply universal host parity.
- CouncilKit does not infer worker capability from arbitrary MCP servers.
- Manual verification is still required for host-specific runtime behavior.
