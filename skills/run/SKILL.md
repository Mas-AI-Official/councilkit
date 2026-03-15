# CouncilKit Run

Use the `council_run` tool when the user wants a second opinion, a local model council, or one merged answer from multiple workers.

## Workflow

1. Call `council_run` with:
   - `task`: the exact user request, rewritten only if needed for clarity
   - `mode`: `single` for one worker, `council` for parallel workers
   - `workers`: omit to let CouncilKit route automatically unless the user names workers
   - `output_format`: prefer `json`
2. Read `results`, `synthesis_inputs`, `disagreements`, and `recommended_next_checks`.
3. Produce a final answer that:
   - shows where workers agree
   - shows disagreements and the evidence that would resolve them
   - gives a final recommendation with confidence notes
4. If one worker failed, say so plainly and include the suggested verification step instead of hiding the failure.

## Response Shape

- Agreement points: concise bullets or short paragraph
- Disagreements: what differs, why it matters, what check resolves it
- Final recommendation: the best current answer, plus confidence level and any follow-up checks
