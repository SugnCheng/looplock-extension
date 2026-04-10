import type {
  ContentMessage,
  PopupStatusResponse,
  ThemeMode,
  ShortcutSettings
} from "../shared/types";

type PopupView = "main" | "settings";

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

function sanitizeShortcutString(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  const parts = raw
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";

  const modifiers = new Set<string>();
  let primaryKey = "";

  for (const part of parts) {
    const lower = part.toLowerCase();

    if (lower === "ctrl" || lower === "control") {
      modifiers.add("Ctrl");
      continue;
    }
    if (lower === "alt" || lower === "option") {
      modifiers.add("Alt");
      continue;
    }
    if (lower === "shift") {
      modifiers.add("Shift");
      continue;
    }
    if (
      lower === "meta" ||
      lower === "cmd" ||
      lower === "command" ||
      lower === "win"
    ) {
      modifiers.add("Meta");
      continue;
    }

    if (primaryKey) return "";

    if (/^[a-z]$/i.test(part)) {
      primaryKey = part.toUpperCase();
      continue;
    }

    if (/^[0-9]$/.test(part)) {
      primaryKey = part;
      continue;
    }

    if (/^f([1-9]|1[0-2])$/i.test(part)) {
      primaryKey = part.toUpperCase();
      continue;
    }

    switch (lower) {
      case "space":
      case "spacebar":
        primaryKey = "Space";
        break;
      case "enter":
      case "return":
        primaryKey = "Enter";
        break;
      case "escape":
      case "esc":
        primaryKey = "Escape";
        break;
      case "tab":
        primaryKey = "Tab";
        break;
      case "backspace":
        primaryKey = "Backspace";
        break;
      case "delete":
      case "del":
        primaryKey = "Delete";
        break;
      case "arrowup":
      case "up":
        primaryKey = "ArrowUp";
        break;
      case "arrowdown":
      case "down":
        primaryKey = "ArrowDown";
        break;
      case "arrowleft":
      case "left":
        primaryKey = "ArrowLeft";
        break;
      case "arrowright":
      case "right":
        primaryKey = "ArrowRight";
        break;
      default:
        return "";
    }
  }

  if (!primaryKey) return "";

  const ordered: string[] = [];
  if (modifiers.has("Ctrl")) ordered.push("Ctrl");
  if (modifiers.has("Alt")) ordered.push("Alt");
  if (modifiers.has("Shift")) ordered.push("Shift");
  if (modifiers.has("Meta")) ordered.push("Meta");
  ordered.push(primaryKey);

  return ordered.join("+");
}

function sanitizeShortcutSettings(value: Partial<ShortcutSettings> | null | undefined): ShortcutSettings {
  const defaults = getDefaultShortcutSettings();

  return {
    enabled: typeof value?.enabled === "boolean" ? value.enabled : defaults.enabled,
    toggleEnabledShortcut:
      sanitizeShortcutString(value?.toggleEnabledShortcut ?? "") || defaults.toggleEnabledShortcut,
    setStartShortcut:
      sanitizeShortcutString(value?.setStartShortcut ?? "") || defaults.setStartShortcut,
    setEndShortcut:
      sanitizeShortcutString(value?.setEndShortcut ?? "") || defaults.setEndShortcut,
    toggleLoopShortcut:
      sanitizeShortcutString(value?.toggleLoopShortcut ?? "") || defaults.toggleLoopShortcut,
    clearShortcut:
      sanitizeShortcutString(value?.clearShortcut ?? "") || defaults.clearShortcut
  };
}

function serializeKeyboardEvent(event: KeyboardEvent): string {
  let primaryKey = "";

  if (event.code.startsWith("Key") && event.code.length === 4) {
    primaryKey = event.code.slice(3).toUpperCase();
  } else if (event.code.startsWith("Digit") && event.code.length === 6) {
    primaryKey = event.code.slice(5);
  } else if (/^F([1-9]|1[0-2])$/.test(event.code)) {
    primaryKey = event.code.toUpperCase();
  } else {
    switch (event.key) {
      case " ":
        primaryKey = "Space";
        break;
      case "Enter":
      case "Escape":
      case "Tab":
      case "Backspace":
      case "Delete":
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
        primaryKey = event.key;
        break;
      default:
        if (event.key.length === 1 && /^[a-z0-9]$/i.test(event.key)) {
          primaryKey = /^[a-z]$/i.test(event.key) ? event.key.toUpperCase() : event.key;
        }
    }
  }

  if (!primaryKey) return "";

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  parts.push(primaryKey);

  return parts.join("+");
}

function normalizeShortcutSettings(settings: ShortcutSettings): ShortcutSettings {
  return sanitizeShortcutSettings(settings);
}

