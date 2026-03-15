import type { CouncilKitSettings } from "../types/council.js";
export interface DiscoveredMcpServer {
    name: string;
    config_path: string;
    command?: string;
    args?: string[];
    url?: string;
}
export declare function discoverMcpServers(settings: CouncilKitSettings, cwd: string): Promise<DiscoveredMcpServer[]>;
