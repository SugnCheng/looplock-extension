import "../ui/panel.css";

import { detectPrimaryMedia } from "./media-detector";
import { LoopController } from "./loop-controller";
import { FloatingPanel } from "../ui/floating-panel";
import {
  loadCollapsedState,
  saveCollapsedState,
  loadLooplockEnabled,
  saveLooplockEnabled,
  loadPanelVisible,
  savePanelVisible,
  loadThemeMode,
  saveThemeMode,
  loadPanelPosition,
  savePanelPosition
} from "../storage/storage";
import { logger } from "../shared/logger";
import type {
  PopupStatusResponse,
  ContentMessage,
  ThemeMode,
  ShortcutSettings
} from "../shared/types";
import { observeDomChanges } from "./dom-observer";
import { isYouTubePage, isYouTubeWatchPage } from "./site-adapters/youtube";
import { getPageStorageKey } from "./page-key";
import { REBIND_DEBOUNCE_MS } from "../shared/constants";
import { installNavigationWatcher } from "./navigation-watcher";
import {
  createRuntimeState,
  resetLoopRangeState,
  resetMediaState,
  shouldShowPanel,
  updateSiteType,
  createDefaultShortcutSettings
} from "./runtime-state";

type ShortcutAction =
  | "TOGGLE_MODE"
  | "SET_START"
  | "SET_END"
  | "TOGGLE_LOOP"
  | "CLEAR";

const runtime = createRuntimeState(getPageStorageKey());

const loopController = new LoopController(({ range, errorMessage, currentTime }) => {
  runtime.panelState.startTime = range.startTime;
  runtime.panelState.endTime = range.endTime;
  runtime.panelState.enabled = range.enabled;
  runtime.panelState.errorMessage = errorMessage;
  runtime.panelState.currentTime = currentTime;
  renderPanel();
});

const panel = new FloatingPanel(runtime.panelState, {
  getInitialPosition: () => runtime.panelPosition,
  onPositionChange: async (position) => {
    runtime.panelPosition = position;

    try {
      await savePanelPosition(position);
    } catch (error) {
      logger.warn("Failed to save panel position:", error);
    }
  },
  onSetStart: () => {
    if (!runtime.looplockEnabled) return;
    loopController.setStartFromCurrentTime();
    syncPanel();
  },
  onSetEnd: () => {
    if (!runtime.looplockEnabled) return;
    loopController.setEndFromCurrentTime();
    syncPanel();
  },
  onToggleLoop: () => {
    if (!runtime.looplockEnabled) return;
    loopController.toggleEnabled();
    syncPanel();
  },
  onClear: () => {
    if (!runtime.looplockEnabled) return;
    loopController.clear();
    syncPanel();
  },
  onToggleCollapse: async () => {
    const next = !runtime.panelState.collapsed;
    runtime.panelState.collapsed = next;

    try {
      await saveCollapsedState(next);
    } catch (error) {
      logger.warn("Failed to save collapsed state:", error);
    }

    renderPanel();
  },
  onClosePanel: async () => {
    try {
      await closeLooplockSession();
    } catch (error) {
      logger.warn("Failed to close LoopLock session:", error);
    }
  }
});

panel.mount();

function applyPanelVisibility(): void {
  const root = document.getElementById("looplock-root");
  if (root) {
    root.style.display = shouldShowPanel(
      runtime.looplockEnabled,
      runtime.floatingPanelVisible
    )
      ? "block"
      : "none";
  }
}

function renderPanel(): void {
  applyPanelVisibility();
  panel.setTheme(runtime.themeMode);

  if (shouldShowPanel(runtime.looplockEnabled, runtime.floatingPanelVisible)) {
    panel.update(runtime.panelState);
  }
}

function syncPanel(): void {
  const media = loopController.getMedia();
  const range = loopController.getRange();
  const errorMessage = loopController.getErrorMessage();
  const currentTime = loopController.getCurrentTime();

  runtime.panelState.mediaDetected = !!media;
  runtime.panelState.currentTime = currentTime;
  runtime.panelState.startTime = range.startTime;
  runtime.panelState.endTime = range.endTime;
  runtime.panelState.enabled = range.enabled;
  runtime.panelState.errorMessage = errorMessage;
  updateSiteType(runtime.panelState);

  renderPanel();
}

