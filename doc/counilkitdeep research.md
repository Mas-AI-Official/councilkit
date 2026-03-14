# Subscription-first multi-model orchestration with MCP

## What you’re trying to build and why it works

You’re describing a “model council” style orchestrator: one **front-door** in your IDE (you prefer Claude Code), which splits a request into subtasks, routes each subtask to the model that’s strongest at it (or cheapest / least rate-limited), and then synthesizes one final answer. That’s not a hypothetical pattern—entity["company","Perplexity","ai search company"] explicitly ships a productized version called **Model Council**, which runs a query across three models in parallel and then uses a synthesizer model to merge the outputs while showing agreement vs disagreement.citeturn5view6

The strongest “why it works” argument isn’t “three models are always better than one,” but “ensembling reduces single-model blind spots.” Perplexity’s own framing is exactly that: multi-model outputs reveal convergence (higher confidence) and disagreement (where you should investigate further).citeturn5view6 This aligns with the broader research direction around *ensembling* and *multi-agent / multi-model collaboration*—for example, self-consistency (sampling multiple reasoning paths and selecting the most consistent answer) shows large gains on reasoning benchmarks.citeturn2search2turn2search14 Likewise, multi-model collaboration methods like Mixture-of-Agents (MoA) report quality improvements by iteratively refining outputs across multiple agents/models.citeturn2search4turn2search0

The main caveat: **multi-agent/multi-model does not guarantee truth**. Research and field experience show debate-style approaches can fail when persuasiveness wins over correctness; there are controlled studies raising concerns that apparent gains can come from aggregation rather than genuine “argumentation improving truth.”citeturn2search5turn2search1 So your orchestrator should be designed to (a) expose uncertainty and (b) support verification, not just “average everything.”

## Reality checks for a no-API, subscription-first approach

Your constraint is “no API—just MCP + CLI + subscriptions.” That is feasible **locally**, but becomes hard (and sometimes not allowed) as a **hosted, multi-tenant SaaS**.

The biggest constraint is on the entity["company","Anthropic","ai safety company"] side: Claude Code’s legal/compliance documentation says OAuth from Free/Pro/Max plans is intended exclusively for Claude Code and Claude.ai, and using those OAuth tokens in *any other product/tool/service* is not permitted; developers building products/services should use API keys instead.citeturn5view4 This matters because your idea resembles the “subscription arbitrage harness” category that has been under enforcement pressure; it’s the difference between:
- **A plugin that runs inside Claude Code** (using Claude Code’s supported extension points), vs.
- **A third-party tool that reuses subscription OAuth outside the official clients** (explicitly disallowed for third-party products).citeturn5view4

On the entity["company","OpenAI","ai research company"] and entity["company","Google","technology company"] sides, your “subscription-first” plan is helped by the fact that both vendors provide **official CLIs**:
- **Codex CLI** supports “Sign in with ChatGPT” for subscription access and has a non-interactive `codex exec` mode designed for automation, with structured output options like `--json` and `--output-schema`.citeturn5view5turn16search2turn16search0  
- **Gemini CLI** is an open-source agent that uses a ReAct loop and supports local/remote MCP servers; it also has non-interactive modes and explicit quotas tied to Gemini Code Assist editions.citeturn5view3turn8view0

So the clean compliance posture (especially if you want this to go viral/open-source) is:

- Build a **Claude Code plugin + MCP server** that orchestrates *other* tools/models via their official CLIs and/or MCP servers.
- Avoid building (or encouraging others to build) anything that routes Claude consumer-plan OAuth through a third-party harness outside Claude Code/Claude.ai.citeturn5view4

## Architecture blueprint for your Claude Code “council” plugin

The most aligned shape with your requirements is:

1. **Claude Code remains the primary UX** (terminal / IDE extension / desktop).
2. You ship a **Claude Code plugin** that bundles:
   - A “Council” skill (a slash command) that triggers orchestration.
   - A local MCP server (“Council Hub”) started automatically when the plugin enables.
   - Optional hooks/guardrails (for safety + observability).

Claude Code’s plugin system is explicitly designed for packaging skills, agents, hooks, and MCP servers into a reusable installable unit; plugins have a manifest at `.claude-plugin/plugin.json`, and plugin MCP servers can be defined in `.mcp.json` or inline, and start automatically when the plugin is enabled.citeturn11view0turn12view0turn12view2

### Council Hub as an MCP server

Your Council Hub MCP server can expose tools like:
- `council.plan(task, constraints)` → returns a subtask graph.
- `council.run(task, mode=single|council, budget)` → runs selected workers in parallel and returns structured bundles.
- `council.summarize(bundle)` → returns a synthesis-ready structure.

Then Claude (via your skill prompt) synthesizes the final response using the returned structured outputs.

