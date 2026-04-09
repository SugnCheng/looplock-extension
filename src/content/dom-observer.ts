export function observeDomChanges(onChange: () => void): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => {
      return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
    });

    if (relevant) {
      onChange();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  return observer;
}