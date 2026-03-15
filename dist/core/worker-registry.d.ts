import type { CouncilKitSettings, WorkerRegistryEntry } from "../types/council.js";
import type { DiscoveredMcpServer } from "./discovery.js";
export interface WorkerRegistryBuildResult {
    entries: WorkerRegistryEntry[];
    discovered_servers: DiscoveredMcpServer[];
}
export declare function buildWorkerRegistry(settings: CouncilKitSettings, cwd: string): Promise<WorkerRegistryBuildResult>;
