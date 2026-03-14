import fs from "node:fs/promises";
import path from "node:path";
import { normalizePath } from "./path-utils.js";
const DEFAULT_SETTINGS = {
    codex_command: "codex",
    gemini_command: "gemini",
    local_command: null,
    default_workers: ["codex", "gemini"],
    timeouts: {
        codex_ms: 300_000,
        gemini_ms: 300_000,
        local_ms: 180_000
    },
    codex: {
        use_output_schema: true
    },
    custom_workers: {},
    persistence: {
        enabled: true,
        directory: "~/.councilkit/runs"
    }
};
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function mergeSettings(base, override) {
    if (!isPlainObject(base) || !isPlainObject(override)) {
        return (override ?? base);
    }
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
        const current = merged[key];
        if (Array.isArray(value)) {
            merged[key] = [...value];
            continue;
        }
        if (isPlainObject(current) && isPlainObject(value)) {
            merged[key] = mergeSettings(current, value);
            continue;
        }
        if (value !== undefined) {
            merged[key] = value;
        }
    }
    return merged;
}
async function readJsonConfig(configPath) {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
        throw new Error(`Config file must contain an object: ${configPath}`);
    }
    return parsed;
}
export async function loadSettings(cwd = process.cwd()) {
    const candidatePaths = [
        process.env.COUNCILKIT_CONFIG,
        path.join(cwd, "councilkit.settings.json"),
        normalizePath("~/.councilkit/config.json")
    ].filter((value) => Boolean(value));
    for (const candidate of candidatePaths) {
        try {
            const config = await readJsonConfig(candidate);
            return {
                settings: mergeSettings(DEFAULT_SETTINGS, config),
                configPath: candidate
            };
        }
        catch (error) {
            const nodeError = error;
            if (nodeError.code === "ENOENT") {
                continue;
            }
            throw error;
        }
    }
    return {
        settings: DEFAULT_SETTINGS
    };
}
//# sourceMappingURL=config.js.map