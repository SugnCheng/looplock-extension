# LoopLock

LoopLock is a Chrome / Edge extension for looping a custom A-B segment on YouTube videos.

It is designed for:
- ASMR listeners
- language learners
- anyone who needs to replay a specific section repeatedly

Current product focus is a stable and polished **YouTube watch page MVP**.

---

## Current Scope

LoopLock currently supports:

- YouTube watch pages only
- manual A-B loop setup
- popup-driven session start
- floating control panel
- dark / light theme sync
- draggable panel position persistence
- optional keyboard shortcuts

LoopLock does **not** currently target:
- generic HTML5 players
- Bilibili
- universal site-wide media support

---

## Core Features

### A-B Loop Controls
- Set **A**
- Set **B**
- Toggle **Loop On / Off**
- **Clear** current range

### Session Behavior
- LoopLock does **not** auto-start on page load
- Floating panel does **not** auto-open on page load
- User starts a session from the extension popup
- Closing the floating panel with **✕** exits the current LoopLock session

### YouTube Navigation Reset
When switching to a different YouTube video, LoopLock treats it as a new session and resets:
- A point
- B point
- Loop state

### Pause Behavior
Pausing the video does **not** reset:
- A point
- B point
- Loop state

### Floating Panel
- draggable
- collapsible
- compact layout
- position persists across sessions

### Theme
- dark mode
- light mode

Popup and floating panel stay synchronized.

---

## How It Works

### Start LoopLock
1. Open a YouTube watch page
2. Click the browser extension icon
3. Click **Open LoopLock**

This will:
- enable LoopLock
- open the floating panel

### Close LoopLock
Use the **✕** button on the floating panel.

This does **not** just hide the panel. It exits the current LoopLock session and clears the current loop state.

---

## Keyboard Shortcuts

Keyboard shortcuts are currently an optional feature.

### Default Behavior
Keyboard shortcuts are **Off by default**.

You must enable them manually in **Settings**.

### Default Shortcut Mapping
- `Alt+G` → Toggle shortcut mode
- `Alt+A` → Set A
- `Alt+S` → Set B
- `Alt+D` → Toggle Loop
- `Alt+F` → Clear

### Custom Shortcut Mapping
Shortcut mappings can be customized in the popup settings UI.

### Important Shortcut Notes
- Shortcuts work only when the **YouTube page is focused**
- If the **extension popup is focused**, page-level shortcuts will not trigger
- Clearing a shortcut field restores it to its default mapping
- If two shortcut actions conflict, the related fields are highlighted with:
  - red border
  - inline conflict warning

### Shortcut Runtime Notes
Popup settings are stored locally in the popup layer first for stability.

Current runtime behavior is intentionally conservative to avoid breaking the main popup/session flow.

---

## Current UX Rules

These behaviors are intentionally part of the product design:

- popup is the primary entry point
- floating panel is not always-on by default
- no auto-open on page load
- no auto-enable on page load
- video change resets loop state
- pause does not reset loop state
- theme sync must stay consistent between popup and panel
- floating panel update logic should avoid full DOM rebuilds after mount

---

## Tech Stack

- TypeScript
- Vite
- Chrome Extension Manifest V3

Project structure currently centers around:

- `src/content/` — content script and page logic
- `src/ui/` — floating panel UI
- `src/popup/` — popup UI and settings
- `src/storage/` — extension storage helpers
- `src/shared/` — shared types, constants, logger

---

## Current Development Status

Current product stage:

**YouTube watch page MVP Alpha / v0.2.x**

Recent stable areas include:
- popup as official entry point
- productized popup UI
- floating panel improvements
- panel position persistence
- safe shortcut settings persistence in popup-local storage
- inline shortcut conflict feedback

---

## Known Product Constraints

These are known and currently acceptable constraints:

- popup focus disables page-level shortcuts
- shortcut settings are intentionally handled conservatively for stability
- YouTube-only support for now
- generic media support is out of scope at this stage

---

## Development Priorities

Near-term priorities:
1. keep main session flow stable
2. improve shortcut UX carefully in small steps
3. improve README / demo / project presentation
4. continue shipping only low-risk increments

---

## Installation (Dev)

```bash
npm install
npm run build