function areShortcutSettingsEqual(a: ShortcutSettings, b: ShortcutSettings): boolean {
  const left = normalizeShortcutSettings(a);
  const right = normalizeShortcutSettings(b);

  return (
    left.enabled === right.enabled &&
    left.toggleEnabledShortcut === right.toggleEnabledShortcut &&
    left.setStartShortcut === right.setStartShortcut &&
    left.setEndShortcut === right.setEndShortcut &&
    left.toggleLoopShortcut === right.toggleLoopShortcut &&
    left.clearShortcut === right.clearShortcut
  );
}

function getShortcutEntries(settings: ShortcutSettings): Array<{
  key: keyof ShortcutSettings;
  label: string;
  fieldId: string;
  warningId: string;
  value: string;
}> {
  return [
    {
      key: "toggleEnabledShortcut",
      label: "Toggle shortcut mode",
      fieldId: "shortcut-toggle-enabled-field",
      warningId: "shortcut-toggle-enabled-warning",
      value: settings.toggleEnabledShortcut
    },
    {
      key: "setStartShortcut",
      label: "Set A",
      fieldId: "shortcut-set-start-field",
      warningId: "shortcut-set-start-warning",
      value: settings.setStartShortcut
    },
    {
      key: "setEndShortcut",
      label: "Set B",
      fieldId: "shortcut-set-end-field",
      warningId: "shortcut-set-end-warning",
      value: settings.setEndShortcut
    },
    {
      key: "toggleLoopShortcut",
      label: "Toggle Loop",
      fieldId: "shortcut-toggle-loop-field",
      warningId: "shortcut-toggle-loop-warning",
      value: settings.toggleLoopShortcut
    },
    {
      key: "clearShortcut",
      label: "Clear",
      fieldId: "shortcut-clear-field",
      warningId: "shortcut-clear-warning",
      value: settings.clearShortcut
    }
  ];
}

function clearShortcutConflictUi(): void {
  for (const entry of getShortcutEntries(shortcutSettings)) {
    const field = document.getElementById(entry.fieldId);
    const warning = document.getElementById(entry.warningId);

    field?.classList.remove("settings-field-conflict");
    if (warning) {
      warning.textContent = "";
    }
  }
}

function renderShortcutConflictUi(): void {
  clearShortcutConflictUi();

  const entries = getShortcutEntries(shortcutSettings);
  const groups = new Map<string, typeof entries>();

  for (const entry of entries) {
    const value = entry.value.trim();
    if (!value) continue;

    const existing = groups.get(value) ?? [];
    existing.push(entry);
    groups.set(value, existing);
  }

  for (const [, group] of groups.entries()) {
    if (group.length <= 1) continue;

    for (const entry of group) {
      const conflictWith = group
        .filter((item) => item.fieldId !== entry.fieldId)
        .map((item) => item.label)
        .join(", ");

      const field = document.getElementById(entry.fieldId);
      const warning = document.getElementById(entry.warningId);

      field?.classList.add("settings-field-conflict");

      if (warning) {
        warning.textContent = `Conflicts with: ${conflictWith}`;
      }
    }
  }
}

