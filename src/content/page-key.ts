import { getYouTubeVideoId, isYouTubeWatchPage } from "./site-adapters/youtube";

export function getPageStorageKey(): string {
  if (isYouTubeWatchPage()) {
    const videoId = getYouTubeVideoId();
    if (videoId) {
      return `youtube:${videoId}`;
    }
  }

  return `url:${location.origin}${location.pathname}`;
}