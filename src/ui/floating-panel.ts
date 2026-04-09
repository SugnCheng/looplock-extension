import { EXTENSION_ROOT_ID } from "../shared/constants";
import type { PanelState, ThemeMode } from "../shared/types";
import { formatTime } from "./time-utils";

interface PanelHandlers {
  onSetStart: () => void;
  onSetEnd: () => void;
  onToggleLoop: () => void;
  onClear: () => void;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
}

export class FloatingPanel {
  private root: HTMLDivElement;
  private state: PanelState;
  private handlers: PanelHandlers;

  private panelEl!: HTMLDivElement;
  private headerEl!: HTMLDivElement;
  private statusEl!: HTMLSpanElement;
  private collapseBtn!: HTMLButtonElement;
  private closeBtn!: HTMLButtonElement;
  private bodyEl!: HTMLDivElement;
  private nowCardEl!: HTMLDivElement;
  private aCardEl!: HTMLDivElement;
  private bCardEl!: HTMLDivElement;
  private nowValueEl!: HTMLSpanElement;
  private aValueEl!: HTMLSpanElement;
  private bValueEl!: HTMLSpanElement;
  private errorEl!: HTMLDivElement;
  private setStartBtn!: HTMLButtonElement;
  private setEndBtn!: HTMLButtonElement;
  private toggleLoopBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;

  private isDragging = false;
  private dragStartMouseX = 0;
  private dragStartMouseY = 0;
  private dragStartLeft = 0;
  private dragStartTop = 0;

  private hasInitializedPosition = false;
  private themeMode: ThemeMode = "dark";

  constructor(initialState: PanelState, handlers: PanelHandlers) {
    this.state = initialState;
    this.handlers = handlers;
    this.root = this.createRoot();
    this.build();
    this.applyTheme();
    this.render();
  }

  mount(): void {
    if (!document.body.contains(this.root)) {
      document.body.appendChild(this.root);
    }

    if (!this.hasInitializedPosition) {
      requestAnimationFrame(() => {
        this.setInitialPosition();
        this.hasInitializedPosition = true;
      });
    }

    window.addEventListener("resize", this.handleWindowResize);
  }

  update(nextState: Partial<PanelState>): void {
    this.state = { ...this.state, ...nextState };
    this.render();

    if (this.hasInitializedPosition) {
      this.clampToViewport();
    }
  }

  setTheme(themeMode: ThemeMode): void {
    this.themeMode = themeMode;
    this.applyTheme();
  }

  private createRoot(): HTMLDivElement {
    let existing = document.getElementById(EXTENSION_ROOT_ID) as HTMLDivElement | null;
    if (existing) return existing;

    const el = document.createElement("div");
    el.id = EXTENSION_ROOT_ID;
    return el;
  }

  private applyTheme(): void {
    this.root.dataset.theme = this.themeMode;
  }

