export function parseJsonFromText(text: string): unknown | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }

  const direct = tryParse(trimmed);
  if (direct !== undefined) {
    return direct;
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const fenced = tryParse(fencedMatch[1].trim());
    if (fenced !== undefined) {
      return fenced;
    }
  }

  let lastParsed: unknown;
  for (const line of trimmed.split(/\r?\n/)) {
    const parsed = tryParse(line.trim());
    if (parsed !== undefined) {
      lastParsed = parsed;
    }
  }

  return lastParsed;
}

function tryParse(candidate: string): unknown | undefined {
  if (!candidate) {
    return undefined;
  }

  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return undefined;
  }
}
