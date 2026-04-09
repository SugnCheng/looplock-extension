import "../ui/panel.css";

import { detectPrimaryMedia } from "./media-detector";
import { LoopController } from "./loop-controller";
import { FloatingPanel } from "../ui/floating-panel";
import { loadCollapsedState, saveCollapsedState } from "../storage/storage";
import { logger } from "../shared/logger";
import type { PanelState } from "../shared/types";
import { observeDomChanges } from "./dom-observer";
import { isYouTubePage } from "./site-adapters/youtube";
import { getPageStorageKey } from "./page-key";
import { REBIND_DEBOUNCE_MS } from "../shared/constants";
import { installNavigationWatcher } from "./navigation-watcher";

let currentPageKey = getPageStorageKey();
let lastKnownUrl = location.href;
let lastBoundMedia: HTMLMediaElement | null = null;

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

const loopController = new LoopController(({ range, errorMessage, currentTime }) => {
  panel.update({
    startTime: range.startTime,
    endTime: range.endTime,
    enabled: range.enabled,
    errorMessage,
    currentTime
  });
});

const panel = new FloatingPanel(initialState, {
  onSetStart: () => {
    loopController.setStartFromCurrentTime();
    syncPanel();
  },
  onSetEnd: () => {
    loopController.setEndFromCurrentTime();
    syncPanel();
  },
  onToggleLoop: () => {
    loopController.toggleEnabled();
    syncPanel();
  },
  onClear: () => {
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

    syncPanel();
  }
});

panel.mount();

function resetLoopStateForNewPage(nextPageKey: string, nextUrl: string): void {
  logger.info("Resetting loop state for new page.", {
    fromPageKey: currentPageKey,
    toPageKey: nextPageKey,
    fromUrl: lastKnownUrl,
    toUrl: nextUrl
  });

  loopController.clear();
  loopController.attachMedia(null);

  panelState.startTime = null;
  panelState.endTime = null;
  panelState.enabled = false;
  panelState.errorMessage = null;
  panelState.currentTime = 0;
  panelState.mediaDetected = false;

  currentPageKey = nextPageKey;
  lastKnownUrl = nextUrl;
  lastBoundMedia = null;

  syncPanel();
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
    logger.info("Media element changed on current page. Preserving current empty/current state.");
  }

  lastBoundMedia = media;
  syncPanel();
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
  panelState.siteType = isYouTubePage() ? "youtube" : "generic";

  panel.update(panelState);
}

async function initialize(): Promise<void> {
  try {
    panelState.collapsed = await loadCollapsedState();
    await bindMedia();
  } catch (error) {
    logger.warn("Initialize failed:", error);
  }
}

void initialize();

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
  } else {
    syncPanel();
  }
}, 800);