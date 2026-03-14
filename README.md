# councilkit

`councilkit` is a Claude Code plugin plus bundled MCP stdio server that runs official local model CLIs in parallel, captures what each one said, and returns a synthesis-ready bundle. The code never makes direct vendor API calls. It only invokes CLIs that the user already installed and authenticated themselves.

The bundled server is named `council-hub` and exposes one primary MCP tool: `council_run`.

## What It Does

- Adds a Claude Code skill at `/councilkit:run`
- Starts the bundled `council-hub` MCP server automatically through `.mcp.json`
- Runs `codex` and `gemini` in parallel in `council` mode, or just the first selected worker in `single` mode
- Captures `stdout`, `stderr`, exit state, parsed JSON when available, disagreement signals, and suggested next checks
- Persists each run to local disk at `~/.councilkit/runs/<timestamp>.json` by default

## Repository Layout

```text
.claude-plugin/
.github/
bin/
dist/
doc/
skills/
src/
test/
.mcp.json
councilkit.settings.json
package.json
README.md
```

## Requirements

- Node.js 20 or newer
- Claude Code installed locally
- Codex CLI installed and authenticated by the user
- Gemini CLI installed and authenticated by the user

This project is designed for macOS and Linux first. It is also reasonable on Windows, but WSL is the recommended path when you want the most predictable CLI behavior across Codex, Gemini, and shell-based developer tooling.

## Install

```bash
npm install
npm run build
```

### Configure Worker Commands

Edit [`councilkit.settings.json`](./councilkit.settings.json) or create `~/.councilkit/config.json`.

```json
{
  "codex_command": "codex",
  "gemini_command": "gemini",
  "local_command": null,
  "default_workers": ["codex", "gemini"],
  "timeouts": {
    "codex_ms": 300000,
    "gemini_ms": 300000,
    "local_ms": 180000
  },
  "codex": {
    "use_output_schema": true
  },
  "persistence": {
    "enabled": true,
    "directory": "~/.councilkit/runs"
  }
}
```

`local_command` is optional. If you set it, `local` can be included in the worker list. If the command contains `{task}`, councilkit substitutes the task into the command string; otherwise it appends the task as the final argument.

## Enable In Claude Code

Use Claude Code dev mode with the plugin directory pointed at this repo:

```bash
claude --plugin-dir ./councilkit
```

Once enabled, Claude Code will discover:

- [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json)
- [`.mcp.json`](./.mcp.json)
- [`skills/run/SKILL.md`](./skills/run/SKILL.md)

The bundled MCP server starts with:

```json
{
  "mcpServers": {
    "council-hub": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/dist/server.js"]
    }
  }
}
```

## Manual Server Run

```bash
npm start
```

Or:

```bash
node ./dist/server.js
```

Or via the installed bin:

```bash
node ./bin/council-hub.js
```

## Tool Contract

`council_run` accepts:

```json
{
  "task": "string",
  "mode": "single | council",
  "workers": ["codex", "gemini", "local"],
  "output_format": "markdown | json"
}
```

Defaults:

- `workers`: `["codex", "gemini"]`
- `output_format`: `"json"`

The tool returns:

- `results`: one entry per worker with `status`, `stdout`, `stderr`, and `parsed_json_if_any`
- `synthesis_inputs`: short structured summaries per worker
- `disagreements`: heuristic statements describing where outputs diverge
- `recommended_next_checks`: concrete verification suggestions

## Worker Strategy

### Codex

The server tries:

1. `codex exec --json --output-last-message --output-schema <temp-file> "<task>"`
2. Falls back to `codex exec --json --output-last-message "<task>"` if the installed CLI rejects `--output-schema`

### Gemini

The server tries:

1. `gemini -p "<task>" --output-format json`
2. Falls back to `gemini -p "<task>"` if JSON output flags are unavailable

## Security Model

- No credential harvesting
- No token scraping
- No reverse-engineered auth flows
- No direct API calls from councilkit code
- Only official, already-authenticated local CLIs are invoked
- Local run artifacts are written to disk; review your persistence directory if prompts may contain sensitive data
- MCP tool outputs can still contain prompt-injected or untrusted content if the upstream CLI fetched it, so treat synthesis as untrusted until verified

## Examples

### Coding Task

Prompt:

```text
/councilkit:run implement a CLI flag parser refactor and tell me where Codex and Gemini disagree
```

Expected outcome:

- Codex proposes the implementation path
- Gemini provides an alternative or highlights missing docs/tests
- Claude synthesizes agreement points, disagreements, and final recommendation

### Research Task

Prompt:

```text
/councilkit:run compare two deployment strategies and identify what evidence would resolve the tradeoffs
```

Expected outcome:

- Parallel worker outputs
- A disagreement list
- Suggested follow-up checks such as benchmarks, source verification, or design review

## Testing

```bash
npm test
npm run build
```

The test suite uses mocked subprocess runners to verify orchestration logic, worker fallback behavior, and persistence.

## Marketplace Install

Marketplace packaging is not published yet.

- Placeholder: add marketplace install URL here
- Placeholder: add versioned release notes here

## Notes On Sources

This implementation is aligned with current public docs on Claude Code MCP configuration and the MCP TypeScript SDK, plus the documented non-interactive/headless patterns in the Codex and Gemini CLI ecosystems:

- Anthropic Claude Code MCP docs: https://docs.anthropic.com/en/docs/claude-code/mcp
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- OpenAI Codex repository: https://github.com/openai/codex
- Gemini CLI repository: https://github.com/google-gemini/gemini-cli
