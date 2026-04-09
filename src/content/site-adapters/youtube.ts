export function isYouTubePage(): boolean {
  return location.hostname.includes("youtube.com");
}

export function isYouTubeWatchPage(): boolean {
  return isYouTubePage() && location.pathname === "/watch";
}

export function getYouTubeVideoId(): string | null {
  if (!isYouTubeWatchPage()) return null;

  const url = new URL(location.href);
  return url.searchParams.get("v");
}