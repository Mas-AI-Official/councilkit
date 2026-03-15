import fs from "node:fs/promises";
import path from "node:path";

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted;
}

function equivalent(left, right) {
  return JSON.stringify(sortKeys(left)) === JSON.stringify(sortKeys(right));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeMcpDocument(input) {
  const document = isPlainObject(input) ? clone(input) : {};

  const mcpServers = isPlainObject(document.mcpServers)
    ? clone(document.mcpServers)
    : isPlainObject(document.mcp_servers)
      ? clone(document.mcp_servers)
      : {};

  document.mcpServers = mcpServers;
  return document;
}

export function buildBackupPath(filePath, now = new Date()) {
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  return `${filePath}.bak.${timestamp}`;
}

export function mergeMcpServerEntry(document, serverName, serverEntry) {
  const normalized = normalizeMcpDocument(document);
  const existing = normalized.mcpServers?.[serverName];

  if (existing && equivalent(existing, serverEntry)) {
    return {
      changed: false,
      merged: normalized,
      existed: true,
      duplicated: true
    };
  }

  normalized.mcpServers[serverName] = clone(serverEntry);
  return {
    changed: true,
    merged: normalized,
    existed: Boolean(existing),
    duplicated: false
  };
}

export function removeMcpServerEntry(document, serverName) {
  const normalized = normalizeMcpDocument(document);
  if (!normalized.mcpServers?.[serverName]) {
    return {
      changed: false,
      merged: normalized
    };
  }

  delete normalized.mcpServers[serverName];
  return {
    changed: true,
    merged: normalized
  };
}

async function readJsonOrEmpty(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      throw new Error(`MCP config must contain a JSON object: ${filePath}`);
    }
    return {
      exists: true,
      value: parsed
    };
  } catch (error) {
    const nodeError = error;
    if (nodeError?.code === "ENOENT") {
      return {
        exists: false,
        value: {}
      };
    }

    throw error;
  }
}

async function writeJson(filePath, document) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

export async function upsertMcpServerConfig({
  filePath,
  serverName,
  serverEntry,
  dryRun = false,
  now = new Date()
}) {
  const { exists, value } = await readJsonOrEmpty(filePath);
  const mergeResult = mergeMcpServerEntry(value, serverName, serverEntry);

  if (!mergeResult.changed) {
    return {
      filePath,
      changed: false,
      wrote: false,
      dryRun,
      backupPath: undefined
    };
  }

  const backupPath = exists ? buildBackupPath(filePath, now) : undefined;
  if (dryRun) {
    return {
      filePath,
      changed: true,
      wrote: false,
      dryRun: true,
      backupPath
    };
  }

  if (exists && backupPath) {
    await fs.copyFile(filePath, backupPath);
  }

  await writeJson(filePath, mergeResult.merged);
  return {
    filePath,
    changed: true,
    wrote: true,
    dryRun: false,
    backupPath
  };
}

export async function removeMcpServerConfig({
  filePath,
  serverName,
  dryRun = false,
  now = new Date()
}) {
  const { exists, value } = await readJsonOrEmpty(filePath);
  if (!exists) {
    return {
      filePath,
      changed: false,
      wrote: false,
      dryRun,
      backupPath: undefined
    };
  }

  const removeResult = removeMcpServerEntry(value, serverName);
  if (!removeResult.changed) {
    return {
      filePath,
      changed: false,
      wrote: false,
      dryRun,
      backupPath: undefined
    };
  }

  const backupPath = buildBackupPath(filePath, now);
  if (dryRun) {
    return {
      filePath,
      changed: true,
      wrote: false,
      dryRun: true,
      backupPath
    };
  }

  await fs.copyFile(filePath, backupPath);
  await writeJson(filePath, removeResult.merged);
  return {
    filePath,
    changed: true,
    wrote: true,
    dryRun: false,
    backupPath
  };
}
