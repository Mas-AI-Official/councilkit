import type { CouncilRunOutput, WorkerResult, WorkerSynthesisInput } from "../types/council.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function summarizeText(value: string): string {
  const collapsed = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");

  if (!collapsed) {
    return "No output captured.";
  }

  return collapsed.length > 240 ? `${collapsed.slice(0, 237)}...` : collapsed;
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function wordSet(value: string): Set<string> {
  return new Set(
    normalizeForComparison(value)
      .split(/\s+/)
      .filter((word) => word.length > 2)
  );
}

function similarity(left: string, right: string): number {
  const leftWords = wordSet(left);
  const rightWords = wordSet(right);
  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const word of leftWords) {
    if (rightWords.has(word)) {
      intersection += 1;
    }
  }

  return intersection / Math.max(leftWords.size, rightWords.size);
}

function extractStructuredSummary(result: WorkerResult): WorkerSynthesisInput {
  const parsed = result.parsed_json_if_any;
  if (isRecord(parsed)) {
    const summary = typeof parsed.summary === "string" ? parsed.summary : summarizeText(result.stdout);
    const keyPoints = unique([
      ...toStringArray(parsed.key_points),
      ...toStringArray(parsed.keyPoints)
    ]);
    const risks = unique(toStringArray(parsed.risks));
    const citationsNeeded = unique([
      ...toStringArray(parsed.citations_needed),
      ...toStringArray(parsed.citationsNeeded)
    ]);

    return {
      worker_name: result.worker_name,
      status: result.status,
      summary,
      key_points: keyPoints,
      risks,
      citations_needed: citationsNeeded
    };
  }

  return {
    worker_name: result.worker_name,
    status: result.status,
    summary: summarizeText(result.stdout || result.stderr),
    key_points: [],
    risks: [],
    citations_needed: []
  };
}

export function buildSynthesisInputs(results: WorkerResult[]): WorkerSynthesisInput[] {
  return results.map(extractStructuredSummary);
}

export function detectDisagreements(
  synthesisInputs: WorkerSynthesisInput[],
  results: WorkerResult[]
): string[] {
  const disagreements = new Set<string>();
  const successful = synthesisInputs.filter((input) => input.status === "success");

  if (successful.length <= 1) {
    return [];
  }

  for (let index = 0; index < successful.length; index += 1) {
    for (let inner = index + 1; inner < successful.length; inner += 1) {
      const left = successful[index];
      const right = successful[inner];

      if (similarity(left.summary, right.summary) < 0.35) {
        disagreements.add(
          `${left.worker_name} and ${right.worker_name} produced materially different summaries or priorities.`
        );
      }

      const leftOnlyRisks = left.risks.filter((risk) => !right.risks.includes(risk));
      const rightOnlyRisks = right.risks.filter((risk) => !left.risks.includes(risk));

      if (leftOnlyRisks.length > 0) {
        disagreements.add(`${left.worker_name} flagged risks not mentioned by ${right.worker_name}.`);
      }

      if (rightOnlyRisks.length > 0) {
        disagreements.add(`${right.worker_name} flagged risks not mentioned by ${left.worker_name}.`);
      }
    }
  }

  for (const result of results) {
    if (result.status !== "success") {
      disagreements.add(`${result.worker_name} did not complete successfully (${result.status}).`);
    }
  }

  return [...disagreements];
}

export function recommendNextChecks(
  synthesisInputs: WorkerSynthesisInput[],
  results: WorkerResult[]
): string[] {
  const nextChecks = new Set<string>();

  for (const result of results) {
    if (result.status === "timeout") {
      nextChecks.add(`Re-run ${result.worker_name} with a higher timeout or a narrower task.`);
    }

    if (result.status === "error") {
      nextChecks.add(
        `Verify ${result.worker_name} is installed on PATH and authenticated in the official CLI.`
      );
    }
  }

  for (const input of synthesisInputs) {
    for (const risk of input.risks.slice(0, 2)) {
      nextChecks.add(`Validate risk raised by ${input.worker_name}: ${risk}`);
    }

    for (const citation of input.citations_needed.slice(0, 2)) {
      nextChecks.add(`Gather evidence for ${input.worker_name}: ${citation}`);
    }
  }

  if (nextChecks.size === 0) {
    nextChecks.add("Run targeted tests or source verification on the final recommendation.");
  }

  return [...nextChecks];
}

export function formatCouncilRunMarkdown(result: CouncilRunOutput): string {
  const lines: string[] = [
    `# CouncilKit Run`,
    ``,
    `- Task: ${result.task}`,
    `- Mode: ${result.mode}`,
    `- Workers: ${result.metadata.selected_workers.join(", ")}`,
    `- Persisted: ${result.metadata.persisted_to ?? "disabled"}`,
    ``,
    `## Worker Results`
  ];

  for (const worker of result.results) {
    lines.push(
      `### ${worker.worker_name}`,
      `- Status: ${worker.status}`,
      `- Command: \`${worker.command}\``,
      worker.stderr.trim() ? `- stderr: ${worker.stderr.trim()}` : `- stderr: none`,
      `- stdout:`,
      "```text",
      (worker.stdout || "(empty)").trim(),
      "```"
    );
  }

  lines.push("", "## Agreement Signals");
  const agreementCandidates = result.synthesis_inputs
    .map((input) => input.summary)
    .filter((summary) => summary && summary !== "No output captured.");

  if (agreementCandidates.length > 0) {
    for (const input of result.synthesis_inputs) {
      lines.push(`- ${input.worker_name}: ${input.summary}`);
    }
  } else {
    lines.push("- No successful worker summaries were available.");
  }

  lines.push("", "## Disagreements");
  if (result.disagreements.length === 0) {
    lines.push("- None detected.");
  } else {
    for (const disagreement of result.disagreements) {
      lines.push(`- ${disagreement}`);
    }
  }

  lines.push("", "## Recommended Next Checks");
  for (const check of result.recommended_next_checks) {
    lines.push(`- ${check}`);
  }

  return `${lines.join("\n")}\n`;
}