Why MCP is a fit: Claude Code can connect to many MCP servers, and when tool definitions become large, Claude Code supports **MCP Tool Search**, which dynamically loads tools on-demand instead of preloading them (triggered when tool descriptions exceed 10% of context by default).citeturn14view0turn5view0 This directly addresses your “I don’t want context/memory to explode” concern in a more principled way than ad-hoc compression.

Claude Code also has practical “guardrails” you can lean on:
- It supports MCP `list_changed` notifications so tool catalogs can refresh dynamically.citeturn14view3turn5view0
- It warns on large MCP tool outputs and allows configuring output token limits (default max 25,000 tokens, warning at 10,000).citeturn14view0turn15view0
- It supports specced installation scopes (local/project/user) and managed allowlists/denylists for enterprise governance.citeturn15view1turn14view0turn9search1

### Workers: Codex, Gemini, local models

You have three practical “worker” integration patterns, still staying within your “no API calls from my app” philosophy:

**Codex as a worker**
- Either call `codex exec` as a subprocess and request structured output with `--json` and/or `--output-schema`.citeturn16search2turn16search0  
- Or run Codex as an MCP server (Codex supports MCP servers and also has `codex mcp-server` / “run as MCP server” flows).citeturn9search5turn5view2

**Gemini as a worker**
- Call `gemini -p ... --output-format json` (Gemini CLI documents JSON output formats and scripting modes), or wrap it behind a tiny “Gemini Worker MCP server.”citeturn8view0turn5view3  
- Gemini CLI explicitly supports local/remote MCP servers and frames itself as a ReAct loop agent.citeturn5view3turn8view0

**Local models**
- Keep this optional: you can let users point a worker adapter at a local runtime like entity["company","Ollama","local llm runtime"] and use it for cheap summarization/reformatting steps, while reserving subscription-heavy work for high-value subtasks. (This portion is design guidance; local runtime integration details vary by user environment.)

### The “shared memory” you actually want

You said you want something like Perplexity: multi-model outputs plus “shared memory.” Perplexity implements memory as a personalization layer that stores “memories” and uses search history, with controls to view/delete/toggle, and it can be used depending on the question.citeturn17view0

In Claude Code, you already have **two native memory-like mechanisms** you can exploit instead of inventing everything:
- **CLAUDE.md** as persistent user/project instructions.citeturn18search0turn6search8  
- **Auto memory**, where Claude saves learned patterns like build commands and debugging insights across sessions.citeturn18search0turn18search3turn18search12

So your “virtual memory until answers come back” can be implemented as:
- A **job-local scratchpad** inside Council Hub (ephemeral per request).
- A **session artifact** written to a file (`council_runs/YYYY-MM-DD/<task>.md`) that Claude can reference later via file tools (or via an MCP resource).  
- Optional “cloud persistence” by writing the artifact into a repo and pushing with git, or via a trusted storage MCP server (design guidance; which storage depends on the user).

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Model Context Protocol architecture diagram","Claude Code plugin MCP server diagram","Perplexity Model Council screenshot","multi-agent LLM orchestration diagram"],"num_per_query":1}

## How this differs from OpenClaw-style integration and what it means for Daena

You asked specifically about “Daena + OpenClaw integration” and how the new MCP-based council differs.

I could not access any internal docs for entity["organization","Daena","user ai orchestration project"] in your environment, so the comparison below is **structural** (based on publicly available architecture patterns), not a line-by-line diff of your code.

### OpenClaw’s shape

entity["organization","OpenClaw","open source agent gateway"] describes itself as a **self-hosted gateway** that connects messaging apps to agents, running a gateway process you host.citeturn10search1 It can run with APIs or local-only, and it discusses subscription-based auth paths while cautioning that subscription auth may not be stable/policy-safe depending on provider enforcement.citeturn10search11

That “always-on gateway to many front-ends” is great for “assistant everywhere,” but it collides with the subscription-policy boundary for Claude consumer accounts: Claude Code docs explicitly prohibit routing Free/Pro/Max OAuth tokens via third-party tools/services.citeturn5view4

### Your new proposal’s shape

Your proposed “Council MCP” is better positioned if you treat:

- Claude Code as the **host/orchestrator** (because plugins + MCP are first-class there).citeturn11view0turn12view0turn5view0  
- Codex CLI + Gemini CLI as **workers** invoked via their official clients.citeturn16search2turn8view0turn5view3

This makes your council layer an **extension of the official tooling** rather than a harness that impersonates it (the thing that triggers enforcement).citeturn5view4

### How to fit it into Daena

