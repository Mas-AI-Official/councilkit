# Ollama Worker

Ollama is a first-class local worker path in CouncilKit.

## What CouncilKit Supports

- Ollama as a local runtime/provider for worker execution
- CLI worker path (`ollama run ...`)
- local fallback for privacy-sensitive tasks
- optional local API awareness (`http://localhost:11434/api`) for future adapter paths

## What CouncilKit Does Not Claim

- CouncilKit does **not** claim Ollama is an official universal MCP server by default.
- CouncilKit integrates Ollama through worker adapters (CLI today, optional local API pattern later).

## Ollama Via `local_command` (legacy-compatible)

```json
{
  "local_command": "ollama run qwen3:latest",
  "default_workers": ["gemini", "local", "codex"]
}
```

## Codex + Gemini + Ollama Stack

```json
{
  "codex_command": "codex",
  "gemini_command": "gemini",
  "local_command": "ollama run qwen3:latest",
  "default_workers": ["gemini", "local", "codex"],
  "routing": {
    "fallback_priority": ["gemini", "local", "codex"],
    "prefer_local_for_sensitive_tasks": true
  }
}
```

## Gemini-First Routing (reduce Codex usage)

```json
{
  "routing": {
    "fallback_priority": ["gemini", "local", "codex"],
    "prefer_subscription_before_api": true,
    "max_workers_per_task": 2
  }
}
```

Related examples:

- `examples/ollama-via-local-command.json`
- `examples/codex-gemini-ollama-stack.json`
- `examples/gemini-first-routing.json`

## Practical Setup

1. Install Ollama.
2. Pull a model:
   - `ollama pull qwen3:latest`
3. Start runtime:
   - `ollama serve`
4. Run `npm run doctor` and verify local worker availability.
