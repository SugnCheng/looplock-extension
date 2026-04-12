import { EXTENSION_ROOT_ID } from "../shared/constants";
import type { PanelState, ThemeMode, PanelPosition } from "../shared/types";
import { formatTime } from "./time-utils";

interface PanelHandlers {
  getInitialPosition: () => PanelPosition | null | undefined;
  onPositionChange: (position: PanelPosition) => void | Promise<void>;
  onAdjustCurrentBackward: () => void;
  onAdjustCurrentForward: () => void;
  onSetStart: () => void;
  onSetEnd: () => void;
  onAdjustStartBackward: () => void;
  onAdjustStartForward: () => void;
  onAdjustEndBackward: () => void;
  onAdjustEndForward: () => void;
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
  private nowAdjustBackwardBtn!: HTMLButtonElement;
  private nowAdjustForwardBtn!: HTMLButtonElement;
  private aAdjustBackwardBtn!: HTMLButtonElement;
  private aAdjustForwardBtn!: HTMLButtonElement;
  private bAdjustBackwardBtn!: HTMLButtonElement;
  private bAdjustForwardBtn!: HTMLButtonElement;
  private helperEl!: HTMLDivElement;
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
  private hasPlayedEntrance = false;

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
        this.initializePosition();
        this.hasInitializedPosition = true;
      });
    }

    window.addEventListener("resize", this.handleWindowResize);
  }

  update(nextState: Partial<PanelState>): void {
    this.state = { ...this.state, ...nextState };
    this.render();

    if (this.hasInitializedPosition) {
      this.clampToViewport(false);
    }
  }

  setTheme(themeMode: ThemeMode): void {
    this.themeMode = themeMode;
    this.applyTheme();
  }

  private createRoot(): HTMLDivElement {
    const existing = document.getElementById(EXTENSION_ROOT_ID) as HTMLDivElement | null;
    if (existing) return existing;

    const el = document.createElement("div");
    el.id = EXTENSION_ROOT_ID;
    return el;
  }

  private applyTheme(): void {
    this.root.dataset.theme = this.themeMode;
  }

  private buildAdjustButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "looplock-mini-adjust-btn";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      onClick();
    });
    return btn;
  }

  private buildMetricCard(
    labelText: string,
    extraClassName = ""
  ): {
    card: HTMLDivElement;
    valueEl: HTMLSpanElement;
    leftSlot: HTMLDivElement;
    rightSlot: HTMLDivElement;
  } {
    const card = document.createElement("div");
    card.className = `looplock-metric-card ${extraClassName}`.trim();

    const label = document.createElement("div");
    label.className = "looplock-metric-label";
    label.textContent = labelText;

    const contentRow = document.createElement("div");
    contentRow.className = "looplock-metric-content-row";

    const leftSlot = document.createElement("div");
    leftSlot.className = "looplock-metric-control-slot left";

    const valueWrap = document.createElement("div");
    valueWrap.className = "looplock-metric-value";

    const valueEl = document.createElement("span");
    valueWrap.appendChild(valueEl);

    const rightSlot = document.createElement("div");
    rightSlot.className = "looplock-metric-control-slot right";

    contentRow.appendChild(leftSlot);
    contentRow.appendChild(valueWrap);
    contentRow.appendChild(rightSlot);

    card.appendChild(label);
    card.appendChild(contentRow);

    return { card, valueEl, leftSlot, rightSlot };
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

    const nowMetric = this.buildMetricCard("Now", "looplock-now-card");
    this.nowCardEl = nowMetric.card;
    this.nowValueEl = nowMetric.valueEl;

    this.nowAdjustBackwardBtn = this.buildAdjustButton("-0.5", () => {
      this.handlers.onAdjustCurrentBackward();
    });
    this.nowAdjustBackwardBtn.title = "Now -0.5s";

    this.nowAdjustForwardBtn = this.buildAdjustButton("+0.5", () => {
      this.handlers.onAdjustCurrentForward();
    });
    this.nowAdjustForwardBtn.title = "Now +0.5s";

    nowMetric.leftSlot.appendChild(this.nowAdjustBackwardBtn);
    nowMetric.rightSlot.appendChild(this.nowAdjustForwardBtn);

    const aMetric = this.buildMetricCard("A");
    this.aCardEl = aMetric.card;
    this.aValueEl = aMetric.valueEl;

    this.aAdjustBackwardBtn = this.buildAdjustButton("-0.5", () => {
      this.handlers.onAdjustStartBackward();
    });
    this.aAdjustBackwardBtn.title = "A -0.5s";

    this.aAdjustForwardBtn = this.buildAdjustButton("+0.5", () => {
      this.handlers.onAdjustStartForward();
    });
    this.aAdjustForwardBtn.title = "A +0.5s";

    aMetric.leftSlot.appendChild(this.aAdjustBackwardBtn);
    aMetric.rightSlot.appendChild(this.aAdjustForwardBtn);

    const bMetric = this.buildMetricCard("B");
    this.bCardEl = bMetric.card;
    this.bValueEl = bMetric.valueEl;

    this.bAdjustBackwardBtn = this.buildAdjustButton("-0.5", () => {
      this.handlers.onAdjustEndBackward();
    });
    this.bAdjustBackwardBtn.title = "B -0.5s";

    this.bAdjustForwardBtn = this.buildAdjustButton("+0.5", () => {
      this.handlers.onAdjustEndForward();
    });
    this.bAdjustForwardBtn.title = "B +0.5s";

    bMetric.leftSlot.appendChild(this.bAdjustBackwardBtn);
    bMetric.rightSlot.appendChild(this.bAdjustForwardBtn);

    metricsGrid.appendChild(this.nowCardEl);
    metricsGrid.appendChild(this.aCardEl);
    metricsGrid.appendChild(this.bCardEl);

    this.helperEl = document.createElement("div");
    this.helperEl.className = "looplock-helper";

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
    this.bodyEl.appendChild(this.helperEl);
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

    this.applyPosition({ left: nextLeft, top: nextTop });
  };

  private handleDragEnd = (): void => {
    if (this.isDragging) {
      void this.handlers.onPositionChange(this.getCurrentPosition());
    }

    this.isDragging = false;
    document.removeEventListener("mousemove", this.handleDragMove);
    document.removeEventListener("mouseup", this.handleDragEnd);
  };

  private handleWindowResize = (): void => {
    this.clampToViewport(true);
  };

  private initializePosition(): void {
    const savedPosition = this.handlers.getInitialPosition();

    if (savedPosition) {
      this.applyPosition(savedPosition);
      this.clampToViewport(false);
      return;
    }

    this.setInitialPosition();
  }

  private applyPosition(position: PanelPosition): void {
    this.root.style.left = `${position.left}px`;
    this.root.style.top = `${position.top}px`;
    this.root.style.right = "auto";
    this.root.style.bottom = "auto";
  }

  private getCurrentPosition(): PanelPosition {
    const rect = this.panelEl.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top
    };
  }

  private setInitialPosition(): void {
    const panelWidth = this.panelEl.offsetWidth || 224;
    const panelHeight = this.panelEl.offsetHeight || 196;
    const margin = 16;

    const left = Math.max(margin, window.innerWidth - panelWidth - margin);
    const top = Math.max(margin, window.innerHeight - panelHeight - margin);

    this.applyPosition({ left, top });
  }

  private clampToViewport(emitPositionChange: boolean): void {
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

    const changed = nextLeft !== rect.left || nextTop !== rect.top;

    this.applyPosition({
      left: nextLeft,
      top: nextTop
    });

    if (changed && emitPositionChange) {
      void this.handlers.onPositionChange({
        left: nextLeft,
        top: nextTop
      });
    }
  }

  private playEntranceIfNeeded(): void {
    if (this.hasPlayedEntrance) return;

    this.hasPlayedEntrance = true;
    this.panelEl.classList.remove("looplock-panel-enter");

    requestAnimationFrame(() => {
      this.panelEl.classList.add("looplock-panel-enter");
    });
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

    const hasStart = startTime !== null;
    const hasEnd = endTime !== null;
    const hasAnyRange = hasStart || hasEnd || enabled;
    const hasValidRange = hasStart && hasEnd && endTime > startTime;
    const canAdjustCurrent = mediaDetected;
    const canAdjustStart = mediaDetected && hasStart;
    const canAdjustEnd = mediaDetected && hasEnd;

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

    this.setStartBtn.disabled = !mediaDetected;
    this.setEndBtn.disabled = !mediaDetected;
    this.nowAdjustBackwardBtn.disabled = !canAdjustCurrent;
    this.nowAdjustForwardBtn.disabled = !canAdjustCurrent;
    this.aAdjustBackwardBtn.disabled = !canAdjustStart;
    this.aAdjustForwardBtn.disabled = !canAdjustStart;
    this.bAdjustBackwardBtn.disabled = !canAdjustEnd;
    this.bAdjustForwardBtn.disabled = !canAdjustEnd;
    this.toggleLoopBtn.disabled = !enabled && !hasValidRange;
    this.clearBtn.disabled = !hasAnyRange;

    if (collapsed) {
      this.bodyEl.style.display = "none";
    } else {
      this.bodyEl.style.display = "";
    }

    if (errorMessage) {
      this.errorEl.style.display = "";
      this.errorEl.textContent = errorMessage;
      this.helperEl.style.display = "none";
      this.helperEl.textContent = "";
    } else {
      this.errorEl.style.display = "none";
      this.errorEl.textContent = "";

      this.helperEl.style.display = "";
      if (!mediaDetected) {
        this.helperEl.textContent = "Waiting for media...";
      } else if (!hasStart && !hasEnd) {
        this.helperEl.textContent = "Set A, then set B.";
      } else if (hasStart && !hasEnd) {
        this.helperEl.textContent = "A is set. Now choose B.";
      } else if (!hasStart && hasEnd) {
        this.helperEl.textContent = "B is set. Choose A to complete the range.";
      } else if (enabled) {
        this.helperEl.textContent = "Looping A → B.";
      } else {
        this.helperEl.textContent = "Ready to loop.";
      }
    }

    this.playEntranceIfNeeded();
  }
}