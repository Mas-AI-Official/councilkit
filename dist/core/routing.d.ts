import type { CouncilRunInput, CouncilKitSettings, RoutingScore, TaskProfile, WorkerRegistryEntry } from "../types/council.js";
export declare function classifyTask(task: string): TaskProfile;
export interface WorkerSelectionResult {
    selected_worker_ids: string[];
    task_profile: TaskProfile;
    routing_scores: RoutingScore[];
}
export declare function selectWorkersForTask(input: CouncilRunInput, workers: WorkerRegistryEntry[], settings: CouncilKitSettings): WorkerSelectionResult;
