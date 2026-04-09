type OnUrlChange = (url: string) => void;

export function installNavigationWatcher(onUrlChange: OnUrlChange): void {
  let lastUrl = location.href;

  const notifyIfChanged = () => {
    const nextUrl = location.href;
    if (nextUrl !== lastUrl) {
      lastUrl = nextUrl;
      onUrlChange(nextUrl);
    }
  };

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args as Parameters<typeof history.pushState>);
    queueMicrotask(notifyIfChanged);
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args as Parameters<typeof history.replaceState>);
    queueMicrotask(notifyIfChanged);
    return result;
  };

  window.addEventListener("popstate", () => {
    queueMicrotask(notifyIfChanged);
  });

  window.addEventListener("yt-navigate-start", () => {
    queueMicrotask(notifyIfChanged);
  });

  window.addEventListener("yt-navigate-finish", () => {
    queueMicrotask(notifyIfChanged);
  });
}