async function persistSessionState(): Promise<void> {
  await saveLooplockEnabled(runtime.looplockEnabled);
  await savePanelVisible(runtime.floatingPanelVisible);
}

async function openLooplockSession(): Promise<void> {
  runtime.looplockEnabled = true;
  runtime.floatingPanelVisible = true;

  await persistSessionState();
  renderPanel();
}

async function closeLooplockSession(): Promise<void> {
  loopController.clear();

  runtime.looplockEnabled = false;
  runtime.floatingPanelVisible = false;

  resetLoopRangeState(runtime.panelState);
  resetMediaState(runtime.panelState);

  await persistSessionState();
  renderPanel();
}

async function showFloatingPanel(): Promise<void> {
  if (!runtime.looplockEnabled) {
    return;
  }

  runtime.floatingPanelVisible = true;
  await savePanelVisible(true);
  renderPanel();
}

async function applyTheme(nextThemeMode: ThemeMode): Promise<void> {
  runtime.themeMode = nextThemeMode;
  await saveThemeMode(runtime.themeMode);
  renderPanel();
}

function sanitizeShortcutString(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const parts = raw
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";

  const modifiers = new Set<string>();
  let primaryKey = "";

  for (const part of parts) {
    const lower = part.toLowerCase();

    if (lower === "ctrl" || lower === "control") {
      modifiers.add("Ctrl");
      continue;
    }
    if (lower === "alt" || lower === "option") {
      modifiers.add("Alt");
      continue;
    }
    if (lower === "shift") {
      modifiers.add("Shift");
      continue;
    }
    if (
      lower === "meta" ||
      lower === "cmd" ||
      lower === "command" ||
      lower === "win"
    ) {
      modifiers.add("Meta");
      continue;
    }

    if (primaryKey) {
      return "";
    }

    if (/^[a-z]$/i.test(part)) {
      primaryKey = part.toUpperCase();
      continue;
    }

    if (/^[0-9]$/.test(part)) {
      primaryKey = part;
      continue;
    }

    if (/^f([1-9]|1[0-2])$/i.test(part)) {
      primaryKey = part.toUpperCase();
      continue;
    }

    switch (lower) {
      case "space":
      case "spacebar":
        primaryKey = "Space";
        break;
      case "enter":
      case "return":
        primaryKey = "Enter";
        break;
      case "escape":
      case "esc":
        primaryKey = "Escape";
        break;
      case "tab":
        primaryKey = "Tab";
        break;
      case "backspace":
        primaryKey = "Backspace";
        break;
      case "delete":
      case "del":
        primaryKey = "Delete";
        break;
      case "arrowup":
      case "up":
        primaryKey = "ArrowUp";
        break;
      case "arrowdown":
      case "down":
        primaryKey = "ArrowDown";
        break;
      case "arrowleft":
      case "left":
        primaryKey = "ArrowLeft";
        break;
      case "arrowright":
      case "right":
        primaryKey = "ArrowRight";
        break;
      default:
        return "";
    }
  }

  if (!primaryKey) return "";

  const ordered: string[] = [];
  if (modifiers.has("Ctrl")) ordered.push("Ctrl");
  if (modifiers.has("Alt")) ordered.push("Alt");
  if (modifiers.has("Shift")) ordered.push("Shift");
  if (modifiers.has("Meta")) ordered.push("Meta");
  ordered.push(primaryKey);

  return ordered.join("+");
}

function sanitizeShortcutSettings(settings: ShortcutSettings): ShortcutSettings {
  const defaults = createDefaultShortcutSettings();

  return {
    enabled: !!settings.enabled,
    toggleEnabledShortcut:
      sanitizeShortcutString(settings.toggleEnabledShortcut) || defaults.toggleEnabledShortcut,
    setStartShortcut:
      sanitizeShortcutString(settings.setStartShortcut) || defaults.setStartShortcut,
    setEndShortcut:
      sanitizeShortcutString(settings.setEndShortcut) || defaults.setEndShortcut,
    toggleLoopShortcut:
      sanitizeShortcutString(settings.toggleLoopShortcut) || defaults.toggleLoopShortcut,
    clearShortcut:
      sanitizeShortcutString(settings.clearShortcut) || defaults.clearShortcut
  };
}

