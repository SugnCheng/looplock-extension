# LoopLock Architecture Notes

This document defines the current responsibility boundaries for LoopLock.

Its purpose is to reduce accidental coupling between popup UI, session actions, theme handling, shortcut settings, and page runtime behavior.

The current rule is simple:

**Each feature should be managed by responsibility, not mixed together just because it is convenient in one file.**

---

## 1. Current Product Context

LoopLock is currently a:

- Chrome / Edge extension
- YouTube-first MVP Alpha
- popup-first session model
- floating-panel control experience
- stability-first project

Current product rules already decided:

- popup is the official entry point
- LoopLock does not auto-start on page load
- floating panel does not auto-open by default
- closing panel with **✕** exits the full session
- new YouTube video resets A/B and loop state
- pause does not reset loop state
- shortcuts remain optional
- shortcut settings remain popup-local for now
- theme supports only dark / light

---

## 2. Why This Document Exists

LoopLock has reached the stage where feature growth is no longer the main risk.

The bigger risk is:

- popup logic becoming too mixed
- theme logic being tied to unrelated runtime state
- settings logic being tied to session-opening logic
- UI rendering being mixed with action execution
- one change breaking unrelated behavior

This document exists to stop that pattern before the project becomes harder to maintain.

---

## 3. Core Architecture Principle

### Main rule

A feature should only own the responsibility that belongs to it.

### Anti-pattern to avoid

Do **not** mix these together in one responsibility block:

- popup settings
- popup theme
- popup session-open flow
- runtime media detection
- floating panel rendering
- shortcut persistence
- content runtime state validation

Even if these are currently located in the same file, they should still be treated as separate responsibility areas.

---

## 4. Responsibility Boundaries

## 4.1 Popup Settings Responsibility

This area should only manage:

- settings view UI
- shortcut enable / disable
- shortcut mapping fields
- shortcut conflict feedback
- settings-local persistence behavior
- theme preference controls

This area should **not** directly own:

- opening LoopLock session
- deciding page support
- media detection
- floating panel lifecycle
- content runtime validation

### Current direction
Shortcut settings remain popup-local for now.

### Important rule
Do not move shortcut settings into shared/storage core flow yet.

---

## 4.2 Popup Session Action Responsibility

This area should only manage:

- `Open LoopLock`
- `Show Panel`
- session-related popup button behavior
- sending popup-to-content action messages
- receiving action results needed for session UI updates

This area should **not** directly own:

- theme persistence
- shortcut settings form state
- popup theme rendering
- settings view behavior

### Important rule
Opening LoopLock should only care about:

- whether the current page is eligible
- whether the session should start
- whether the floating panel should be shown

It should not become a catch-all place for unrelated popup behavior.

---

## 4.3 Popup Theme Responsibility

This area should only manage:

- popup's own theme state
- theme button active state
- theme persistence
- applying popup dark / light mode
- optionally syncing theme to content runtime when available

This area should **not** directly depend on:

- whether media is detected
- whether LoopLock is currently open
- whether the floating panel is visible
- whether content runtime is currently available

### Important rule
Popup theme must remain independently usable even if:

- the page is unsupported
- the content script is unavailable
- no media is detected
- the floating panel is not open

### Theme sync rule
Popup theme may sync outward to content / panel, but popup theme must not depend on successful content sync in order to work locally.

---

## 4.4 Popup Status Rendering Responsibility

This area should only manage UI presentation of popup status, including:

- supported / unsupported
- ready / active / unavailable
- status badge text
- hero copy
- site / panel / media text rows
- shortcut summary visibility

This area should **not** directly own:

- storage writes
- session-opening logic
- theme persistence
- shortcut field input handling

### Important rule
Rendering should display state, not decide state.

---

## 4.5 Floating Panel UI Responsibility

This area should only manage:

- panel layout
- displayed A / B / Now values
- helper text
- error text
- button states
- drag behavior
- collapse behavior
- close button UI behavior

This area should **not** own:

- route reset decisions
- media selection strategy
- shortcut persistence
- popup state logic
- storage policy decisions

### Important rule
The floating panel should behave like a UI surface, not a controller for unrelated application logic.

---

## 4.6 Content Runtime Responsibility

This area should only manage:

- supported page runtime behavior
- media binding
- loop state
- session reset on navigation
- runtime shortcut execution
- panel-visible session state on the actual page

This area should **not** own:

- popup settings form logic
- popup theme fallback behavior
- popup-specific rendering decisions

### Important rule
Content runtime is responsible for page execution state, not popup UX state.

---

## 4.7 Storage Responsibility

This area should only manage reading and writing stored values such as:

- theme mode
- panel position
- collapsed state
- session enabled state
- panel visible state

