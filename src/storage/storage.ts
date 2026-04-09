import {
  UI_COLLAPSE_STORAGE_KEY,
  UI_PANEL_POSITION_STORAGE_KEY,
  LOOPLOCK_ENABLED_KEY,
  FLOATING_PANEL_VISIBLE_KEY,
  LOOPLOCK_THEME_KEY
} from "../shared/constants";
import { logger } from "../shared/logger";
import type { ThemeMode, PanelPosition } from "../shared/types";

function isExtensionContextInvalidatedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Extension context invalidated");
}

async function safeSet(values: Record<string, unknown>): Promise<void> {
  try {
    await chrome.storage.local.set(values);
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      logger.warn("Skipped storage.set because extension context was invalidated.");
      return;
    }
    throw error;
  }
}

async function safeGet<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] as T | undefined;
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      logger.warn("Skipped storage.get because extension context was invalidated.");
      return undefined;
    }
    throw error;
  }
}

export async function saveCollapsedState(collapsed: boolean): Promise<void> {
  await safeSet({
    [UI_COLLAPSE_STORAGE_KEY]: collapsed
  });
}

export async function loadCollapsedState(): Promise<boolean> {
  const value = await safeGet<boolean>(UI_COLLAPSE_STORAGE_KEY);
  return Boolean(value);
}

export async function savePanelPosition(position: PanelPosition): Promise<void> {
  await safeSet({
    [UI_PANEL_POSITION_STORAGE_KEY]: position
  });
}

export async function loadPanelPosition(): Promise<PanelPosition | null> {
  const value = await safeGet<PanelPosition>(UI_PANEL_POSITION_STORAGE_KEY);

  if (
    value &&
    typeof value.left === "number" &&
    Number.isFinite(value.left) &&
    typeof value.top === "number" &&
    Number.isFinite(value.top)
  ) {
    return value;
  }

  return null;
}

export async function saveLooplockEnabled(enabled: boolean): Promise<void> {
  await safeSet({
    [LOOPLOCK_ENABLED_KEY]: enabled
  });
}

export async function loadLooplockEnabled(): Promise<boolean> {
  const value = await safeGet<boolean>(LOOPLOCK_ENABLED_KEY);
  return Boolean(value);
}

export async function savePanelVisible(visible: boolean): Promise<void> {
  await safeSet({
    [FLOATING_PANEL_VISIBLE_KEY]: visible
  });
}

export async function loadPanelVisible(): Promise<boolean> {
  const value = await safeGet<boolean>(FLOATING_PANEL_VISIBLE_KEY);
  return Boolean(value);
}

export async function saveThemeMode(themeMode: ThemeMode): Promise<void> {
  await safeSet({
    [LOOPLOCK_THEME_KEY]: themeMode
  });
}

export async function loadThemeMode(): Promise<ThemeMode> {
  const value = await safeGet<ThemeMode>(LOOPLOCK_THEME_KEY);
  if (value === "dark" || value === "light") {
    return value;
  }
  return "dark";
}