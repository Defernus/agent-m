export const logInfo = (...msg: unknown[]) => console.log("[LOG]", ...msg);
export const logDebug = (...msg: unknown[]) => console.debug("[DEBUG]", ...msg);
export const logWarn = (...msg: unknown[]) => console.warn("[WARN]", ...msg);
export const logError = (...msg: unknown[]) => console.error("[ERROR]", ...msg);
