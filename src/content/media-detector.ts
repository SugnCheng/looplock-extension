import { logger } from "../shared/logger";

function getVisibleArea(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return 0;
  return rect.width * rect.height;
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function isPlayableMedia(el: HTMLMediaElement): boolean {
  return el.readyState > 0 || el.duration > 0 || !el.paused;
}

function isLikelyMainMedia(el: HTMLMediaElement): boolean {
  const area = getVisibleArea(el as HTMLElement);
  return area > 0 || el.tagName.toLowerCase() === "audio";
}

export function detectPrimaryMedia(): HTMLMediaElement | null {
  const mediaElements = Array.from(
    document.querySelectorAll("video, audio")
  ) as HTMLMediaElement[];

  if (mediaElements.length === 0) {
    logger.warn("No media element found.");
    return null;
  }

  const visibleMedia = mediaElements.filter((el) => isVisible(el as HTMLElement) || el.tagName.toLowerCase() === "audio");
  const playableMedia = visibleMedia.filter(isPlayableMedia);
  const candidatePool = playableMedia.length > 0 ? playableMedia : visibleMedia.length > 0 ? visibleMedia : mediaElements;

  const filtered = candidatePool.filter(isLikelyMainMedia);

  filtered.sort((a, b) => {
    const aArea = getVisibleArea(a as HTMLElement);
    const bArea = getVisibleArea(b as HTMLElement);

    if (!a.paused && b.paused) return -1;
    if (a.paused && !b.paused) return 1;

    return bArea - aArea;
  });

  const target = filtered[0] ?? candidatePool[0] ?? null;

  if (target) {
    logger.info("Detected primary media:", target.tagName, {
      currentTime: target.currentTime,
      duration: target.duration
    });
  }

  return target;
}