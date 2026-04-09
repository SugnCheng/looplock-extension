import type { ContentMessage, PopupStatusResponse, ThemeMode } from "../shared/types";

function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] ?? null);
    });
  });
}

function isSupportedUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes("youtube.com/watch");
}

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

function applyPopupTheme(themeMode: ThemeMode): void {
  document.body.dataset.theme = themeMode;
}

function setThemeButtons(themeMode: ThemeMode): void {
  const darkBtn = document.getElementById("theme-dark-btn");
  const lightBtn = document.getElementById("theme-light-btn");

  darkBtn?.classList.toggle("active", themeMode === "dark");
  lightBtn?.classList.toggle("active", themeMode === "light");
}

function setOpenButtonState(status: PopupStatusResponse | null, supported: boolean): void {
  const btn = document.getElementById("open-looplock-btn") as HTMLButtonElement | null;
  if (!btn) return;

  if (!supported) {
    btn.textContent = "Unsupported Page";
    btn.disabled = true;
    return;
  }

  btn.disabled = false;

  if (status?.looplockEnabled && status?.panelVisible) {
    btn.textContent = "LoopLock Active";
    return;
  }

  btn.textContent = "Open LoopLock";
}

async function sendMessageToActiveTab(message: ContentMessage): Promise<PopupStatusResponse | null> {
  const tab = await getActiveTab();
  if (!tab?.id) return null;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response as PopupStatusResponse;
  } catch {
    return null;
  }
}

function renderStatus(status: PopupStatusResponse | null, tabSupported: boolean): void {
  if (!tabSupported) {
    setText("site-status", "Unsupported page");
    setText("enabled-status", "N/A");
    setText("panel-status", "N/A");
    applyPopupTheme("dark");
    setThemeButtons("dark");
    setOpenButtonState(null, false);
    return;
  }

  if (!status) {
    setText("site-status", "YouTube detected");
    setText("enabled-status", "Unavailable");
    setText("panel-status", "Unavailable");
    applyPopupTheme("dark");
    setThemeButtons("dark");
    setOpenButtonState(null, true);
    return;
  }

  setText("site-status", status.supported ? "YouTube detected" : "Unsupported page");
  setText("enabled-status", status.looplockEnabled ? "Enabled" : "Disabled");
  setText("panel-status", status.panelVisible ? "Visible" : "Hidden");
  applyPopupTheme(status.themeMode);
  setThemeButtons(status.themeMode);
  setOpenButtonState(status, true);
}

async function refreshStatus(): Promise<void> {
  const tab = await getActiveTab();
  const supported = isSupportedUrl(tab?.url);

  if (!supported) {
    renderStatus(null, false);
    return;
  }

  const status = await sendMessageToActiveTab({ type: "GET_STATUS" });
  renderStatus(status, true);
}

async function runAction(message: ContentMessage): Promise<void> {
  await sendMessageToActiveTab(message);
  await refreshStatus();
}

function bindEvents(): void {
  document.getElementById("open-looplock-btn")?.addEventListener("click", async () => {
    await runAction({ type: "OPEN_LOOPLOCK" });
  });

  document.getElementById("theme-dark-btn")?.addEventListener("click", async () => {
    await runAction({ type: "SET_THEME", themeMode: "dark" });
  });

  document.getElementById("theme-light-btn")?.addEventListener("click", async () => {
    await runAction({ type: "SET_THEME", themeMode: "light" });
  });
}

bindEvents();
void refreshStatus();