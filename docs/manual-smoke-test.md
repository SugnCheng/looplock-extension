# LoopLock Manual Smoke Test

This checklist is used to verify that LoopLock’s core flow remains stable after any UI, popup, content-script, runtime, build, or shortcut-related change.

---

## Test Scope

Current intended product scope:

- YouTube watch pages only for opening a new LoopLock session
- Popup as the official entry point
- Floating panel opened manually from popup
- A-B loop playback on the active video
- Dark / light theme sync between popup and floating panel
- Keyboard shortcuts as optional, popup-local settings with runtime sync
- Theme sync may still apply on other YouTube pages if the active tab content runtime is still reachable
- Content script must be built as an injectable bundle from the built extension output

---

## Pre-Test Setup

Before starting:

1. Build the latest extension output
2. Confirm the extension is loaded successfully from the correct built output
3. Open a normal YouTube watch page
4. Make sure no old assumptions are being reused from previous runs
5. Treat this as a fresh manual validation pass

Recommended pages to test:

- A normal YouTube watch page with a playable video
- A second different YouTube watch page for navigation reset testing
- A YouTube non-watch page such as Home or a creator channel page
- A completely unsupported page for unsupported-state testing

---

## 0. Build / Install Validation

### Goal
Verify the extension build and install base is valid before testing product behavior.

### Steps
1. Run the current build command
2. Open `chrome://extensions` or `edge://extensions`
3. Remove any stale local version if needed
4. Load the extension from the latest built output
5. Open a YouTube watch page
6. Refresh the page after loading the extension

### Expected Result
- The extension loads without install errors
- The built output is the one actually being tested
- The popup can connect to the active page on supported watch pages
- No immediate content-script syntax failure occurs

---

## 1. Popup Entry Flow

### Goal
Verify that popup remains the official and stable session entry point.

### Steps
1. Open a YouTube watch page
2. Open the LoopLock popup
3. Confirm popup loads without UI breakage
4. Confirm current page is recognized as supported
5. Confirm the main action button shows `Open LoopLock`
6. Click `Open LoopLock`

### Expected Result
- Popup loads correctly
- Supported page status is shown correctly
- No theme or layout breakage appears
- Clicking `Open LoopLock` opens the floating panel
- Session is enabled only after manual user action

---

## 2. No Auto-Start / No Auto-Open

### Goal
Verify LoopLock does not start automatically.

### Steps
1. Refresh a YouTube watch page
2. Do not open popup yet
3. Observe page state
4. Open popup afterward

### Expected Result
- Floating panel does not appear automatically
- LoopLock is not enabled automatically
- Session starts only after clicking `Open LoopLock`

---

## 3. Floating Panel Core Controls

### Goal
Verify the panel’s main controls remain functional.

### Steps
1. Open LoopLock from popup
2. In the floating panel, click `Set A`
3. Move video time forward
4. Click `Set B`
5. Click loop toggle
6. Click `Clear`

### Expected Result
- `Set A` stores the current time as A
- `Set B` stores the current time as B
- Loop toggle changes loop state correctly
- `Clear` clears A/B and loop state
- Panel UI updates immediately and correctly
- No control requires repeated clicking due to broken bindings

---

## 4. Close Session Behavior

### Goal
Verify the floating panel close button exits the full session, not just hides the UI.

### Steps
1. Open LoopLock
2. Set A and B
3. Enable loop if possible
4. Click the `✕` button on the floating panel
5. Reopen popup

### Expected Result
- The floating panel disappears
- The current LoopLock session is closed
- Loop state is cleared
- A/B state is cleared
- Reopening popup should not show the session as still active unless reopened manually

---

## 5. Reopen Flow After Session Close

### Goal
Verify the user can reopen a clean new session after closing.

### Steps
1. After closing with `✕`, open popup again
2. Click `Open LoopLock`
3. Observe floating panel state

### Expected Result
- A new session opens successfully
- No stale A/B values remain
- No stale loop-enabled state remains
- Panel works normally after reopening

---

## 6. Pause / Resume Behavior

### Goal
Verify pause does not reset the loop state.

### Steps
1. Open LoopLock
2. Set A and B
3. Pause the video
4. Resume playback

### Expected Result
- Pausing does not clear A
- Pausing does not clear B
- Pausing does not reset loop enabled state
- Resume works without forcing a new session

---

## 7. New Video Reset Behavior

### Goal
Verify navigation to a different YouTube video resets session loop state correctly.