function applyShortcutSettings(settings: ShortcutSettings): void {
  const nextSettings = sanitizeShortcutSettings(settings);
  const wasEnabled = runtime.shortcutSettings.enabled;

  runtime.shortcutSettings = nextSettings;

  if (!nextSettings.enabled) {
    runtime.shortcutModeActive = false;
    return;
  }

  if (!wasEnabled) {
    runtime.shortcutModeActive = true;
  }
}

async function bindMedia(retryCount = 0): Promise<void> {
  if (!isYouTubeWatchPage()) {
    loopController.attachMedia(null);
    runtime.lastBoundMedia = null;
    syncPanel();
    return;
  }

  const media = detectPrimaryMedia();

  if (!media) {
    loopController.attachMedia(null);
    runtime.lastBoundMedia = null;
    syncPanel();

    if (retryCount < 12) {
      window.setTimeout(() => {
        void bindMedia(retryCount + 1);
      }, 400);
    }

    return;
  }

  const mediaChanged =
    runtime.lastBoundMedia !== null && media !== runtime.lastBoundMedia;

  loopController.attachMedia(media);

  if (mediaChanged) {
    logger.info("Media element changed on current page.");
  }

  runtime.lastBoundMedia = media;
  syncPanel();
}

function serializeKeyboardEvent(event: KeyboardEvent): string {
  let primaryKey = "";

  if (event.code.startsWith("Key") && event.code.length === 4) {
    primaryKey = event.code.slice(3).toUpperCase();
  } else if (event.code.startsWith("Digit") && event.code.length === 6) {
    primaryKey = event.code.slice(5);
  } else if (/^F([1-9]|1[0-2])$/.test(event.code)) {
    primaryKey = event.code.toUpperCase();
  } else {
    switch (event.key) {
      case " ":
        primaryKey = "Space";
        break;
      case "Enter":
      case "Escape":
      case "Tab":
      case "Backspace":
      case "Delete":
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
        primaryKey = event.key;
        break;
      default:
        if (event.key.length === 1 && /^[a-z0-9]$/i.test(event.key)) {
          primaryKey = /^[a-z]$/i.test(event.key) ? event.key.toUpperCase() : event.key;
        }
    }
  }

  if (!primaryKey) return "";

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  parts.push(primaryKey);

  return parts.join("+");
}

function getShortcutAction(shortcut: string): ShortcutAction | null {
  if (!shortcut) return null;

  if (shortcut === runtime.shortcutSettings.toggleEnabledShortcut) return "TOGGLE_MODE";
  if (shortcut === runtime.shortcutSettings.setStartShortcut) return "SET_START";
  if (shortcut === runtime.shortcutSettings.setEndShortcut) return "SET_END";
  if (shortcut === runtime.shortcutSettings.toggleLoopShortcut) return "TOGGLE_LOOP";
  if (shortcut === runtime.shortcutSettings.clearShortcut) return "CLEAR";

  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function handleShortcutAction(action: ShortcutAction): void {
  switch (action) {
    case "TOGGLE_MODE":
      runtime.shortcutModeActive = !runtime.shortcutModeActive;
      return;
    case "SET_START":
      loopController.setStartFromCurrentTime();
      syncPanel();
      return;
    case "SET_END":
      loopController.setEndFromCurrentTime();
      syncPanel();
      return;
    case "TOGGLE_LOOP":
      loopController.toggleEnabled();
      syncPanel();
      return;
    case "CLEAR":
      loopController.clear();
      syncPanel();
      return;
  }
}

function installShortcutHandler(): void {
  window.addEventListener(
    "keydown",
    (event) => {
      if (!isYouTubePage()) return;
      if (!runtime.looplockEnabled) return;
      if (!runtime.shortcutSettings.enabled) return;
      if (isEditableTarget(event.target)) return;

      const shortcut = serializeKeyboardEvent(event);
      const action = getShortcutAction(shortcut);

      if (!action) return;
      if (action !== "TOGGLE_MODE" && !runtime.shortcutModeActive) return;

      event.preventDefault();
      event.stopPropagation();

      handleShortcutAction(action);
    },
    true
  );
}

function buildStatusResponse(): PopupStatusResponse {
  return {
    supported: isYouTubePage(),
    siteType: isYouTubePage() ? "youtube" : "generic",
    looplockEnabled: runtime.looplockEnabled,
    panelVisible: runtime.floatingPanelVisible,
    mediaDetected: runtime.panelState.mediaDetected,
    themeMode: runtime.themeMode,
    shortcutSettingsEnabled: runtime.shortcutSettings.enabled,
    shortcutModeActive: runtime.shortcutModeActive,
    shortcutSettings: runtime.shortcutSettings
  };
}

function installMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
    void (async () => {
      switch (message.type) {
        case "GET_STATUS":
          sendResponse(buildStatusResponse());
          return;

        case "OPEN_LOOPLOCK":
          await openLooplockSession();
          sendResponse(buildStatusResponse());
          return;

        case "SHOW_PANEL":
          await showFloatingPanel();
          sendResponse(buildStatusResponse());
          return;

        case "SET_THEME":
          await applyTheme(message.themeMode);
          sendResponse(buildStatusResponse());
          return;

        case "SYNC_SHORTCUT_SETTINGS":
          applyShortcutSettings(message.settings);
          sendResponse(buildStatusResponse());
          return;

        default:
          sendResponse(buildStatusResponse());
      }
    })();

    return true;
  });
}

