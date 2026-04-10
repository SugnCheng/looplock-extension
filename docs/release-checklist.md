# LoopLock Release Checklist

This checklist is used before pushing important updates, tagging a release, or publishing a visibly improved MVP build.

Its purpose is to protect LoopLock’s current development rule:

**Do not break the main product chain while shipping incremental improvements.**

---

## 1. Scope Check

Before release, confirm the current change still matches project scope.

### Confirm
- LoopLock is still positioned as a **YouTube-first MVP Alpha**
- Current release does **not** accidentally imply generic HTML5 support
- Current release does **not** accidentally imply Bilibili support
- README, About text, and screenshots still match the actual current scope

### Release Blockers
- README claims functionality that does not exist
- Screenshots imply UI or flows that no longer match the current build
- Repo metadata no longer matches the product’s actual focus

---

## 2. Core Product Chain Check

Confirm the most important user flow is still intact.

### Required Flow
1. Open a supported YouTube watch page
2. Open the popup
3. Click **Open LoopLock**
4. Floating panel appears
5. Set A
6. Set B
7. Toggle Loop
8. Clear
9. Close session with **✕**

### Confirm
- Popup loads correctly
- `Open LoopLock` still works
- Floating panel still appears correctly
- A/B controls still work
- Loop toggle still works
- Clear still works
- **✕** still exits the full session

### Release Blockers
- Main button does nothing
- Panel does not appear
- Buttons require repeated clicks because bindings broke
- Close button only hides UI but fails to close session
- Core controls fail on a normal YouTube watch page

---

## 3. Session Lifecycle Check

Confirm current session rules still behave as designed.

### Confirm
- LoopLock does **not** auto-start on page load
- Floating panel does **not** auto-open by default
- Manual popup entry is still required
- Pause does **not** reset A/B or loop state
- New YouTube video resets A/B and loop state
- New video is treated as a new session context

### Release Blockers
- LoopLock auto-starts unexpectedly
- Floating panel auto-opens unexpectedly
- Pause resets loop state
- Video changes fail to reset session state

---

## 4. Floating Panel Stability Check

Confirm the floating panel still behaves like a stable mounted UI, not a fragile rebuilt overlay.

### Confirm
- Panel can be dragged
- Drag position persists
- Panel can collapse and expand
- Collapse state behaves consistently
- Panel updates correctly after interaction
- No broken event binding appears after repeated actions

### Release Blockers
- Dragging breaks panel interaction
- Position persistence fails unexpectedly
- Collapse/expand breaks control usability
- Interaction becomes inconsistent after updates

---

## 5. Theme Check

Confirm theme behavior is still aligned between popup and floating panel.

### Confirm
- Dark theme works
- Light theme works
- Popup theme changes correctly
- Floating panel theme changes correctly
- Theme switching does not break popup actions or panel rendering

### Release Blockers
- Theme buttons stop working
- Popup and panel become visually inconsistent
- Theme switch breaks interaction flow

---

## 6. Shortcut Check

Confirm current shortcut behavior still matches the accepted MVP design.

### Confirm
- Shortcuts remain **Off by default**
- Shortcut settings can be opened in popup
- Shortcut toggle works
- Shortcut mappings can be changed
- Clearing a field restores the default value
- Conflict warnings still appear correctly
- Shortcut summary still reflects the current mapping
- Shortcuts remain popup-local in persistence behavior
- Page-level shortcuts only fire when the page itself has focus

### Release Blockers
- Shortcut changes break popup initialization
- Shortcut changes break `Open LoopLock`
- Shortcut settings break theme switching
- Conflict UI stops working
- Shortcut capture fields stop functioning
- Focus behavior changes unexpectedly without intentional redesign

---

## 7. Popup UI Check

Confirm popup still feels like the official entry point.

### Confirm
- Popup main view loads correctly
- Settings view opens correctly
- Back button returns to main view correctly
- Unsupported state looks correct
- Ready state looks correct
- Active state looks correct
- Unavailable state still renders safely
- Shortcut section visibility still matches shortcut enabled/disabled state

### Release Blockers
- Popup view switching breaks
- Main and settings views overlap or disappear incorrectly
- Unsupported / ready / active / unavailable states become misleading
- Shortcut section becomes noisy or inconsistent again

---

## 8. Documentation Check

Confirm docs still match the current build.

### Confirm
- `README.md` matches actual product behavior
- `Known Behaviors / Current Product Rules` still matches actual implementation
- `Demo / Screenshots` still reflects actual UI flow
- `docs/manual-smoke-test.md` remains usable
- `docs/roadmap.md` still matches current strategy
- New changes do not create contradictions across docs

### Release Blockers
- README says popup behavior works differently than actual product
- README says shortcuts behave differently than actual product
- Screenshot section no longer matches current popup/panel UI
- Roadmap and implementation clearly diverge without note

---

## 9. GitHub Presentation Check

Confirm the public repo still looks intentional and coherent.

### Confirm
- Repo About text still matches the product
- Topics still fit the project’s current position
- README top section remains clean and readable
- Project status language still matches actual maturity
- Public presentation does not overclaim scope

### Release Blockers
- Repo metadata becomes stale or misleading
- README presents future goals as if already shipped
- Public presentation no longer matches the current MVP

---

## 10. Build Check

Confirm the project still builds cleanly before release.

### Run
```bash
npm run build