If Daena already has an orchestrator loop, treat “Council Hub” as **one more tool in Daena’s toolbox**:
- When the user has only one subscription, Daena routes to that single-model worker.
- When the user has multiple subscriptions, Daena can:
  - Run a “single best model” path by default, and
  - Escalate to “council mode” only when needed (high stakes, low confidence, or disagreement signals).

That escalation philosophy is directly aligned with Perplexity’s positioning: Model Council is for cases where accuracy and balanced perspectives matter, and it’s a deliberate mode rather than the default for everything.citeturn5view6

## Governance, safety, and cost-control patterns that make it actually better

Your goal is “stronger answers without burning one credit bucket.” The uncomfortable truth: **parallelism increases total usage** if you do it on every query. Even Perplexity places Model Council behind a top-tier plan and positions it for “research that matters,” not everyday trivial queries.citeturn5view6

So the “better or not?” answer depends on whether you implement *selective orchestration* with strong guardrails:

### Use council mode only when it is likely to pay off

A grounded, research-aligned approach is:
- Default to **single-model** (your best generalist).
- Use council mode when:
  - The task is high-impact (money/health/legal/security),
  - The model expresses uncertainty,
  - Retrieval sources conflict, or
  - You want verification.

This matches both Perplexity’s guidance (cross-validation, show disagreements)citeturn5view6 and the “LLM council” concept in applied research where model convergence boosts confidence and divergence flags uncertainty for human judgment.citeturn13search29

### Prefer “structured outputs” for synthesis, not free-form text

If your Council Hub collects outputs as JSON objects with explicit fields (claims, evidence, TODOs, citations, risk notes), synthesis becomes more reliable and less “beauty contest.” Codex explicitly supports structured final outputs via `--output-schema` in non-interactive mode.citeturn16search2turn16search0

### Treat tool-enabled systems as a security boundary

Any time you let models call tools (especially via MCP), you inherit prompt injection risk and “malicious tool metadata” risk:
- Claude Code warns that third-party MCP servers are “use at your own risk” and calls out prompt injection concerns when tools fetch untrusted content.citeturn5view0turn14view0  
- entity["company","OpenAI","ai research company"] has a dedicated write-up on prompt injection as a frontier security challenge, especially as systems browse the web and take actions.citeturn9search9  
- OpenAI’s MCP/connectors guidance similarly warns that malicious MCP servers can embed hidden instructions and may update behavior unexpectedly, and recommends connecting only to trusted servers.citeturn9search23  
- The MCP security docs provide authorization and best-practices guidance (OAuth, threat modeling, risk mitigation).citeturn9search0turn9search3

**Practical implication for your build:** ship your council plugin with conservative defaults:
- Read-only by default for external systems.
- Explicit allowlists for which MCP servers the council can invoke.
- Clear audit logs per run (inputs, tools called, outputs).

Claude Code hooks can help enforce these controls because hooks can run at defined points in the tool lifecycle and receive event context.citeturn18search2turn12view0

### Don’t oversell “debate” as truth

If you add a debate layer (model A critiques model B), include the research caveat: debate approaches can be gamed by persuasive but incorrect arguments; studies question whether gains come from interaction vs aggregation.citeturn2search5turn2search1

A safer pattern is:
- Parallel answers → structured extraction of claims → targeted verification step (retrieve sources, run tests, check code) → synthesis.

This stays aligned with what agentic coding tools are already built to do (run commands/tests, inspect diffs, etc.).citeturn5view1turn16search1

## Build guidance: open-source strategy, name ideas, and a Codex prompt you can run locally

### Open-source vs closed-source split that won’t backfire

If your goal is GitHub stars and broad adoption, the cleanest approach is:

- **Open-source (Apache 2.0)**:
  - The Claude Code plugin (skills + optional hooks + bundled Council Hub MCP server).
  - The Council Hub MCP server core (local-first).
  - Worker adapters for Codex CLI and Gemini CLI (subprocess wrappers, no credential handling beyond calling official CLIs).

Apache 2.0 is a strong default here because both Codex’s repo and Gemini CLI’s repo are Apache-2.0 licensed, and your tool is in the same “developer tooling” space.citeturn7view0turn8view0

- **Keep out of scope (or separate repo, clearly marked optional)**:
  - Any cloud-hosted “shared memory” SaaS that proxies user credentials.
  - Any mechanism that routes Claude consumer subscription OAuth outside Claude Code/Claude.ai (explicitly disallowed for third-party products).citeturn5view4

If you later want “cloud memory,” make it user-owned storage (git repo, their cloud drive via a trusted MCP server), not “we store everything on our servers,” unless you move to API-based auth and clear commercial terms.

### Viral name directions

You want a name that communicates: council, conductor, orchestration, MCP-native, local-first.

