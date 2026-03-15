# Launch Guide

## Positioning

- Host-agnostic model council for MCP, CLI, and optional API workers.
- One prompt. Many models. One answer.
- MCP-native. CLI-capable. API-optional.
- Bring your own host. Bring your own workers.
- Use your subscriptions first. Add APIs only when you want or need them.
- For many workflows, direct API setup is optional, not required.

## Release Recommendation

- Recommended now: `v0.1.0-beta.1` for first public launch.
- Move to `v0.1.0` once real-world feedback confirms host templates and visuals are stable.

## Suggested Release Title

`v0.1.0-beta.1 - Host-agnostic council runtime launch`

## Suggested GitHub About Line

Host-agnostic model council for MCP, CLI, and optional API workers. Route work across Codex, Gemini, Ollama, and custom workers, then return one unified answer.

## Suggested Short Tagline

One prompt. Many models. One answer.

## Suggested Technical Tagline

MCP-native. CLI-capable. API-optional.

## Suggested Release Notes Draft

### Highlights

- Host-agnostic runtime architecture (hosts and workers are separate concepts)
- Worker registry with metadata-driven discovery (not fixed to built-in workers only)
- Task-aware routing heuristics and worker scoring
- First-class Ollama local worker path
- Claude plugin bundle + documented/manual integration templates
- New launch visuals, social assets, and storyboard demo

### Important Notes

- Worker CLIs must be installed/authenticated separately
- CouncilKit orchestrates existing tools; it does not create extra quota
- Provider and host quotas still apply
- Some integration paths remain documented/manual or experimental by design

## Launch Channels

- GitHub repository release
- X/Twitter post
- Hacker News post
- Reddit intro
- Daena integration announcement

Ready copy is in [`docs/launch/`](./launch/).
