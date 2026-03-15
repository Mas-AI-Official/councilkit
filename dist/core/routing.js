const CODING_KEYWORDS = [
    "code",
    "refactor",
    "bug",
    "fix",
    "test",
    "compile",
    "typescript",
    "javascript",
    "python",
    "api",
    "function"
];
const RESEARCH_KEYWORDS = [
    "research",
    "compare",
    "analysis",
    "evaluate",
    "sources",
    "evidence",
    "benchmark"
];
const PLANNING_KEYWORDS = ["plan", "roadmap", "strategy", "milestone", "rollout"];
const PRIVACY_KEYWORDS = ["private", "confidential", "sensitive", "pii", "secret", "local-only"];
function containsAny(text, keywords) {
    return keywords.some((keyword) => text.includes(keyword));
}
export function classifyTask(task) {
    const normalized = task.toLowerCase();
    const categories = new Set(["general"]);
    if (containsAny(normalized, CODING_KEYWORDS)) {
        categories.add("coding");
        categories.add("review");
    }
    if (containsAny(normalized, RESEARCH_KEYWORDS)) {
        categories.add("research");
        categories.add("analysis");
    }
    if (containsAny(normalized, PLANNING_KEYWORDS)) {
        categories.add("planning");
    }
    const sensitive = containsAny(normalized, PRIVACY_KEYWORDS);
    if (sensitive) {
        categories.add("local");
    }
    return {
        categories: [...categories],
        sensitive
    };
}
function scoreWorker(worker, profile, settings) {
    if (!worker.enabled) {
        return -10_000;
    }
    if (worker.health_status === "unavailable") {
        return -9_000;
    }
    let score = 0;
    for (const category of profile.categories) {
        if (worker.role_tags.includes(category)) {
            score += 8;
        }
    }
    if (worker.role_tags.includes("general")) {
        score += 1;
    }
    const routing = settings.routing;
    if (profile.sensitive && (routing?.prefer_local_for_sensitive_tasks ?? true)) {
        if (worker.privacy_mode === "local") {
            score += 10;
        }
        else if (worker.privacy_mode === "mixed") {
            score += 2;
        }
        else {
            score -= 6;
        }
    }
    if (routing?.prefer_subscription_before_api ?? true) {
        if (worker.cost_hint === "free") {
            score += 5;
        }
        else if (worker.cost_hint === "subscription") {
            score += 4;
        }
        else if (worker.cost_hint === "api") {
            score -= 4;
        }
    }
    const fallbackPriority = routing?.fallback_priority ?? [];
    const priorityIndex = fallbackPriority.indexOf(worker.id);
    if (priorityIndex >= 0) {
        score += Math.max(1, 5 - priorityIndex);
    }
    score += Math.max(0, 5 - worker.priority / 50);
    return score;
}
function ensureSelection(selected, pool, maxWorkers) {
    if (selected.length > 0) {
        return selected.slice(0, maxWorkers);
    }
    const enabledPool = pool.filter((worker) => worker.enabled);
    return enabledPool.slice(0, maxWorkers);
}
export function selectWorkersForTask(input, workers, settings) {
    const profile = classifyTask(input.task);
    if (input.workers && input.workers.length > 0) {
        const selected = input.workers.filter((value) => value.trim().length > 0);
        return {
            selected_worker_ids: input.mode === "single" ? selected.slice(0, 1) : selected,
            task_profile: profile,
            routing_scores: []
        };
    }
    const mode = input.mode ?? settings.routing?.default_mode ?? "council";
    const maxWorkers = mode === "single" ? 1 : Math.max(1, settings.routing?.max_workers_per_task ?? 3);
    const scored = workers.map((worker) => ({
        worker,
        score: scoreWorker(worker, profile, settings)
    }));
    scored.sort((left, right) => right.score - left.score);
    const selectedByScore = scored.map((item) => item.worker).filter((worker) => worker.enabled);
    const selected = ensureSelection(selectedByScore, workers, maxWorkers).slice(0, maxWorkers);
    return {
        selected_worker_ids: selected.map((worker) => worker.id),
        task_profile: profile,
        routing_scores: scored.map((item) => ({
            worker_id: item.worker.id,
            score: Number(item.score.toFixed(2))
        }))
    };
}
//# sourceMappingURL=routing.js.map