  private build(): void {
    this.root.innerHTML = "";

    this.panelEl = document.createElement("div");
    this.panelEl.className = "looplock-panel";

    this.headerEl = document.createElement("div");
    this.headerEl.className = "looplock-header looplock-drag-handle";

    const titleWrap = document.createElement("div");
    titleWrap.className = "looplock-title-wrap";

    const title = document.createElement("span");
    title.className = "looplock-title";
    title.textContent = "LoopLock";

    const dragHint = document.createElement("span");
    dragHint.className = "looplock-drag-hint";
    dragHint.textContent = "Drag";

    titleWrap.appendChild(title);
    titleWrap.appendChild(dragHint);

    const headerRight = document.createElement("div");
    headerRight.className = "looplock-header-right";

    this.statusEl = document.createElement("span");
    this.statusEl.className = "looplock-status";

    this.collapseBtn = document.createElement("button");
    this.collapseBtn.className = "looplock-collapse-btn";
    this.collapseBtn.type = "button";
    this.collapseBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.handlers.onToggleCollapse();
    });

    this.closeBtn = document.createElement("button");
    this.closeBtn.className = "looplock-close-btn";
    this.closeBtn.type = "button";
    this.closeBtn.title = "Exit LoopLock";
    this.closeBtn.textContent = "✕";
    this.closeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      this.handlers.onClosePanel();
    });

    headerRight.appendChild(this.statusEl);
    headerRight.appendChild(this.collapseBtn);
    headerRight.appendChild(this.closeBtn);

    this.headerEl.appendChild(titleWrap);
    this.headerEl.appendChild(headerRight);

    this.bodyEl = document.createElement("div");
    this.bodyEl.className = "looplock-body";

    const metricsGrid = document.createElement("div");
    metricsGrid.className = "looplock-metrics-grid";

    this.nowCardEl = document.createElement("div");
    this.nowCardEl.className = "looplock-metric-card looplock-now-card";
    this.nowCardEl.innerHTML = `
      <div class="looplock-metric-label">Now</div>
      <div class="looplock-metric-value"><span></span></div>
    `;
    this.nowValueEl = this.nowCardEl.querySelector("span") as HTMLSpanElement;

    this.aCardEl = document.createElement("div");
    this.aCardEl.className = "looplock-metric-card";
    this.aCardEl.innerHTML = `
      <div class="looplock-metric-label">A</div>
      <div class="looplock-metric-value"><span></span></div>
    `;
    this.aValueEl = this.aCardEl.querySelector("span") as HTMLSpanElement;

    this.bCardEl = document.createElement("div");
    this.bCardEl.className = "looplock-metric-card";
    this.bCardEl.innerHTML = `
      <div class="looplock-metric-label">B</div>
      <div class="looplock-metric-value"><span></span></div>
    `;
    this.bValueEl = this.bCardEl.querySelector("span") as HTMLSpanElement;

    metricsGrid.appendChild(this.nowCardEl);
    metricsGrid.appendChild(this.aCardEl);
    metricsGrid.appendChild(this.bCardEl);

    this.errorEl = document.createElement("div");
    this.errorEl.className = "looplock-error";

    const actions = document.createElement("div");
    actions.className = "looplock-actions";

    this.setStartBtn = document.createElement("button");
    this.setStartBtn.type = "button";
    this.setStartBtn.className = "looplock-action-btn";
    this.setStartBtn.textContent = "Set A";
    this.setStartBtn.addEventListener("click", () => {
      this.handlers.onSetStart();
    });

    this.setEndBtn = document.createElement("button");
    this.setEndBtn.type = "button";
    this.setEndBtn.className = "looplock-action-btn";
    this.setEndBtn.textContent = "Set B";
    this.setEndBtn.addEventListener("click", () => {
      this.handlers.onSetEnd();
    });

    this.toggleLoopBtn = document.createElement("button");
    this.toggleLoopBtn.type = "button";
    this.toggleLoopBtn.className = "looplock-action-btn looplock-primary-action";
    this.toggleLoopBtn.addEventListener("click", () => {
      this.handlers.onToggleLoop();
    });

    this.clearBtn = document.createElement("button");
    this.clearBtn.type = "button";
    this.clearBtn.className = "looplock-action-btn";
    this.clearBtn.textContent = "Clear";
    this.clearBtn.addEventListener("click", () => {
      this.handlers.onClear();
    });

    actions.appendChild(this.setStartBtn);
    actions.appendChild(this.setEndBtn);
    actions.appendChild(this.toggleLoopBtn);
    actions.appendChild(this.clearBtn);

    this.bodyEl.appendChild(metricsGrid);
    this.bodyEl.appendChild(this.errorEl);
    this.bodyEl.appendChild(actions);

    this.panelEl.appendChild(this.headerEl);
    this.panelEl.appendChild(this.bodyEl);
    this.root.appendChild(this.panelEl);

    this.bindDragEvents();
  }

  private bindDragEvents(): void {
    this.headerEl.addEventListener("mousedown", (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button")) return;

      event.preventDefault();

      const rect = this.panelEl.getBoundingClientRect();

      this.isDragging = true;
      this.dragStartMouseX = event.clientX;
      this.dragStartMouseY = event.clientY;
      this.dragStartLeft = rect.left;
      this.dragStartTop = rect.top;

      document.addEventListener("mousemove", this.handleDragMove);
      document.addEventListener("mouseup", this.handleDragEnd);
    });
  }

  private handleDragMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;

    const dx = event.clientX - this.dragStartMouseX;
    const dy = event.clientY - this.dragStartMouseY;

    const panelWidth = this.panelEl.offsetWidth;
    const panelHeight = this.panelEl.offsetHeight;

    const minLeft = 8;
    const minTop = 8;
    const maxLeft = Math.max(8, window.innerWidth - panelWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - panelHeight - 8);

    const nextLeft = Math.min(Math.max(this.dragStartLeft + dx, minLeft), maxLeft);
    const nextTop = Math.min(Math.max(this.dragStartTop + dy, minTop), maxTop);

    this.root.style.left = `${nextLeft}px`;
    this.root.style.top = `${nextTop}px`;
    this.root.style.right = "auto";
    this.root.style.bottom = "auto";
  };

  private handleDragEnd = (): void => {
    this.isDragging = false;
    document.removeEventListener("mousemove", this.handleDragMove);
    document.removeEventListener("mouseup", this.handleDragEnd);
  };

  private handleWindowResize = (): void => {
    this.clampToViewport();
  };

  private setInitialPosition(): void {
    const panelWidth = this.panelEl.offsetWidth || 224;
    const panelHeight = this.panelEl.offsetHeight || 196;
    const margin = 16;

    const left = Math.max(margin, window.innerWidth - panelWidth - margin);
    const top = Math.max(margin, window.innerHeight - panelHeight - margin);

    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
    this.root.style.right = "auto";
    this.root.style.bottom = "auto";
  }

  private clampToViewport(): void {
    const rect = this.panelEl.getBoundingClientRect();
    const panelWidth = this.panelEl.offsetWidth;
    const panelHeight = this.panelEl.offsetHeight;
    const margin = 8;

    let nextLeft = rect.left;
    let nextTop = rect.top;

    const maxLeft = Math.max(margin, window.innerWidth - panelWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - panelHeight - margin);

    if (nextLeft < margin) nextLeft = margin;
    if (nextTop < margin) nextTop = margin;
    if (nextLeft > maxLeft) nextLeft = maxLeft;
    if (nextTop > maxTop) nextTop = maxTop;

    this.root.style.left = `${nextLeft}px`;
    this.root.style.top = `${nextTop}px`;
    this.root.style.right = "auto";
    this.root.style.bottom = "auto";
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

    this.panelEl.classList.toggle("collapsed", collapsed);

    this.statusEl.className = `looplock-status ${mediaDetected ? "ok" : "off"}`;
    this.statusEl.textContent = mediaDetected ? "Detected" : "No Media";

    this.collapseBtn.textContent = collapsed ? "＋" : "－";
    this.collapseBtn.title = collapsed ? "Expand panel" : "Collapse panel";

    this.nowValueEl.textContent = formatTime(currentTime);
    this.aValueEl.textContent = formatTime(startTime);
    this.bValueEl.textContent = formatTime(endTime);

    this.toggleLoopBtn.textContent = enabled ? "Loop Off" : "Loop On";
    this.toggleLoopBtn.classList.toggle("looplock-loop-active", enabled);

    if (collapsed) {
      this.bodyEl.style.display = "none";
    } else {
      this.bodyEl.style.display = "";
    }

    if (errorMessage) {
      this.errorEl.style.display = "";
      this.errorEl.textContent = errorMessage;
    } else {
      this.errorEl.style.display = "none";
      this.errorEl.textContent = "";
    }
  }
}