### Steps
1. Open LoopLock on a YouTube watch page
2. Set A and B
3. Enable loop
4. Navigate to a different YouTube watch page with a different video ID
5. Observe panel and popup status

### Expected Result
- A is cleared
- B is cleared
- Loop returns to Off
- New video is treated as a new session context
- No stale values carry into the next video

---

## 8. Same-Page Stability During DOM Changes

### Goal
Verify normal DOM changes do not incorrectly break the session on the same video page.

### Steps
1. Open LoopLock on a YouTube watch page
2. Set A and B
3. Interact with normal YouTube page UI
4. Let the page continue loading recommended content / comments / dynamic page elements
5. Observe session stability

### Expected Result
- LoopLock does not randomly reset on the same video
- Panel remains usable
- Media remains bound correctly
- No repeated panel mounting or event breakage occurs

---

## 9. Theme Sync on Watch Page

### Goal
Verify popup and floating panel stay synchronized in theme mode on a supported watch page.

### Steps
1. Open popup on a supported watch page
2. Switch theme to `Dark`
3. Observe popup and floating panel
4. Switch theme to `Light`
5. Observe popup and floating panel again

### Expected Result
- Popup theme changes immediately
- Floating panel theme changes immediately
- Popup and panel stay visually synchronized
- Theme switching does not break main button flow or panel rendering

---

## 10. Theme Sync on Non-Watch YouTube Pages

### Goal
Verify popup theme can still sync to an existing panel on YouTube pages that are not watch pages, as long as the active tab content runtime is still reachable.

### Steps
1. Open LoopLock from a watch page
2. Leave the session/panel alive
3. Navigate to YouTube Home or a creator page
4. Open popup
5. Switch theme between `Dark` and `Light`

### Expected Result
- Popup theme still changes immediately
- Floating panel theme still syncs if the tab runtime remains reachable
- The inability to open a new session on a non-watch page does not block theme sync for an already-alive panel

---

## 11. Panel Visibility Recovery

### Goal
Verify a session with hidden panel can recover correctly.

### Steps
1. Open LoopLock
2. Put the session into a state where popup shows `Show Panel` if available
3. Click `Show Panel`

### Expected Result
- The floating panel becomes visible again
- Existing session remains intact
- Popup button state updates correctly

---

## 12. Draggable Panel Persistence

### Goal
Verify floating panel position saving remains stable.

### Steps
1. Open LoopLock
2. Drag the floating panel to a clearly different location
3. Close or reload the page as needed
4. Reopen LoopLock on a supported page

### Expected Result
- Panel position is restored consistently
- Dragging remains smooth
- Position persistence does not break panel rendering

---

## 13. Collapsed State Behavior

### Goal
Verify the panel can collapse and recover correctly.

### Steps
1. Open LoopLock
2. Collapse the floating panel
3. Expand it again
4. Refresh or reopen as needed
5. Observe the collapsed state

### Expected Result
- Collapse / expand works normally
- No controls disappear permanently
- State behaves consistently with current product design
- No event bindings are lost after collapse / expand

---

## 14. Shortcut Default State

### Goal
Verify keyboard shortcuts remain Off by default.

### Steps
1. Open popup settings on a fresh state
2. Inspect the shortcut enabled toggle
3. Review main popup shortcut status

### Expected Result
- Shortcuts are Off by default
- Main popup reflects disabled state correctly
- No unexpected runtime shortcut behavior occurs before enabling

---

## 15. Shortcut Enable / Disable

### Goal
Verify shortcut enablement works and stays isolated from the main session flow.

### Steps
1. Open popup settings
2. Turn on keyboard shortcuts
3. Return to main popup view
4. Observe shortcut-related status fields
5. Turn shortcuts off again

### Expected Result
- Enabled / disabled state updates correctly
- Shortcut summary updates correctly
- Shortcut runtime state updates reasonably
- Main popup flow remains stable
- Open LoopLock / theme / panel behavior is not broken by shortcut settings

---

## 16. Shortcut Capture

### Goal
Verify shortcut input fields capture key combinations correctly.

### Steps
1. Open popup settings
2. Click into each shortcut input field
3. Press a combination such as `Alt+A`
4. Repeat with other valid combinations

### Expected Result
- Input captures the shortcut in normalized format
- Value appears in the field immediately
- Summary updates accordingly
- No text typing behavior leaks into the read-only capture field

---

## 17. Shortcut Reset to Default

### Goal
Verify clearing a shortcut field restores the default mapping.

### Steps
1. Open popup settings
2. Focus one shortcut field
3. Press `Backspace` or `Delete`
4. Observe the field value and summary