function loadShortcutSettingsFromLocal(): ShortcutSettings {
  try {
    const raw = window.localStorage.getItem(SHORTCUT_SETTINGS_STORAGE_KEY);
    if (!raw) return getDefaultShortcutSettings();

    return sanitizeShortcutSettings(JSON.parse(raw) as Partial<ShortcutSettings>);
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

function renderShortcutSummary(): void {
  setText("shortcut-enabled-status", shortcutSettings.enabled ? "Enabled" : "Disabled");
  setText("shortcut-toggle-enabled-summary", shortcutSettings.toggleEnabledShortcut || "-");
  setText(
    "shortcut-ab-summary",
    `${shortcutSettings.setStartShortcut || "-"} / ${shortcutSettings.setEndShortcut || "-"}`
  );
  setText(
    "shortcut-loop-clear-summary",
    `${shortcutSettings.toggleLoopShortcut || "-"} / ${shortcutSettings.clearShortcut || "-"}`
  );
}

function renderShortcutRuntimeState(status: PopupStatusResponse | null, tabSupported: boolean): void {
  if (!tabSupported) {
    setText("shortcut-runtime-sync-status", "N/A");
    setText("shortcut-runtime-mode-status", "N/A");
    return;
  }

  if (!status) {
    setText("shortcut-runtime-sync-status", "Unknown");
    setText("shortcut-runtime-mode-status", "Unknown");
    return;
  }

  const synced = areShortcutSettingsEqual(status.shortcutSettings, shortcutSettings);
  setText("shortcut-runtime-sync-status", synced ? "Synced" : "Needs sync");
  setText("shortcut-runtime-mode-status", status.shortcutModeActive ? "Active" : "Off");
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

async function syncShortcutSettingsToActiveTab(): Promise<PopupStatusResponse | null> {
  const tab = await getActiveTab();
  const supported = isSupportedUrl(tab?.url);

  if (!supported) return null;

  try {
    return await sendMessageToActiveTab({
      type: "SYNC_SHORTCUT_SETTINGS",
      settings: shortcutSettings
    });
  } catch (error) {
    console.warn("Failed to sync shortcut settings to active tab.", error);
    return null;
  }
}

function persistShortcutSettings(): void {
  shortcutSettings = sanitizeShortcutSettings(shortcutSettings);
  saveShortcutSettingsToLocal(shortcutSettings);
  populateShortcutForm(shortcutSettings);
  renderShortcutSummary();
  renderShortcutConflictUi();
  void syncShortcutSettingsToActiveTab();
}

function resetShortcutSettingsToDefault(): void {
  shortcutSettings = getDefaultShortcutSettings();
  saveShortcutSettingsToLocal(shortcutSettings);
  populateShortcutForm(shortcutSettings);
  renderShortcutSummary();
  renderShortcutConflictUi();
  void syncShortcutSettingsToActiveTab();
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
    renderShortcutRuntimeState(null, false);
    return;
  }

  if (!status) {
    renderUnavailableState();
    renderShortcutRuntimeState(null, true);
    return;
  }

  renderSupportedState(status);
  renderShortcutRuntimeState(status, true);
}

async function refreshStatus(): Promise<void> {
  const tab = await getActiveTab();
  const supported = isSupportedUrl(tab?.url);

  if (!supported) {
    renderStatus(null, false);
    return;
  }

  let status = await sendMessageToActiveTab({ type: "GET_STATUS" });

  if (status && !areShortcutSettingsEqual(status.shortcutSettings, shortcutSettings)) {
    status = await syncShortcutSettingsToActiveTab();
  }

  renderStatus(status, true);
}

async function runAction(message: ContentMessage): Promise<void> {
  const status = await sendMessageToActiveTab(message);
  const tab = await getActiveTab();
  const supported = isSupportedUrl(tab?.url);
  renderStatus(status, supported);
}

function bindShortcutCaptureInputs(): void {
  const fields = [
    {
      id: "shortcut-toggle-enabled-input",
      apply: (value: string) => {
        shortcutSettings.toggleEnabledShortcut = value;
      }
    },
    {
      id: "shortcut-set-start-input",
      apply: (value: string) => {
        shortcutSettings.setStartShortcut = value;
      }
    },
    {
      id: "shortcut-set-end-input",
      apply: (value: string) => {
        shortcutSettings.setEndShortcut = value;
      }
    },
    {
      id: "shortcut-toggle-loop-input",
      apply: (value: string) => {
        shortcutSettings.toggleLoopShortcut = value;
      }
    },
    {
      id: "shortcut-clear-input",
      apply: (value: string) => {
        shortcutSettings.clearShortcut = value;
      }
    }
  ];

  for (const field of fields) {
    const input = document.getElementById(field.id) as HTMLInputElement | null;
    if (!input) continue;

    input.readOnly = true;
    input.placeholder = "Press shortcut";

    input.addEventListener("keydown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Backspace" || event.key === "Delete") {
        field.apply("");
        input.value = "";
        persistShortcutSettings();
        return;
      }

      const shortcut = serializeKeyboardEvent(event);
      if (!shortcut) return;

      field.apply(shortcut);
      input.value = shortcut;
      persistShortcutSettings();
    });
  }
}

function bindShortcutSettingsEvents(): void {
  document.getElementById("shortcut-enabled-toggle")?.addEventListener("change", (event) => {
    const input = event.currentTarget as HTMLInputElement;
    shortcutSettings.enabled = input.checked;
    persistShortcutSettings();
  });

  document.getElementById("reset-shortcuts-btn")?.addEventListener("click", () => {
    resetShortcutSettingsToDefault();
  });

  bindShortcutCaptureInputs();
}

function bindEvents(): void {
  document.getElementById("open-looplock-btn")?.addEventListener("click", async () => {
    const currentButtonText =
      (document.getElementById("open-looplock-btn") as HTMLButtonElement | null)?.textContent ?? "";

    if (currentButtonText === "Show Panel") {
      await runAction({ type: "SHOW_PANEL" });
      await refreshStatus();
      return;
    }

    await runAction({ type: "OPEN_LOOPLOCK" });
    await refreshStatus();
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
    void refreshStatus();
  });

  bindShortcutSettingsEvents();
}

function initializePopup(): void {
  setView("main");
  bindEvents();

  try {
    shortcutSettings = loadShortcutSettingsFromLocal();
    populateShortcutForm(shortcutSettings);
    renderShortcutSummary();
    renderShortcutConflictUi();
  } catch (error) {
    console.warn("Failed to initialize shortcut settings.", error);
    shortcutSettings = getDefaultShortcutSettings();
    populateShortcutForm(shortcutSettings);
    renderShortcutSummary();
    renderShortcutConflictUi();
  }

  void refreshStatus();
}

initializePopup();