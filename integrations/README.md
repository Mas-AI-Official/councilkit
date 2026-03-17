# Integrations

MergeLoop is host-agnostic, but integration paths have explicit support levels.

## Pick Your Host Path

### First-class / direct

- Claude Code:
  - bundled plugin path in this repo
  - best if you want the in-repo plugin flow
- Gemini:
  - `npm run setup -- --yes --host=gemini --workers=gemini,ollama,codex`
  - writes MergeLoop into `~/.gemini/settings.json`
- Generic MCP host:
  - `npm run setup -- --yes --host=generic --workers=gemini,ollama,codex`
  - best safe first test because it writes local repo config only

### Documented/manual IDE paths

- Cursor
- Windsurf
- OpenClaw
- VS Code
- Zed
- Neovim
- JetBrains

Recommended flow for these hosts:

1. Run `npm run setup -- --yes --host=generic --workers=gemini,ollama,codex`
2. Copy the generated MergeLoop MCP server entry from local `.mcp.json`
3. Paste/adapt that entry into the host-specific template in this folder
4. Reload the host and run a direct `mergeloop_run` prompt

### Experimental

- Antigravity:
  - `npm run setup -- --yes --host=antigravity --workers=gemini,ollama,codex`
  - useful if you already use that config path locally
  - still marked experimental because host-specific behavior is not CI-verified here

## Support Levels

- `first-class`: maintained and tested in this repo
- `documented/manual`: templates provided; local host behavior must be verified by the user
- `experimental`: optional path with partial validation
- `planned`: not implemented in this repo

## Integration Status

| Integration | Level | What is tested in this repo | What you must verify locally |
|---|---|---|---|
| Claude Code plugin bundle | first-class | plugin + MCP startup + smoke flow | your local CLI auth and host limits |
| VS Code template | documented/manual | template file shape | host MCP loading + tool call flow |
| Cursor template | documented/manual | template file shape | host MCP loading + tool call flow |
| Windsurf template | documented/manual | template file shape | host MCP loading + tool call flow |
| OpenClaw templates | documented/manual | template files + integration guide | version-specific host behavior |
| Zed template | documented/manual | template file shape | host MCP loading + tool call flow |
| Neovim guide | documented/manual | guide path + config example | plugin stack compatibility |
| JetBrains guide | documented/manual | guide path + config example | plugin/runtime compatibility |
| Antigravity path | experimental | optional config path | command availability + output behavior |
| Perplexity path | planned | n/a | n/a |

Host-specific docs/templates:

- VS Code: [`vscode/README.md`](./vscode/README.md), [`vscode/mcp.json`](./vscode/mcp.json)
- Cursor: [`cursor/README.md`](./cursor/README.md), [`cursor/mcp.json`](./cursor/mcp.json)
- Windsurf: [`windsurf/README.md`](./windsurf/README.md), [`windsurf/mcp_config.json`](./windsurf/mcp_config.json)
- OpenClaw: [`openclaw/README.md`](./openclaw/README.md)
- Zed: [`zed/README.md`](./zed/README.md), [`zed/settings.json`](./zed/settings.json)
- Neovim: [`neovim/README.md`](./neovim/README.md)
- JetBrains: [`jetbrains/README.md`](./jetbrains/README.md)

Recommended quick links:

- Cursor: [`cursor/README.md`](./cursor/README.md)
- Windsurf: [`windsurf/README.md`](./windsurf/README.md)
- OpenClaw: [`openclaw/README.md`](./openclaw/README.md)

## Known-Good Local Test Steps (documented/manual paths)

1. Build MergeLoop:
   - `npm ci`
   - `npm run build`
2. Register MCP server path in host config:
   - `command: node`
   - `args: ["D:/Ideas/MergeLoop/dist/server.js"]`
3. Restart/reload host.
4. Run a direct council test prompt that explicitly calls `mergeloop_run`.
5. Confirm output includes:
   - `results`
   - `disagreements`
   - `recommended_next_checks`

## Safety Reminder

Templates configure MergeLoop as an MCP server endpoint only.
Worker authentication and usage limits remain controlled by each worker tool.
