export const logger = {
  info: (...args: unknown[]) => console.log("[LoopLock]", ...args),
  warn: (...args: unknown[]) => console.warn("[LoopLock]", ...args),
  error: (...args: unknown[]) => console.error("[LoopLock]", ...args)
};