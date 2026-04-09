import { EXTENSION_ROOT_ID } from "../shared/constants";
import type { PanelState } from "../shared/types";
import { formatTime } from "./time-utils";

interface PanelHandlers {
  onSetStart: () => void;
  onSetEnd: () => void;
  onToggleLoop: () => void;
  onClear: () => void;
  onToggleCollapse: () => void;
}

export class FloatingPanel {
  private root: HTMLDivElement;
  private state: PanelState;
  private handlers: PanelHandlers;

  constructor(initialState: PanelState, handlers: PanelHandlers) {
    this.state = initialState;
    this.handlers = handlers;
    this.root = this.createRoot();
    this.render();
  }

  mount(): void {
    if (!document.body.contains(this.root)) {
      document.body.appendChild(this.root);
    }
  }

  update(nextState: Partial<PanelState>): void {
    this.state = { ...this.state, ...nextState };
    this.render();
  }

  private createRoot(): HTMLDivElement {
    let existing = document.getElementById(EXTENSION_ROOT_ID) as HTMLDivElement | null;
    if (existing) return existing;

    const el = document.createElement("div");
    el.id = EXTENSION_ROOT_ID;
    return el;
  }

  private render(): void {
    const {
      mediaDetected,
      startTime,
      endTime,
      enabled,
      currentTime,
      collapsed,
      errorMessage
    } = this.state;

    this.root.innerHTML = `
      <div class="looplock-panel ${collapsed ? "collapsed" : ""}">
        <div class="looplock-header">
          <span class="looplock-title">LoopLock</span>
          <div class="looplock-header-right">
            <span class="looplock-status ${mediaDetected ? "ok" : "off"}">
              ${mediaDetected ? "Detected" : "No Media"}
            </span>
            <button class="looplock-collapse-btn" data-action="toggle-collapse">
              ${collapsed ? "＋" : "－"}
            </button>
          </div>
        </div>

        ${
          collapsed
            ? ""
            : `
          <div class="looplock-now">
            Now: <strong>${formatTime(currentTime)}</strong>
          </div>

          <div class="looplock-times">
            <div>A: <strong>${formatTime(startTime)}</strong></div>
            <div>B: <strong>${formatTime(endTime)}</strong></div>
          </div>

          ${
            errorMessage
              ? `<div class="looplock-error">${errorMessage}</div>`
              : ""
          }

          <div class="looplock-actions">
            <button data-action="set-start">Set A</button>
            <button data-action="set-end">Set B</button>
            <button data-action="toggle-loop">${enabled ? "Loop Off" : "Loop On"}</button>
            <button data-action="clear">Clear</button>
          </div>
        `
        }
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.root.querySelector('[data-action="set-start"]')?.addEventListener("click", () => {
      this.handlers.onSetStart();
    });

    this.root.querySelector('[data-action="set-end"]')?.addEventListener("click", () => {
      this.handlers.onSetEnd();
    });

    this.root.querySelector('[data-action="toggle-loop"]')?.addEventListener("click", () => {
      this.handlers.onToggleLoop();
    });

    this.root.querySelector('[data-action="clear"]')?.addEventListener("click", () => {
      this.handlers.onClear();
    });

    this.root.querySelector('[data-action="toggle-collapse"]')?.addEventListener("click", () => {
      this.handlers.onToggleCollapse();
    });
  }
}