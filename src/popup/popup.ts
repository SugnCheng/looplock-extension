import type { ContentMessage, PopupStatusResponse, ThemeMode } from "../shared/types";

type PopupView = "main" | "settings";

interface ShortcutSettings {
  enabled: boolean;
  toggleEnabledShortcut: string;
  setStartShortcut: string;
  setEndShortcut: string;
  toggleLoopShortcut: string;
  clearShortcut: string;
}

const SHORTCUT_SETTINGS_STORAGE_KEY = "looplock:popup:shortcutSettings";

let currentView: PopupView = "main";
let shortcutSettings: ShortcutSettings = getDefaultShortcutSettings();

function getDefaultShortcutSettings(): ShortcutSettings {
  return {
    enabled: false,
    toggleEnabledShortcut: "Alt+G",
    setStartShortcut: "Alt+A",
    setEndShortcut: "Alt+S",
    toggleLoopShortcut: "Alt+D",
    clearShortcut: "Alt+F"
  };
}

function loadShortcutSettingsFromLocal(): ShortcutSettings {
  try {
    const raw = window.localStorage.getItem(SHORTCUT_SETTINGS_STORAGE_KEY);
    if (!raw) return getDefaultShortcutSettings();

    const parsed = JSON.parse(raw) as Partial<ShortcutSettings>;
    const defaults = getDefaultShortcutSettings();

    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : defaults.enabled,
      toggleEnabledShortcut:
        typeof parsed.toggleEnabledShortcut === "string" && parsed.toggleEnabledShortcut.trim()
          ? parsed.toggleEnabledShortcut.trim()
          : defaults.toggleEnabledShortcut,
      setStartShortcut:
        typeof parsed.setStartShortcut === "string" && parsed.setStartShortcut.trim()
          ? parsed.setStartShortcut.trim()
          : defaults.setStartShortcut,
      setEndShortcut:
        typeof parsed.setEndShortcut === "string" && parsed.setEndShortcut.trim()
          ? parsed.setEndShortcut.trim()
          : defaults.setEndShortcut,
      toggleLoopShortcut:
        typeof parsed.toggleLoopShortcut === "string" && parsed.toggleLoopShortcut.trim()
          ? parsed.toggleLoopShortcut.trim()
          : defaults.toggleLoopShortcut,
      clearShortcut:
        typeof parsed.clearShortcut === "string" && parsed.clearShortcut.trim()
          ? parsed.clearShortcut.trim()
          : defaults.clearShortcut
    };
  } catch (error) {
    console.warn("Failed to load popup shortcut settings from localStorage.", error);
    return getDefaultShortcutSettings();
  }
}

