# Routing

CouncilKit routing is heuristic-based and intentionally simple.

## Goals

- pick 1-3 relevant workers by task fit
- prefer local workers for sensitive tasks when configured
- prefer subscription/free workers before API-only workers
- preserve fallback behavior when preferred workers are unavailable

## Task Classification

Current classifier tags tasks into rough categories:

- `coding`
- `research`
- `analysis`
- `planning`
- `local` (for privacy/sensitive prompts)
- `general` (always present)

## Worker Scoring

Each worker score uses:

- role tag matches
- privacy preference for sensitive tasks
- cost preference (`free` / `subscription` before `api`)
- fallback priority boost
- worker priority baseline
- health and enabled status

## Single vs Council

- `single`: highest-scoring worker only.
- `council`: top workers up to `routing.max_workers_per_task`.

If `workers` is provided in the request, routing respects that explicit list.

## Config Example

```json
{
  "routing": {
    "default_mode": "council",
    "fallback_priority": ["codex", "gemini", "ollama"],
    "allow_single_worker": true,
    "max_workers_per_task": 3,
    "prefer_local_for_sensitive_tasks": true,
    "prefer_subscription_before_api": true
  }
}
```

## Output Metadata

`council_run` metadata includes:

- `selected_workers`
- `task_profile`
- `routing_scores`

Use this data for debugging and policy tuning.
