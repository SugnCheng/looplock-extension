export interface LoopRange {
  startTime: number | null;
  endTime: number | null;
  enabled: boolean;
}

export interface PanelState extends LoopRange {
  mediaDetected: boolean;
  currentTime: number;
  siteType: "youtube" | "generic" | "unknown";
  collapsed: boolean;
  errorMessage: string | null;
}

export type ThemeMode = "dark" | "light";

export interface ExtensionUiState {
  looplockEnabled: boolean;
  floatingPanelVisible: boolean;
  collapsed: boolean;
  themeMode: ThemeMode;
}

export interface PopupStatusResponse {
  supported: boolean;
  siteType: "youtube" | "generic" | "unknown";
  looplockEnabled: boolean;
  panelVisible: boolean;
  mediaDetected: boolean;
  themeMode: ThemeMode;
}

export type ContentMessage =
  | { type: "GET_STATUS" }
  | { type: "OPEN_LOOPLOCK" }
  | { type: "SHOW_PANEL" }
  | { type: "SET_THEME"; themeMode: ThemeMode };