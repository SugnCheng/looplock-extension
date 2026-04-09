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
  saveThemeMode
} from "../storage/storage";
import { logger } from "../shared/logger";
import type {
  PanelState,
  PopupStatusResponse,
  ContentMessage,
  ThemeMode
} from "../shared/types";
import { observeDomChanges } from "./dom-observer";
import { isYouTubePage } from "./site-adapters/youtube";
import { getPageStorageKey } from "./page-key";
import { REBIND_DEBOUNCE_MS } from "../shared/constants";
import { installNavigationWatcher } from "./navigation-watcher";

let currentPageKey = getPageStorageKey();
let lastKnownUrl = location.href;
let lastBoundMedia: HTMLMediaElement | null = null;

let looplockEnabled = false;
let floatingPanelVisible = false;
let themeMode: ThemeMode = "dark";

const initialState: PanelState = {
  startTime: null,
  endTime: null,
  enabled: false,
  mediaDetected: false,
  currentTime: 0,
  siteType: isYouTubePage() ? "youtube" : "generic",
  collapsed: false,
  errorMessage: null
};

const panelState: PanelState = { ...initialState };

function updateSiteType(): void {
  panelState.siteType = isYouTubePage() ? "youtube" : "generic";
}

function resetLoopRangeState(): void {
  panelState.startTime = null;
  panelState.endTime = null;
  panelState.enabled = false;
  panelState.errorMessage = null;
}

function resetMediaState(): void {
  panelState.currentTime = 0;
  panelState.mediaDetected = false;
}

async function persistSessionState(): Promise<void> {
  await saveLooplockEnabled(looplockEnabled);
  await savePanelVisible(floatingPanelVisible);
}

function shouldShowPanel(): boolean {
  return looplockEnabled && floatingPanelVisible;
}

function applyPanelVisibility(): void {
  const root = document.getElementById("looplock-root");
  if (root) {
    root.style.display = shouldShowPanel() ? "block" : "none";
  }
}

function renderPanel(): void {
  applyPanelVisibility();
  panel.setTheme(themeMode);

  if (shouldShowPanel()) {
    panel.update(panelState);
  }
}

function syncPanel(): void {
  const media = loopController.getMedia();
  const range = loopController.getRange();
  const errorMessage = loopController.getErrorMessage();
  const currentTime = loopController.getCurrentTime();

  panelState.mediaDetected = !!media;
  panelState.currentTime = currentTime;
  panelState.startTime = range.startTime;
  panelState.endTime = range.endTime;
  panelState.enabled = range.enabled;
  panelState.errorMessage = errorMessage;
  updateSiteType();

  renderPanel();
}

async function openLooplockSession(): Promise<void> {
  looplockEnabled = true;
  floatingPanelVisible = true;

  await persistSessionState();
  renderPanel();
}

async function closeLooplockSession(): Promise<void> {
  loopController.clear();

  looplockEnabled = false;
  floatingPanelVisible = false;

  resetLoopRangeState();

  await persistSessionState();
  renderPanel();
}

async function applyTheme(nextThemeMode: ThemeMode): Promise<void> {
  themeMode = nextThemeMode;
  await saveThemeMode(themeMode);
  renderPanel();
}

function resetLoopStateForNewPage(nextPageKey: string, nextUrl: string): void {
  logger.info("Resetting loop state for new page.", {
    fromPageKey: currentPageKey,
    toPageKey: nextPageKey,
    fromUrl: lastKnownUrl,
    toUrl: nextUrl
  });

  loopController.clear();
  loopController.attachMedia(null);

  resetLoopRangeState();
  resetMediaState();

  currentPageKey = nextPageKey;
  lastKnownUrl = nextUrl;
  lastBoundMedia = null;

  updateSiteType();
  renderPanel();
}

async function bindMedia(retryCount = 0): Promise<void> {
  const media = detectPrimaryMedia();

  if (!media) {
    loopController.attachMedia(null);
    lastBoundMedia = null;
    syncPanel();

    if (retryCount < 12) {
      window.setTimeout(() => {
        void bindMedia(retryCount + 1);
      }, 400);
    }

    return;
  }

  const mediaChanged = lastBoundMedia !== null && media !== lastBoundMedia;

  loopController.attachMedia(media);

  if (mediaChanged) {
    logger.info("Media element changed on current page.");
  }

  lastBoundMedia = media;
  syncPanel();
}

const loopController = new LoopController(({ range, errorMessage, currentTime }) => {
  panelState.startTime = range.startTime;
  panelState.endTime = range.endTime;
  panelState.enabled = range.enabled;
  panelState.errorMessage = errorMessage;
  panelState.currentTime = currentTime;
  renderPanel();
});

const panel = new FloatingPanel(initialState, {
  onSetStart: () => {
    if (!looplockEnabled) return;
    loopController.setStartFromCurrentTime();
    syncPanel();
  },
  onSetEnd: () => {
    if (!looplockEnabled) return;
    loopController.setEndFromCurrentTime();
    syncPanel();
  },
  onToggleLoop: () => {
    if (!looplockEnabled) return;
    loopController.toggleEnabled();
    syncPanel();
  },
  onClear: () => {
    if (!looplockEnabled) return;
    loopController.clear();
    syncPanel();
  },
  onToggleCollapse: async () => {
    const next = !panelState.collapsed;
    panelState.collapsed = next;

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

function buildStatusResponse(): PopupStatusResponse {
  return {
    supported: isYouTubePage(),
    siteType: isYouTubePage() ? "youtube" : "generic",
    looplockEnabled,
    panelVisible: floatingPanelVisible,
    mediaDetected: panelState.mediaDetected,
    themeMode
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
          if (looplockEnabled) {
            floatingPanelVisible = true;
            await savePanelVisible(true);
            renderPanel();
          }
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
    panelState.collapsed = await loadCollapsedState();
    looplockEnabled = await loadLooplockEnabled();
    floatingPanelVisible = await loadPanelVisible();
    themeMode = await loadThemeMode();

    if (!looplockEnabled) {
      floatingPanelVisible = false;
    }

    updateSiteType();
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

  const urlChanged = nextUrl !== lastKnownUrl;
  const pageKeyChanged = nextPageKey !== currentPageKey;

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

  if (nextUrl !== lastKnownUrl || nextPageKey !== currentPageKey) {
    handleRouteChange("url polling");
  }
}, 800);