### Expected Result
- The field does not remain blank
- The field returns to its default value
- Summary reflects the default value
- Shortcut runtime state remains stable

---

## 18. Shortcut Conflict Warning

### Goal
Verify conflict feedback remains clear and local to popup settings.

### Steps
1. Open popup settings
2. Assign the same shortcut to two different actions
3. Observe field states and warnings

### Expected Result
- Conflicting fields are highlighted
- Warning text clearly indicates conflict target(s)
- Popup remains stable
- No crash or broken view transition occurs

---

## 19. Shortcut Runtime Sync

### Goal
Verify popup shortcut settings can sync to the active supported tab.

### Steps
1. Open a YouTube watch page
2. Open popup settings
3. Change one or more shortcut mappings
4. Return to main popup view
5. Observe shortcut runtime state

### Expected Result
- Runtime state reflects the latest tab condition
- Sync behavior is understandable and stable
- Shortcut changes do not break theme switching or session opening
- Sync behavior remains isolated from shared storage risks

---

## 20. Page Shortcut Focus Rule

### Goal
Verify current accepted focus behavior remains true and predictable.

### Steps
1. Enable shortcuts
2. Open LoopLock
3. Keep popup focused
4. Try triggering a page-level shortcut
5. Then close popup and try again with YouTube page focused

### Expected Result
- When popup has focus, page-level shortcuts do not fire
- When the YouTube page has focus, shortcuts can fire normally
- This behavior remains consistent and predictable

---

## 21. Unsupported Page State

### Goal
Verify popup correctly handles unsupported contexts.

### Steps
1. Open popup on a non-YouTube-watch page
2. Observe popup state and primary button

### Expected Result
- Popup clearly shows unsupported state
- Primary action is disabled or otherwise blocked appropriately
- No misleading “active” or “ready” session state is shown

---

## 22. Content Script Unavailable State

### Goal
Verify popup handles temporary status-unavailable conditions safely.

### Steps
1. Open a supported YouTube watch page
2. Trigger a situation where popup cannot read content state reliably, if reproducible
3. Observe popup fallback state

### Expected Result
- Popup shows a safe unavailable state instead of breaking
- Main UI still renders
- No fatal popup initialization issue occurs

---

## 23. Content Injection / Runtime Diagnosis

### Goal
Verify the standard diagnosis path for “Unavailable” or missing panel behavior remains clear.

### Steps
1. Open a supported watch page
2. If popup shows unavailable or panel fails to appear, inspect the page console
3. Verify the extension was loaded from the current built output
4. Re-check that the content runtime is actually present on the page

### Expected Result
- Failures can be triaged in a predictable order
- Build / injection issues can be distinguished from popup logic issues
- The team does not mistake a dead content runtime for a panel logic regression

---

## 24. Regression Guard: Main Chain Stability

### Goal
Verify the most critical product chain has not been broken by recent changes.

### Steps
Run this exact sequence in order:

1. Open supported YouTube watch page
2. Open popup
3. Click `Open LoopLock`
4. Set A
5. Set B
6. Toggle Loop
7. Change theme
8. Open settings
9. Change a shortcut
10. Return to main view
11. Close session with floating panel `✕`
12. Open another YouTube video
13. Reopen LoopLock

### Expected Result
- Every step works without reload loops, missing handlers, or dead buttons
- Theme still works
- Open LoopLock still works
- Floating panel still works
- Shortcuts do not break popup or content core flow
- New video still resets loop state correctly

---

## Suggested Test Result Format

Use this template after each validation pass:

- Date:
- Branch / Commit:
- Browser:
- Extension build source:
- Scope tested:
- Result:
  - Pass
  - Pass with notes
  - Failed
- Notes:
- Repro steps for failures:

---

## Push / Release Gate Recommendation

Before pushing any change that touches popup, content, runtime messaging, theme, panel rendering, build output, or shortcut behavior:

1. Confirm the latest stable local version actually passed smoke testing
2. Push only after the stable version is explicitly accepted as the next baseline
3. Re-run at least these checks:
   - Build / Install Validation
   - Popup Entry Flow
   - No Auto-Start / No Auto-Open
   - Floating Panel Core Controls
   - Close Session Behavior
   - New Video Reset Behavior
   - Theme Sync on Watch Page
   - Theme Sync on Non-Watch YouTube Pages
   - Shortcut Conflict Warning
   - Regression Guard: Main Chain Stability

---

## Current Intent

This checklist exists to protect LoopLock’s current development rule:

**Do not break the main product chain while doing incremental improvements.**