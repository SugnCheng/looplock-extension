export function formatTime(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return "--:--.-";

  const totalTenths = Math.max(0, Math.round(seconds * 10));
  const totalSeconds = Math.floor(totalTenths / 10);
  const tenths = totalTenths % 10;

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}.${tenths}`;
}

export type TimeEditorDraft = {
  showHours: boolean;
  hours: string;
  minutes: string;
  seconds: string;
  tenths: string;
};

export function createTimeEditorDraft(seconds: number | null): TimeEditorDraft {
  const safeSeconds = seconds === null || Number.isNaN(seconds) ? 0 : Math.max(0, seconds);
  const totalTenths = Math.round(safeSeconds * 10);
  const totalSeconds = Math.floor(totalTenths / 10);
  const tenths = totalTenths % 10;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return {
    showHours: hours > 0,
    hours: String(hours),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(secs).padStart(2, "0"),
    tenths: String(tenths)
  };
}

export function sanitizeDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function composeTimeEditorDraft(draft: TimeEditorDraft): number | null {
  const hours = draft.showHours ? Number(draft.hours || "0") : 0;
  const minutes = Number(draft.minutes || "0");
  const seconds = Number(draft.seconds || "0");
  const tenths = Number(draft.tenths || "0");

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    !Number.isFinite(tenths)
  ) {
    return null;
  }

  if (hours < 0 || minutes < 0 || seconds < 0 || tenths < 0) {
    return null;
  }

  if (minutes >= 60 || seconds >= 60 || tenths >= 10) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds + tenths / 10;
}