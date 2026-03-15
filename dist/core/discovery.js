import fs from "node:fs/promises";
import path from "node:path";
import { normalizePath } from "./path-utils.js";
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseServerEntries(configPath, rawContent) {
    const parsed = JSON.parse(rawContent);
    if (!isObject(parsed)) {
        return [];
    }
    const mcpServers = (parsed.mcpServers ?? parsed.mcp_servers);
    if (!isObject(mcpServers)) {
        return [];
    }
    const discovered = [];
    for (const [name, server] of Object.entries(mcpServers)) {
        if (!isObject(server)) {
            continue;
        }
        const command = typeof server.command === "string" ? server.command : undefined;
        const args = Array.isArray(server.args)
            ? server.args.filter((value) => typeof value === "string")
            : undefined;
        const url = typeof server.url === "string" ? server.url : undefined;
        discovered.push({
            name,
            config_path: configPath,
            command,
            args,
            url
        });
    }
    return discovered;
}
function resolveMcpConfigPaths(settings, cwd) {
    const configuredPaths = settings.discovery?.mcp_config_paths ?? [];
    const defaults = [path.join(cwd, ".mcp.json")];
    const combined = [...configuredPaths, ...defaults];
    return [...new Set(combined)].map((candidate) => {
        if (path.isAbsolute(candidate)) {
            return normalizePath(candidate);
        }
        return normalizePath(path.join(cwd, candidate));
    });
}
export async function discoverMcpServers(settings, cwd) {
    const discoveryEnabled = settings.discovery?.enabled ?? true;
    if (!discoveryEnabled) {
        return [];
    }
    const paths = resolveMcpConfigPaths(settings, cwd);
    const discovered = [];
    for (const configPath of paths) {
        try {
            const raw = await fs.readFile(configPath, "utf8");
            discovered.push(...parseServerEntries(configPath, raw));
        }
        catch (error) {
            const nodeError = error;
            if (nodeError.code === "ENOENT") {
                continue;
            }
            throw error;
        }
    }
    return discovered;
}
//# sourceMappingURL=discovery.js.map