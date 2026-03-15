# FAQ

## Is CouncilKit Claude-only?

No. CouncilKit is host-agnostic. This repo ships a first-class Claude plugin path, but any MCP-capable host can call CouncilKit.

## What is the difference between hosts and workers?

- Host: entrypoint that sends `council_run` requests.
- Worker: model/tool execution target selected by registry + routing.

## What happens if Claude is capped?

Use another configured host path. CouncilKit is independent of one host, but host and worker usage limits still apply.

## Does CouncilKit create extra quota?

No. It orchestrates existing tools and subscriptions.

## `npm run doctor` reports missing workers. Is that a build failure?

No. Missing worker CLIs are external local dependency checks. Install/auth the CLI (or disable that worker) and re-run doctor.

## Is this “no API ever”?

No. API is optional. Core runtime is subscription-first and CLI-first.

## Is Perplexity supported?

Not in this repo today. It remains planned until an implemented, tested adapter is shipped and documented.

## Does discovery make every MCP server a worker automatically?

No. Discovery is metadata-driven and can require explicit hints.

## Why not use one model?

One model is fine for small tasks. Council mode helps when you need cross-checks, disagreement visibility, and explicit follow-up checks.
