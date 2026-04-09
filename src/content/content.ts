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
  PanelPosition
} from "../shared/types";
import { observeDomChanges } from "./dom-observer";
import { isYouTubePage } from "./site-adapters/youtube";
import { getPageStorageKey } from "./page-key";
import { REBIND_DEBOUNCE_MS } from "../shared/constants";
import { installNavigationWatcher } from "./navigation-watcher";
import {
  createRuntimeState,
  resetLoopRangeState,
  resetMediaState,
  shouldShowPanel,
  updateSiteType
} from "./runtime-state";

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

async function bindMedia(retryCount = 0): Promise<void> {
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

function buildStatusResponse(): PopupStatusResponse {
  return {
    supported: isYouTubePage(),
    siteType: isYouTubePage() ? "youtube" : "generic",
    looplockEnabled: runtime.looplockEnabled,
    panelVisible: runtime.floatingPanelVisible,
    mediaDetected: runtime.panelState.mediaDetected,
    themeMode: runtime.themeMode
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