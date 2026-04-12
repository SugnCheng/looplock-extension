import { EXTENSION_ROOT_ID } from "../shared/constants";
import type { PanelState, ThemeMode, PanelPosition } from "../shared/types";
import {
  formatTime,
  createTimeEditorDraft,
  composeTimeEditorDraft,
  sanitizeDigits,
  type TimeEditorDraft
} from "./time-utils";

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
  onCommitStartInput: (valueSeconds: number) => boolean;
  onCommitEndInput: (valueSeconds: number) => boolean;
  canEditStartInput: () => boolean;
  canEditEndInput: () => boolean;
  onToggleLoop: () => void;
  onClear: () => void;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
}

type EditingField = "start" | "end" | null;
type SegmentKey = "hours" | "minutes" | "seconds" | "tenths";

type TimeEditorRefs = {
  wrapper: HTMLDivElement;
  hoursInput: HTMLInputElement;
  hoursSep: HTMLSpanElement;
  minutesInput: HTMLInputElement;
  middleSep: HTMLSpanElement;
  secondsInput: HTMLInputElement;
  decimalSep: HTMLSpanElement;
  tenthsInput: HTMLInputElement;
};

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

  private startEditorRefs!: TimeEditorRefs;
  private endEditorRefs!: TimeEditorRefs;

  private isDragging = false;
  private dragStartMouseX = 0;
  private dragStartMouseY = 0;
  private dragStartLeft = 0;
  private dragStartTop = 0;

  private hasInitializedPosition = false;
  private themeMode: ThemeMode = "dark";
  private hasPlayedEntrance = false;

  private editingField: EditingField = null;
  private startDraft: TimeEditorDraft = createTimeEditorDraft(null);
  private endDraft: TimeEditorDraft = createTimeEditorDraft(null);
  private pendingFocus: { field: "start" | "end"; segment: SegmentKey } | null = null;

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

    if (this.editingField === "start" && !this.handlers.canEditStartInput()) {
      this.cancelEditing();
    }

    if (this.editingField === "end" && !this.handlers.canEditEndInput()) {
      this.cancelEditing();
    }

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

  private createEditorSegmentInput(maxLength: number): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "looplock-time-segment-input";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = maxLength;
    return input;
  }

  private buildTimestampEditor(field: "start" | "end"): TimeEditorRefs {
    const wrapper = document.createElement("div");
    wrapper.className = "looplock-time-editor";

    const hoursInput = this.createEditorSegmentInput(3);
    hoursInput.classList.add("hours");

    const hoursSep = document.createElement("span");
    hoursSep.className = "looplock-time-separator hours-sep";
    hoursSep.textContent = ":";

    const minutesInput = this.createEditorSegmentInput(2);
    minutesInput.classList.add("minutes");

    const middleSep = document.createElement("span");
    middleSep.className = "looplock-time-separator middle-sep";
    middleSep.textContent = ":";

    const secondsInput = this.createEditorSegmentInput(2);
    secondsInput.classList.add("seconds");

    const decimalSep = document.createElement("span");
    decimalSep.className = "looplock-time-separator decimal-sep";
    decimalSep.textContent = ".";

    const tenthsInput = this.createEditorSegmentInput(1);
    tenthsInput.classList.add("tenths");

    wrapper.appendChild(hoursInput);
    wrapper.appendChild(hoursSep);
    wrapper.appendChild(minutesInput);
    wrapper.appendChild(middleSep);
    wrapper.appendChild(secondsInput);
    wrapper.appendChild(decimalSep);
    wrapper.appendChild(tenthsInput);

    this.bindEditorFieldEvents(field, wrapper, {
      hoursInput,
      minutesInput,
      secondsInput,
      tenthsInput
    });

    wrapper.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (this.editingField !== field) return;

      const segment = this.getSegmentFromClientX(field, event.clientX);
      this.focusSegment(field, segment);
    });

    wrapper.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    return {
      wrapper,
      hoursInput,
      hoursSep,
      minutesInput,
      middleSep,
      secondsInput,
      decimalSep,
      tenthsInput
    };
  }

  private buildMetricCard(
    labelText: string,
    extraClassName = ""
  ): {
    card: HTMLDivElement;
    valueEl: HTMLSpanElement;
    valueWrapEl: HTMLDivElement;
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

    const valueWrapEl = document.createElement("div");
    valueWrapEl.className = "looplock-metric-value";

    const valueEl = document.createElement("span");
    valueWrapEl.appendChild(valueEl);

    const rightSlot = document.createElement("div");
    rightSlot.className = "looplock-metric-control-slot right";

    contentRow.appendChild(leftSlot);
    contentRow.appendChild(valueWrapEl);
    contentRow.appendChild(rightSlot);

    card.appendChild(label);
    card.appendChild(contentRow);

    return { card, valueEl, valueWrapEl, leftSlot, rightSlot };
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

    this.startEditorRefs = this.buildTimestampEditor("start");
    aMetric.valueWrapEl.appendChild(this.startEditorRefs.wrapper);
    aMetric.valueWrapEl.addEventListener("click", (event) => {
      event.stopPropagation();

      if (this.editingField === "start") {
        return;
      }

      this.beginEditing("start");
    });

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

    this.endEditorRefs = this.buildTimestampEditor("end");
    bMetric.valueWrapEl.appendChild(this.endEditorRefs.wrapper);
    bMetric.valueWrapEl.addEventListener("click", (event) => {
      event.stopPropagation();

      if (this.editingField === "end") {
        return;
      }

      this.beginEditing("end");
    });

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

  private bindEditorFieldEvents(
    field: "start" | "end",
    wrapper: HTMLDivElement,
    inputs: {
      hoursInput: HTMLInputElement;
      minutesInput: HTMLInputElement;
      secondsInput: HTMLInputElement;
      tenthsInput: HTMLInputElement;
    }
  ): void {
    const orderedInputs: Array<{ key: SegmentKey; el: HTMLInputElement; max: number }> = [
      { key: "hours", el: inputs.hoursInput, max: 3 },
      { key: "minutes", el: inputs.minutesInput, max: 2 },
      { key: "seconds", el: inputs.secondsInput, max: 2 },
      { key: "tenths", el: inputs.tenthsInput, max: 1 }
    ];

    for (let i = 0; i < orderedInputs.length; i += 1) {
      const current = orderedInputs[i];
      const prev = orderedInputs[i - 1];
      const next = orderedInputs[i + 1];

      current.el.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });

      current.el.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      current.el.addEventListener("input", () => {
        current.el.value = sanitizeDigits(current.el.value, current.max);
        this.syncDraftFromInputs(field);

        if (
          current.key !== "hours" &&
          current.el.value.length >= current.max &&
          next &&
          this.shouldSegmentBeVisible(field, next.key)
        ) {
          next.el.focus();
          next.el.select();
        }
      });

      current.el.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.commitEditing(field);
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          this.cancelEditing();
          return;
        }

        if (
          event.key === "Backspace" &&
          current.el.selectionStart === 0 &&
          current.el.selectionEnd === 0 &&
          current.el.value.length === 0 &&
          prev &&
          this.shouldSegmentBeVisible(field, prev.key)
        ) {
          prev.el.focus();
          prev.el.select();
          return;
        }

        if (event.key === "ArrowLeft" && prev && this.shouldSegmentBeVisible(field, prev.key)) {
          if (current.el.selectionStart === 0 && current.el.selectionEnd === 0) {
            prev.el.focus();
            prev.el.select();
          }
          return;
        }

        if (event.key === "ArrowRight" && next && this.shouldSegmentBeVisible(field, next.key)) {
          if (
            current.el.selectionStart === current.el.value.length &&
            current.el.selectionEnd === current.el.value.length
          ) {
            next.el.focus();
            next.el.select();
          }
        }
      });
    }

    wrapper.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (
          (field === "start" && this.editingField !== "start") ||
          (field === "end" && this.editingField !== "end")
        ) {
          return;
        }

        const active = document.activeElement;
        if (active instanceof Node && wrapper.contains(active)) {
          return;
        }

        this.commitEditing(field);
      }, 0);
    });
  }

  private getVisibleSegments(field: "start" | "end"): SegmentKey[] {
    const draft = this.getDraft(field);

    if (draft.showHours) {
      return ["hours", "minutes", "seconds", "tenths"];
    }

    return ["minutes", "seconds", "tenths"];
  }

  private getSegmentInput(field: "start" | "end", segment: SegmentKey): HTMLInputElement {
    const refs = this.getEditorRefs(field);

    switch (segment) {
      case "hours":
        return refs.hoursInput;
      case "minutes":
        return refs.minutesInput;
      case "seconds":
        return refs.secondsInput;
      case "tenths":
        return refs.tenthsInput;
    }
  }

  private focusSegment(field: "start" | "end", segment: SegmentKey): void {
    const input = this.getSegmentInput(field, segment);
    input.focus();
    input.select();
  }

  private getSegmentFromClientX(field: "start" | "end", clientX: number): SegmentKey {
    const segments = this.getVisibleSegments(field);

    let bestSegment = segments[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const segment of segments) {
      const input = this.getSegmentInput(field, segment);
      const rect = input.getBoundingClientRect();

      if (clientX >= rect.left && clientX <= rect.right) {
        return segment;
      }

      const center = rect.left + rect.width / 2;
      const distance = Math.abs(clientX - center);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestSegment = segment;
      }
    }

    return bestSegment;
  }

  private getDraft(field: "start" | "end"): TimeEditorDraft {
    return field === "start" ? this.startDraft : this.endDraft;
  }

  private setDraft(field: "start" | "end", draft: TimeEditorDraft): void {
    if (field === "start") {
      this.startDraft = draft;
    } else {
      this.endDraft = draft;
    }
  }

  private getEditorRefs(field: "start" | "end"): TimeEditorRefs {
    return field === "start" ? this.startEditorRefs : this.endEditorRefs;
  }

  private shouldSegmentBeVisible(field: "start" | "end", key: SegmentKey): boolean {
    const draft = this.getDraft(field);
    if (key === "hours") return draft.showHours;
    return true;
  }

  private syncDraftFromInputs(field: "start" | "end"): void {
    const refs = this.getEditorRefs(field);
    const draft = this.getDraft(field);

    this.setDraft(field, {
      ...draft,
      hours: sanitizeDigits(refs.hoursInput.value, 3),
      minutes: sanitizeDigits(refs.minutesInput.value, 2),
      seconds: sanitizeDigits(refs.secondsInput.value, 2),
      tenths: sanitizeDigits(refs.tenthsInput.value, 1)
    });
  }

  private shouldUseHourFormat(sourceValue: number | null): boolean {
    const currentTime = Number.isFinite(this.state.currentTime) ? this.state.currentTime : 0;
    const startTime = this.state.startTime ?? 0;
    const endTime = this.state.endTime ?? 0;
    const source = sourceValue ?? 0;

    return Math.max(currentTime, startTime, endTime, source) >= 3600;
  }

  private applyDraftToInputs(field: "start" | "end"): void {
    const refs = this.getEditorRefs(field);
    const draft = this.getDraft(field);

    refs.wrapper.classList.toggle("has-hours", draft.showHours);
    refs.wrapper.classList.toggle("no-hours", !draft.showHours);

    refs.hoursInput.value = draft.hours;
    refs.minutesInput.value = draft.minutes;
    refs.secondsInput.value = draft.seconds;
    refs.tenthsInput.value = draft.tenths;
  }

  private beginEditing(field: "start" | "end"): void {
    const canEdit =
      field === "start" ? this.handlers.canEditStartInput() : this.handlers.canEditEndInput();

    if (!canEdit) return;

    const sourceValue = field === "start" ? this.state.startTime : this.state.endTime;
    const draft = createTimeEditorDraft(sourceValue);
    draft.showHours = this.shouldUseHourFormat(sourceValue);

    if (draft.showHours && !draft.hours) {
      draft.hours = "0";
    }

    this.setDraft(field, draft);
    this.editingField = field;
    this.pendingFocus = {
      field,
      segment: draft.showHours ? "hours" : "minutes"
    };

    this.render();
  }

  private commitEditing(field: "start" | "end"): void {
    const draft = this.getDraft(field);
    const parsed = composeTimeEditorDraft(draft);

    if (parsed === null) {
      this.pendingFocus = { field, segment: draft.showHours ? "hours" : "minutes" };
      this.render();
      return;
    }

    const success =
      field === "start"
        ? this.handlers.onCommitStartInput(parsed)
        : this.handlers.onCommitEndInput(parsed);

    if (!success) {
      this.pendingFocus = { field, segment: draft.showHours ? "hours" : "minutes" };
      this.render();
      return;
    }

    this.editingField = null;
    this.pendingFocus = null;
    this.render();
  }

  private cancelEditing(): void {
    this.editingField = null;
    this.pendingFocus = null;
    this.render();
  }

  private focusPendingSegment(): void {
    if (!this.pendingFocus) return;

    const { field, segment } = this.pendingFocus;
    const refs = this.getEditorRefs(field);

    const target =
      segment === "hours"
        ? refs.hoursInput
        : segment === "minutes"
          ? refs.minutesInput
          : segment === "seconds"
            ? refs.secondsInput
            : refs.tenthsInput;

    this.pendingFocus = null;
    requestAnimationFrame(() => {
      target.focus();
      target.select();
    });
  }

  private bindDragEvents(): void {
    this.headerEl.addEventListener("mousedown", (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button") || target?.closest("input")) return;

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
    const canEditStart = this.handlers.canEditStartInput();
    const canEditEnd = this.handlers.canEditEndInput();

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

    this.aCardEl.classList.toggle("looplock-manual-editable", canEditStart);
    this.bCardEl.classList.toggle("looplock-manual-editable", canEditEnd);

    this.aValueEl.style.visibility = this.editingField === "start" ? "hidden" : "visible";
    this.bValueEl.style.visibility = this.editingField === "end" ? "hidden" : "visible";

    this.startEditorRefs.wrapper.classList.toggle("is-active", this.editingField === "start");
    this.endEditorRefs.wrapper.classList.toggle("is-active", this.editingField === "end");

    if (this.editingField === "start") {
      this.applyDraftToInputs("start");
    }

    if (this.editingField === "end") {
      this.applyDraftToInputs("end");
    }

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
      } else if (enabled) {
        this.helperEl.textContent = "Turn loop off to edit A/B manually.";
      } else if (!hasStart && !hasEnd) {
        this.helperEl.textContent = "Set A, then set B. Click A/B time to edit digits.";
      } else if (hasStart && !hasEnd) {
        this.helperEl.textContent = "A is set. Click A to edit digits or set B.";
      } else if (!hasStart && hasEnd) {
        this.helperEl.textContent = "B is set. Click B to edit digits or set A.";
      } else {
        this.helperEl.textContent = "Ready to loop. Click A/B time to edit digits.";
      }
    }

    this.playEntranceIfNeeded();
    this.focusPendingSegment();
  }
}