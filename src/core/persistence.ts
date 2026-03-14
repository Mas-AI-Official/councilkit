import fs from "node:fs/promises";
import path from "node:path";

import type { CouncilKitSettings, CouncilRunOutput } from "../types/council.js";
import { normalizePath } from "./path-utils.js";

function buildTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function persistRun(
  result: CouncilRunOutput,
  settings: CouncilKitSettings
): Promise<string | undefined> {
  if (!settings.persistence.enabled) {
    return undefined;
  }

  const directory = normalizePath(settings.persistence.directory);
  await fs.mkdir(directory, { recursive: true });

  const outputPath = path.join(directory, `${buildTimestamp()}.json`);
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return outputPath;
}