async function initialize(): Promise<void> {
  try {
    runtime.panelState.collapsed = await loadCollapsedState();
    runtime.looplockEnabled = await loadLooplockEnabled();
    runtime.floatingPanelVisible = await loadPanelVisible();
    runtime.themeMode = await loadThemeMode();
    runtime.panelPosition = await loadPanelPosition();

    if (!runtime.looplockEnabled) {
      runtime.floatingPanelVisible = false;
    }

    updateSiteType(runtime.panelState);
    renderPanel();
    await bindMedia();
  } catch (error) {
    logger.warn("Initialize failed:", error);
  }
}

void initialize();
installMessageHandler();
installShortcutHandler();

let rebindTimeout: number | null = null;

function scheduleBind(reason: string): void {
  if (rebindTimeout !== null) {
    window.clearTimeout(rebindTimeout);
  }

  rebindTimeout = window.setTimeout(() => {
    logger.info("Binding media:", reason, {
      url: location.href,
      pageKey: getPageStorageKey()
    });
    void bindMedia();
  }, REBIND_DEBOUNCE_MS);
}

function handleRouteChange(reason: string): void {
  const nextUrl = location.href;
  const nextPageKey = getPageStorageKey();

  const urlChanged = nextUrl !== runtime.lastKnownUrl;
  const pageKeyChanged = nextPageKey !== runtime.currentPageKey;

  if (!urlChanged && !pageKeyChanged) {
    return;
  }

  resetLoopStateForNewPage(nextPageKey, nextUrl);
  scheduleBind(reason);
}

function resetLoopStateForNewPage(nextPageKey: string, nextUrl: string): void {
  logger.info("Resetting loop state for new page.", {
    fromPageKey: runtime.currentPageKey,
    toPageKey: nextPageKey,
    fromUrl: runtime.lastKnownUrl,
    toUrl: nextUrl
  });

  loopController.clear();
  loopController.attachMedia(null);

  resetLoopRangeState(runtime.panelState);
  resetMediaState(runtime.panelState);

  runtime.currentPageKey = nextPageKey;
  runtime.lastKnownUrl = nextUrl;
  runtime.lastBoundMedia = null;

  updateSiteType(runtime.panelState);
  renderPanel();
}

installNavigationWatcher(() => {
  handleRouteChange("navigation watcher");
});

observeDomChanges(() => {
  scheduleBind("dom mutation");
});

window.addEventListener("pageshow", () => {
  handleRouteChange("pageshow");
});

window.addEventListener("hashchange", () => {
  handleRouteChange("hashchange");
});

setInterval(() => {
  const nextUrl = location.href;
  const nextPageKey = getPageStorageKey();

  if (nextUrl !== runtime.lastKnownUrl || nextPageKey !== runtime.currentPageKey) {
    handleRouteChange("url polling");
  }
}, 800);