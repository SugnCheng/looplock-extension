import type { PanelState, ThemeMode, PanelPosition } from "../shared/types";
import { isYouTubePage } from "./site-adapters/youtube";

export interface ContentRuntimeState {
  currentPageKey: string;
  lastKnownUrl: string;
  lastBoundMedia: HTMLMediaElement | null;
  looplockEnabled: boolean;
  floatingPanelVisible: boolean;
  themeMode: ThemeMode;
  panelState: PanelState;
  panelPosition: PanelPosition | null;
}

export function createInitialPanelState(): PanelState {
  return {
    startTime: null,
    endTime: null,
    enabled: false,
    mediaDetected: false,
    currentTime: 0,
    siteType: isYouTubePage() ? "youtube" : "generic",
    collapsed: false,
    errorMessage: null
  };
}

export function createRuntimeState(initialPageKey: string): ContentRuntimeState {
  return {
    currentPageKey: initialPageKey,
    lastKnownUrl: location.href,
    lastBoundMedia: null,
    looplockEnabled: false,
    floatingPanelVisible: false,
    themeMode: "dark",
    panelPosition: null,
    panelState: createInitialPanelState(),
  };
}

export function updateSiteType(panelState: PanelState): void {
  panelState.siteType = isYouTubePage() ? "youtube" : "generic";
}

export function resetLoopRangeState(panelState: PanelState): void {
  panelState.startTime = null;
  panelState.endTime = null;
  panelState.enabled = false;
  panelState.errorMessage = null;
}

export function resetMediaState(panelState: PanelState): void {
  panelState.currentTime = 0;
  panelState.mediaDetected = false;
}

export function shouldShowPanel(
  looplockEnabled: boolean,
  floatingPanelVisible: boolean
): boolean {
  return looplockEnabled && floatingPanelVisible;
}