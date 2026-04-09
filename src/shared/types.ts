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

export interface PageLoopStorage {
  key: string;
  range: LoopRange;
  savedAt: number;
}