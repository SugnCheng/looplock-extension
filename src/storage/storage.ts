import { UI_COLLAPSE_STORAGE_KEY } from "../shared/constants";
import { logger } from "../shared/logger";

function isExtensionContextInvalidatedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Extension context invalidated");
}

export async function saveCollapsedState(collapsed: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({
      [UI_COLLAPSE_STORAGE_KEY]: collapsed
    });
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      logger.warn("Skipped saveCollapsedState because extension context was invalidated.");
      return;
    }
    throw error;
  }
}

export async function loadCollapsedState(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(UI_COLLAPSE_STORAGE_KEY);
    return Boolean(result[UI_COLLAPSE_STORAGE_KEY]);
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      logger.warn("Skipped loadCollapsedState because extension context was invalidated.");
      return false;
    }
    throw error;
  }
}