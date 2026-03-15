# Zed Integration

Support level: `documented/manual`.

Template file: [`settings.json`](./settings.json)

## What Is Tested In This Repo

- Template shape and CouncilKit MCP registration pattern.
- Zed runtime/plugin behavior is user-environment specific and not CI-verified here.

## Known-Good Local Test Steps

1. Build CouncilKit: `npm ci && npm run build`
2. Add `council-hub` MCP entry in Zed config using absolute path.
3. Reload Zed.
4. Run an explicit `council_run` prompt and inspect returned structured fields.