This area should **not** decide:

- whether something should render
- whether a page is supported
- whether an action is valid
- whether popup should close

### Important rule
Storage is persistence only, not business logic.

---

## 4.8 Message / Bridge Responsibility

This area should only manage:

- popup-to-content message contracts
- payload shape
- action names
- response shape consistency

Examples:
- `GET_STATUS`
- `OPEN_LOOPLOCK`
- `SHOW_PANEL`
- `SET_THEME`
- `SYNC_SHORTCUT_SETTINGS`

This area should **not** become a hidden place for product rules.

### Important rule
The bridge translates actions. It should not absorb unrelated feature logic.

---

## 5. State Independence Rules

The following state relationships must be preserved.

### Popup theme
- independent
- may sync outward
- must not depend on content response to work locally

### Shortcut settings
- popup-local for now
- may sync outward to current supported tab
- must not destabilize popup/session/theme flow

### Session open state
- owned by content runtime
- triggered from popup
- should not be mixed with popup settings logic

### Panel visibility
- owned by content runtime session state
- popup may request open/show
- popup should not fake panel state locally

### Page support
- determined by supported page rules
- must remain separate from media detection

### Media detection
- only meaningful on supported runtime pages
- must not be treated as the same thing as page support

---

## 6. Current Known Coupling Risks

These are the main areas to watch carefully.

### Risk 1: Popup theme coupled to content status
This has already caused real bugs.
Popup theme must remain independently functional.

### Risk 2: Open LoopLock coupled to popup rendering flow
This can break panel opening when unrelated UI behavior changes.

### Risk 3: Settings logic coupled to session behavior
Shortcut or theme settings should not destabilize session open flow.

### Risk 4: Supported page logic coupled to media detection
A page can be unsupported or non-watch while still containing some media-related DOM. These concepts must remain separate.

### Risk 5: One-file convenience causing feature overlap
Even if code remains in one file temporarily, responsibilities must still be treated separately.

---

## 7. Refactor Strategy

LoopLock should not be broadly rewritten in one pass.

### Rule
Do not do a large architecture rewrite that touches all popup logic at once.

### Correct strategy
Refactor one responsibility area at a time.

### Recommended order

1. **Document boundaries first**
2. **Organize popup logic into clear sections in the current file**
3. **Extract theme responsibility**
4. **Extract popup session actions**
5. **Extract popup status rendering**
6. **Leave shortcut settings popup-local until later**

---

## 8. Short-Term Refactor Plan

### Phase 1 — Documentation and structure
- create architecture notes
- group existing popup functions by responsibility
- stop adding mixed logic into random sections

### Phase 2 — Theme separation
Goal:
- popup theme works independently
- content sync remains secondary
- no theme change should break session open flow

### Phase 3 — Session action separation
Goal:
- `Open LoopLock` and `Show Panel` become clearly isolated action handlers
- session actions stop mixing with theme/settings logic

### Phase 4 — Status rendering separation
Goal:
- rendering functions only render
- state/action decisions happen elsewhere

### Phase 5 — Future cleanup
Only after stability is confirmed:
- consider extracting popup modules into separate files
- do not move shortcut settings into shared storage core flow yet

---

## 9. Current Refactor Limits

The following should remain protected for now:

- do not rewrite popup initialization flow broadly
- do not merge shortcut settings into shared/storage core flow
- do not rewrite content runtime architecture broadly
- do not revert floating panel to destructive DOM rebuilds
- do not expand to generic HTML5 during this cleanup stage

---

## 10. Practical Implementation Rule

Before changing popup logic, explicitly ask:

### Does this change belong to:
- popup settings?
- popup session action?
- popup theme?
- popup status rendering?
- content runtime?
- floating panel UI?
- storage?
- message bridge?

If the answer is “more than one,” the change is likely crossing responsibility boundaries and should be reconsidered.

---

## 11. Decision Rule for Future Work

When adding a new feature or fixing a bug:

### Good change
- affects one responsibility area
- has small surface area
- does not change unrelated behavior
- is easy to validate with smoke test

### Risky change
- changes multiple responsibility areas at once
- mixes render + storage + messaging + business rules
- makes popup depend on content for local UI state
- changes session flow while also changing settings/theme behavior

If a change is risky, reduce the scope before implementing it.

---

## 12. Final Project Rule

LoopLock should evolve by:

- protecting the main product chain
- defining responsibility clearly
- reducing hidden coupling
- making future features easier to add safely

This is the working rule going forward:

**Settings, Open LoopLock, Theme, Status Rendering, Content Runtime, and Floating Panel should be treated as separate responsibilities, even when implementation remains incremental.**