function saveShortcutSettingsToLocal(settings: ShortcutSettings): void {
  try {
    window.localStorage.setItem(SHORTCUT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to save popup shortcut settings to localStorage.", error);
  }
}

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

function setBadgeState(
  label: string,
  variant: "active" | "inactive" | "error"
): void {
  const badge = document.getElementById("top-status-badge");
  if (!badge) return;

  badge.textContent = label;
  badge.classList.remove("active", "inactive", "error");
  badge.classList.add(variant);
}

function setHeroCopy(title: string, subtitle: string): void {
  setText("hero-title", title);
  setText("hero-subtitle", subtitle);
}

function setTipText(value: string): void {
  setText("popup-tip", value);
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

  if (status?.looplockEnabled && !status?.panelVisible) {
    btn.textContent = "Show Panel";
    return;
  }

  btn.textContent = "Open LoopLock";
}

function setView(nextView: PopupView): void {
  currentView = nextView;

  const mainView = document.getElementById("main-view");
  const settingsView = document.getElementById("settings-view");

  if (!mainView || !settingsView) return;

  mainView.classList.toggle("hidden-view", currentView !== "main");
  settingsView.classList.toggle("hidden-view", currentView !== "settings");
}

function normalizeShortcutInput(value: string): string {
  const normalized = value.replace(/\s+/g, "").trim();
  return normalized.length > 0 ? normalized : "Alt+?";
}

function populateShortcutForm(settings: ShortcutSettings): void {
  const enabledToggle = document.getElementById("shortcut-enabled-toggle") as HTMLInputElement | null;
  const toggleEnabledInput = document.getElementById("shortcut-toggle-enabled-input") as HTMLInputElement | null;
  const setStartInput = document.getElementById("shortcut-set-start-input") as HTMLInputElement | null;
  const setEndInput = document.getElementById("shortcut-set-end-input") as HTMLInputElement | null;
  const toggleLoopInput = document.getElementById("shortcut-toggle-loop-input") as HTMLInputElement | null;
  const clearInput = document.getElementById("shortcut-clear-input") as HTMLInputElement | null;

  if (enabledToggle) enabledToggle.checked = settings.enabled;
  if (toggleEnabledInput) toggleEnabledInput.value = settings.toggleEnabledShortcut;
  if (setStartInput) setStartInput.value = settings.setStartShortcut;
  if (setEndInput) setEndInput.value = settings.setEndShortcut;
  if (toggleLoopInput) toggleLoopInput.value = settings.toggleLoopShortcut;
  if (clearInput) clearInput.value = settings.clearShortcut;
}

function persistShortcutSettingsFromForm(): void {
  try {
    const enabledToggle = document.getElementById("shortcut-enabled-toggle") as HTMLInputElement | null;
    const toggleEnabledInput = document.getElementById("shortcut-toggle-enabled-input") as HTMLInputElement | null;
    const setStartInput = document.getElementById("shortcut-set-start-input") as HTMLInputElement | null;
    const setEndInput = document.getElementById("shortcut-set-end-input") as HTMLInputElement | null;
    const toggleLoopInput = document.getElementById("shortcut-toggle-loop-input") as HTMLInputElement | null;
    const clearInput = document.getElementById("shortcut-clear-input") as HTMLInputElement | null;

    shortcutSettings = {
      enabled: enabledToggle?.checked ?? false,
      toggleEnabledShortcut: normalizeShortcutInput(toggleEnabledInput?.value ?? shortcutSettings.toggleEnabledShortcut),
      setStartShortcut: normalizeShortcutInput(setStartInput?.value ?? shortcutSettings.setStartShortcut),
      setEndShortcut: normalizeShortcutInput(setEndInput?.value ?? shortcutSettings.setEndShortcut),
      toggleLoopShortcut: normalizeShortcutInput(toggleLoopInput?.value ?? shortcutSettings.toggleLoopShortcut),
      clearShortcut: normalizeShortcutInput(clearInput?.value ?? shortcutSettings.clearShortcut)
    };

    saveShortcutSettingsToLocal(shortcutSettings);
    populateShortcutForm(shortcutSettings);
  } catch (error) {
    console.warn("Failed to persist popup shortcut settings.", error);
  }
}

function resetShortcutSettingsToDefault(): void {
  shortcutSettings = getDefaultShortcutSettings();
  saveShortcutSettingsToLocal(shortcutSettings);
  populateShortcutForm(shortcutSettings);
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

function renderUnsupportedState(): void {
  setText("site-status", "Unsupported page");
  setText("enabled-status", "N/A");
  setText("panel-status", "N/A");
  setText("media-status", "N/A");
  setHeroCopy(
    "Open a YouTube watch page first.",
    "LoopLock currently focuses on YouTube watch pages for its MVP experience."
  );
  setTipText("Go to a YouTube video page, then reopen the popup to launch LoopLock.");
  setBadgeState("Unsupported", "error");
  applyPopupTheme("dark");
  setThemeButtons("dark");
  setOpenButtonState(null, false);
}

function renderUnavailableState(): void {
  setText("site-status", "YouTube detected");
  setText("enabled-status", "Unavailable");
  setText("panel-status", "Unavailable");
  setText("media-status", "Unavailable");
  setHeroCopy(
    "LoopLock is available on this page.",
    "The content script did not respond, so status details are temporarily unavailable."
  );
  setTipText("Try reopening the popup or refreshing the page if the status stays unavailable.");
  setBadgeState("Ready", "inactive");
  applyPopupTheme("dark");
  setThemeButtons("dark");
  setOpenButtonState(null, true);
}

function renderSupportedState(status: PopupStatusResponse): void {
  setText("site-status", status.supported ? "YouTube detected" : "Unsupported page");
  setText("enabled-status", status.looplockEnabled ? "Enabled" : "Disabled");
  setText("panel-status", status.panelVisible ? "Visible" : "Hidden");
  setText("media-status", status.mediaDetected ? "Detected" : "Not detected");

  applyPopupTheme(status.themeMode);
  setThemeButtons(status.themeMode);
  setOpenButtonState(status, true);

  if (status.looplockEnabled && status.panelVisible) {
    setBadgeState("Active", "active");
    setHeroCopy(
      "LoopLock is active on this tab.",
      status.mediaDetected
        ? "Use the floating panel to set A/B points, loop playback, or exit with ✕."
        : "LoopLock is open, but media has not been detected yet on this page."
    );
    setTipText("Tip: drag the panel to your preferred spot — its position now stays saved.");
    return;
  }

  if (status.looplockEnabled && !status.panelVisible) {
    setBadgeState("Enabled", "inactive");
    setHeroCopy(
      "LoopLock is enabled, but the panel is hidden.",
      "Use the button below to show the floating panel again on this video page."
    );
    setTipText("Your loop session remains available until you exit from the floating panel.");
    return;
  }

  setBadgeState("Ready", "inactive");
  setHeroCopy(
    "This page is ready for LoopLock.",
    status.mediaDetected
      ? "Open LoopLock to start setting A/B points for the current video."
      : "Open LoopLock now, and media detection will continue as the page finishes loading."
  );
  setTipText("LoopLock starts only when you choose to open it from the popup.");
}

function renderStatus(status: PopupStatusResponse | null, tabSupported: boolean): void {
  if (!tabSupported) {
    renderUnsupportedState();
    return;
  }

  if (!status) {
    renderUnavailableState();
    return;
  }

  renderSupportedState(status);
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
  const status = await sendMessageToActiveTab(message);
  const tab = await getActiveTab();
  const supported = isSupportedUrl(tab?.url);
  renderStatus(status, supported);
}

function bindShortcutSettingsEvents(): void {
  document.getElementById("shortcut-enabled-toggle")?.addEventListener("change", () => {
    persistShortcutSettingsFromForm();
  });

  const inputIds = [
    "shortcut-toggle-enabled-input",
    "shortcut-set-start-input",
    "shortcut-set-end-input",
    "shortcut-toggle-loop-input",
    "shortcut-clear-input"
  ];

  for (const id of inputIds) {
    document.getElementById(id)?.addEventListener("change", () => {
      persistShortcutSettingsFromForm();
    });
  }

  document.getElementById("reset-shortcuts-btn")?.addEventListener("click", () => {
    resetShortcutSettingsToDefault();
  });
}

function bindEvents(): void {
  document.getElementById("open-looplock-btn")?.addEventListener("click", async () => {
    const currentButtonText =
      (document.getElementById("open-looplock-btn") as HTMLButtonElement | null)?.textContent ?? "";

    if (currentButtonText === "Show Panel") {
      await runAction({ type: "SHOW_PANEL" });
      return;
    }

    await runAction({ type: "OPEN_LOOPLOCK" });
  });

  document.getElementById("theme-dark-btn")?.addEventListener("click", async () => {
    await runAction({ type: "SET_THEME", themeMode: "dark" });
  });

  document.getElementById("theme-light-btn")?.addEventListener("click", async () => {
    await runAction({ type: "SET_THEME", themeMode: "light" });
  });

  document.getElementById("open-settings-btn")?.addEventListener("click", () => {
    setView("settings");
  });

  document.getElementById("back-to-main-btn")?.addEventListener("click", () => {
    setView("main");
  });

  bindShortcutSettingsEvents();
}

function initializePopup(): void {
  setView("main");
  bindEvents();

  shortcutSettings = loadShortcutSettingsFromLocal();
  populateShortcutForm(shortcutSettings);

  void refreshStatus();
}

initializePopup();