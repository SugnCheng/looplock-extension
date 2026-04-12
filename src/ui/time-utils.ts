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