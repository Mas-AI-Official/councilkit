import os from "node:os";
import path from "node:path";
export function expandHome(inputPath) {
    if (inputPath === "~") {
        return os.homedir();
    }
    if (inputPath.startsWith("~/") || inputPath.startsWith("~\\")) {
        return path.join(os.homedir(), inputPath.slice(2));
    }
    return inputPath;
}
export function normalizePath(inputPath) {
    return path.resolve(expandHome(inputPath));
}
//# sourceMappingURL=path-utils.js.map