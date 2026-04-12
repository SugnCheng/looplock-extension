import { LOOP_CHECK_INTERVAL_MS, LOOP_EPSILON_SECONDS } from "../shared/constants";
import type { LoopRange } from "../shared/types";

type StateChangePayload = {
  range: LoopRange;
  errorMessage: string | null;
  currentTime: number;
};

export class LoopController {
  private media: HTMLMediaElement | null = null;
  private range: LoopRange = {
    startTime: null,
    endTime: null,
    enabled: false
  };

  private intervalId: number | null = null;
  private boundTimeUpdateHandler: (() => void) | null = null;
  private onStateChange?: (payload: StateChangePayload) => void;
  private errorMessage: string | null = null;

  constructor(onStateChange?: (payload: StateChangePayload) => void) {
    this.onStateChange = onStateChange;
  }

  attachMedia(media: HTMLMediaElement | null): void {
    this.detachMediaListeners();
    this.stopInternalLoop();

    this.media = media;
    this.errorMessage = null;

    if (this.media) {
      this.boundTimeUpdateHandler = () => {
        this.checkLoopBoundary();
        this.emitChange();
      };
      this.media.addEventListener("timeupdate", this.boundTimeUpdateHandler);
    }

    if (this.range.enabled && this.media) {
      this.startInternalLoop();
    }

    this.emitChange();
  }

  getMedia(): HTMLMediaElement | null {
    return this.media;
  }

  getRange(): LoopRange {
    return { ...this.range };
  }

  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  getCurrentTime(): number {
    return this.media?.currentTime ?? 0;
  }

  setRange(range: Partial<LoopRange>): void {
    this.range = { ...this.range, ...range };

    if (!this.validateRange(false)) {
      this.range.enabled = false;
      this.stopInternalLoop();
    }

    this.emitChange();
  }

  setStartFromCurrentTime(): void {
    if (!this.media) {
      this.errorMessage = "No video detected yet.";
      this.emitChange();
      return;
    }

    this.range.startTime = this.media.currentTime;
    this.errorMessage = null;

    if (this.range.endTime !== null && this.range.endTime <= this.range.startTime) {
      this.range.enabled = false;
      this.stopInternalLoop();
      this.errorMessage = "B must be later than A.";
    }

    this.emitChange();
  }

  setEndFromCurrentTime(): void {
    if (!this.media) {
      this.errorMessage = "No video detected yet.";
      this.emitChange();
      return;
    }

    this.range.endTime = this.media.currentTime;
    this.errorMessage = null;

    if (this.range.startTime !== null && this.range.endTime <= this.range.startTime) {
      this.range.enabled = false;
      this.stopInternalLoop();
      this.errorMessage = "B must be later than A.";
    }

    this.emitChange();
  }

  toggleEnabled(): void {
    const nextEnabled = !this.range.enabled;

    if (nextEnabled) {
      const valid = this.validateRange(true);
      if (!valid) {
        this.emitChange();
        return;
      }

      if (this.media && this.range.startTime !== null) {
        this.media.currentTime = this.range.startTime;
      }

      this.range.enabled = true;
      this.startInternalLoop();
    } else {
      this.range.enabled = false;
      this.stopInternalLoop();
      this.errorMessage = null;
    }

    this.emitChange();
  }

  clear(): void {
    this.range = {
      startTime: null,
      endTime: null,
      enabled: false
    };
    this.errorMessage = null;
    this.stopInternalLoop();
    this.emitChange();
  }

  private validateRange(setError: boolean): boolean {
    const { startTime, endTime } = this.range;

    if (!this.media) {
      if (setError) this.errorMessage = "No video detected yet.";
      return false;
    }

    if (startTime === null || endTime === null) {
      if (setError) this.errorMessage = "Set both A and B before turning loop on.";
      return false;
    }

    if (startTime < 0) {
      if (setError) this.errorMessage = "A cannot be earlier than the start of the video.";
      return false;
    }

    if (endTime <= startTime) {
      if (setError) this.errorMessage = "B must be later than A.";
      return false;
    }

    this.errorMessage = null;
    return true;
  }

  private startInternalLoop(): void {
    if (!this.media || this.intervalId !== null) return;

    this.intervalId = window.setInterval(() => {
      this.checkLoopBoundary();
    }, LOOP_CHECK_INTERVAL_MS);
  }

  private stopInternalLoop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private checkLoopBoundary(): void {
    if (!this.media || !this.range.enabled) return;

    const { startTime, endTime } = this.range;
    if (startTime === null || endTime === null) return;

    const currentTime = this.media.currentTime;

    if (currentTime >= endTime - LOOP_EPSILON_SECONDS) {
      this.media.currentTime = startTime;

      if (this.media.paused) {
        void this.media.play().catch(() => {});
      }
    }
  }

  private detachMediaListeners(): void {
    if (this.media && this.boundTimeUpdateHandler) {
      this.media.removeEventListener("timeupdate", this.boundTimeUpdateHandler);
    }
    this.boundTimeUpdateHandler = null;
  }

  private emitChange(): void {
    this.onStateChange?.({
      range: this.getRange(),
      errorMessage: this.getErrorMessage(),
      currentTime: this.getCurrentTime()
    });
  }
}