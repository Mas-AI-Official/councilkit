# Architecture

CouncilKit architecture separates hosts and workers:

Host -> CouncilKit Core -> Worker Registry + Routing -> Selected Workers -> Unified Answer

## Core Components

- `CouncilKit Core`: orchestration engine + synthesis + persistence.
- `council-hub`: MCP stdio server (`src/mcp/server.ts`).
- Worker adapters:
  - CLI worker adapter (active today)
  - MCP worker adapter pattern (discovery/config path)
  - optional API worker adapter pattern

## Host vs Worker Separation

- Host: entrypoint that invokes `council_run`.
- Worker: model/tool executor chosen by registry + router.
- CouncilKit: middle layer coordinating fan-out and merge.

This allows one runtime to support multiple host paths without hard-coding one editor or one vendor.

## Registry and Discovery

Registry is built from:

1. built-in workers (`codex`, `gemini`, `local`, `ollama`)
2. discovered MCP server candidates (metadata-gated)
3. discovered CLI candidates from config
4. manual worker entries

Discovery is controlled by include/exclude lists and optional metadata hints.

## Routing

Routing is heuristic-based:

- classify task (`coding`, `research`, `planning`, `sensitive`)
- score workers by tags, privacy mode, cost hint, priority, health
- select workers for `single` or `council` mode

Routing metadata is returned in `metadata.task_profile` and `metadata.routing_scores`.

## Interfaces

Adapter pattern references:

- [`src/adapters/types.ts`](../src/adapters/types.ts)
- [`src/types/council.ts`](../src/types/council.ts)