A few options that tend to be memorable and “GitHub-friendly”:
- **CouncilKit**
- **MCP Conductor**
- **Triad**
- **SwarmSwitch**
- **OrchestraMCP**
- **ModelMux**
- **CouncilForge**
- **StackCouncil**

Tagline examples (choose one):
- “One command. Many models. One answer.”
- “Bring your subscriptions together—locally.”
- “An MCP-native model council for Claude Code.”

### What you will actually ship as v1

A v1 that users can install and love (and star) should include:
- A Claude Code plugin with a single slash command: `/council:run`
- A local MCP server (`council-hub`) that:
  - Accepts a task + “policy” (single vs council)
  - Runs Codex CLI and Gemini CLI in parallel for the parts you route
  - Returns structured results and a simple “disagreement map”
- A default policy:
  - **single** for typical tasks
  - **council** for “verify / research / high-stakes” tasks (user can force it)

### Copy-paste Codex prompt to build it on your machine

Use this as a single prompt in Codex (Codex CLI or Codex inside your IDE). It’s written to generate a repo you can push to entity["company","GitHub","code hosting platform"].

```text
You are an expert OSS maintainer and toolsmith. Build a Claude Code plugin + bundled MCP server that orchestrates multiple model CLIs locally (no direct API calls from our code).

Goal:
- A Claude Code plugin named "councilkit" that adds a skill `/councilkit:run`.
- The plugin bundles an MCP stdio server "council-hub" that starts automatically when the plugin is enabled.
- The MCP server exposes one primary tool: `council_run`.
- `council_run` accepts:
  - task: string
  - mode: "single" | "council"
  - workers: optional list like ["codex", "gemini", "local"] (default: ["codex","gemini"])
  - output_format: "markdown" | "json" (default "json")
- council-hub runs Codex CLI and Gemini CLI in parallel (subprocess calls), captures outputs, and returns:
  - results: { worker_name, status, stdout, stderr, parsed_json_if_any }
  - synthesis_inputs: a short, structured bundle summarizing what each worker said
  - disagreements: list of strings describing where workers differ
  - recommended_next_checks: list of suggested verification steps

Constraints:
- Our code must NOT scrape tokens or imitate any vendor auth. We only call official CLIs already installed & authenticated by the user.
- Provide a settings file that lets the user configure paths/commands:
  - codex_command (default "codex")
  - gemini_command (default "gemini")
  - timeouts
- Must work on macOS/Linux and be reasonable on Windows (document WSL recommendation).
- Add a minimal local persistence layer: write each run to `~/.councilkit/runs/<timestamp>.json` (configurable).

Implementation choices:
- Use Node.js + TypeScript for the MCP server (simple cross-platform).
- Use a small MCP server framework or implement MCP stdio JSON-RPC directly.
- Provide robust subprocess handling, timeouts, and clear error messages when CLIs are missing.
- For Codex:
  - Call `codex exec --json --output-last-message` with a temp file OR capture stdout.
  - Optionally use `--output-schema` to ask Codex for a JSON result with fields: summary, key_points, risks, citations_needed.
- For Gemini:
  - Call `gemini -p "<task>" --output-format json` when available; otherwise fall back to plain text.
- Add tests for the orchestration logic with mocked subprocess runners.

Claude Code plugin packaging:
- Create `.claude-plugin/plugin.json` with name/description/version.
- Create `.mcp.json` at plugin root that starts council-hub:
  - command: "node"
  - args: ["${CLAUDE_PLUGIN_ROOT}/dist/server.js"]
- Create `skills/run/SKILL.md` that instructs Claude to call `council_run` and then synthesize a final user-facing answer:
  - show agreement points
  - show disagreements + what evidence would resolve them
  - give a final recommendation with confidence notes

Docs:
- Write an excellent README with:
  - What it does
  - Install instructions
  - How to enable plugin in Claude Code (dev mode with --plugin-dir)
  - How to install via marketplace later (leave placeholders)
  - Security model (no credential harvesting; local logs; prompt injection warning)
  - Examples for coding tasks and research tasks
- Add LICENSE (Apache-2.0).
- Add CONTRIBUTING.md and a basic GitHub Actions CI.

Deliverables:
- A complete repo that builds with `npm install && npm run build`.
- A `dist/` build output.
- A `bin/` script or npm `start` for running the MCP server manually.
- Clear instructions for testing inside Claude Code: `claude --plugin-dir ./councilkit`.

After building, output:
1) repo tree,
2) exact commands to run,
3) a short “release checklist” for publishing to GitHub.
```

If you follow that prompt, your first publishable milestone is “**Council Hub works locally** and Claude Code can call it as a tool.” After that, the fast path to stars is polish: great examples, crisp docs, and making failures friendly (missing CLI, not logged in, quotas hit, etc.).

