# LoopLock

> A lightweight Chrome / Edge extension for setting and replaying custom A-B loop segments on YouTube watch pages.

LoopLock is built for people who replay specific video moments again and again — especially:

- ASMR listeners
- language learners
- music and audio repeat users
- anyone reviewing short clips or spoken phrases repeatedly

Current direction is intentionally focused:

**Make the YouTube watch-page looping experience stable, clean, and product-like before expanding further.**

---

## Overview

LoopLock lets you:

- set an **A point**
- set a **B point**
- loop only that segment
- control the session through a compact floating panel
- optionally use keyboard shortcuts for faster operation

This project is currently in a **YouTube-first MVP Alpha** stage.

---

## Highlights

- **Popup-first product flow**  
  LoopLock starts from the extension popup instead of auto-injecting itself into every page interaction.

- **Clean floating panel UX**  
  Compact, draggable, collapsible, and designed to feel like a real product instead of a rough dev tool overlay.

- **Safe session model**  
  New YouTube video = new loop session.  
  Pause does not destroy your A/B points.

- **Theme sync**  
  Popup and floating panel stay aligned in dark / light mode.

- **Optional shortcuts**  
  Keyboard shortcuts are configurable, but intentionally conservative for stability.

---

## Demo / Screenshots

### Popup Main View
The popup acts as the official entry point for the LoopLock session.

![Popup Main View](docs/demo-popup-main.png)

### Floating Panel
LoopLock’s floating panel lets users set A/B points, toggle loop playback, clear the current range, and keep the panel visible while watching.

![Floating Panel](docs/demo-floating-panel.png)

### Runtime Shortcut Sync
The popup surfaces current shortcut status, runtime sync state, and shortcut mode visibility for the active tab.

![Shortcut Runtime Sync](docs/demo-shortcut-runtime-sync.png.png)

### Shortcut Conflict Feedback
Conflicting shortcut mappings are highlighted inline with direct field-level warnings for better clarity.

![Shortcut Conflict Warning](docs/demo-popup-settings-conflict.png.png)

---

## Current Scope

### Supported
- YouTube watch pages
- Manual A-B loop setup
- Popup-driven session start
- Floating control panel
- Dark / light theme sync
- Persistent floating panel position
- Optional keyboard shortcuts
- Inline shortcut conflict warnings in settings

### Not Supported Yet
- Generic HTML5 video players
- Bilibili
- Universal multi-site support
- Dedicated options page
- Advanced loop analytics or timeline widgets

---

## Feature Set

### Core Loop Controls
- **Set A**
- **Set B**
- **Toggle Loop**
- **Clear**

### Session Lifecycle
- LoopLock does **not** auto-start when a page opens
- Floating panel does **not** auto-open by default
- User explicitly starts the session from popup
- Closing with **✕** exits the whole LoopLock session

### Video Change Behavior
When a different YouTube video loads, LoopLock resets:
- A point
- B point
- Loop state

This is intentional and treated as a new session.

### Pause Behavior
Pausing the video does **not** reset:
- A point
- B point
- Loop state

### Floating Panel
- draggable
- collapsible
- compact layout
- persistent saved position

### Theme
- Dark mode
- Light mode

Popup and floating panel stay synchronized.

---

## Usage

### Start LoopLock
1. Open a YouTube watch page
2. Click the extension icon
3. Click **Open LoopLock**

This enables LoopLock and opens the floating panel.

### Close LoopLock
Click **✕** on the floating panel.

This is not just a visual hide action — it exits the current LoopLock session.

### Set a Loop
1. Play or scrub to the desired start point
2. Click **Set A**
3. Move to the desired end point
4. Click **Set B**
5. Toggle loop on

---

## Keyboard Shortcuts

Keyboard shortcuts are optional and **Off by default**.

You must enable them manually in **Settings**.

### Default Mapping
- `Alt+G` → Toggle shortcut mode
- `Alt+A` → Set A
- `Alt+S` → Set B
- `Alt+D` → Toggle Loop
- `Alt+F` → Clear

### Custom Mapping
Shortcut mappings can be customized in popup settings.

### Shortcut Rules
- Shortcuts only work when the **YouTube page itself is focused**
- If the **extension popup is focused**, page-level shortcuts will not fire
- Clearing a shortcut field restores it to the default value
- If two actions are assigned the same shortcut:
  - the conflicting fields are highlighted
  - inline conflict warnings appear directly on those fields

### Current Stability Note
Shortcut settings are intentionally handled conservatively to avoid breaking the main popup/session flow.

---

## UX Rules

These are currently intentional product rules:

- popup is the official entry point
- floating panel is not always-on by default
- no auto-enable on page load
- no auto-open on page load
- new video resets loop state
- pause does not reset loop state
- theme sync must remain consistent between popup and floating panel
- floating panel should update without destructive full DOM rebuilds after mount

---

## Installation

### Development Setup

```bash
npm install
npm run build