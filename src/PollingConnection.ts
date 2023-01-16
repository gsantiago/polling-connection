import { EventEmitter, TrackingTime } from "./EventEmitter";

type PollingStatus = "inactive" | "active";

export interface TaskOptions<Payload> {
  done: (data: Payload) => void;
  signal: AbortSignal;
}

export interface PollingOptions<Payload> {
  task: (options: TaskOptions<Payload>) => void;
  interval?: number;
  timeout?: number;
}

export class PollingConnection<Payload> extends EventEmitter<Payload> {
  static defaults: Required<Omit<PollingOptions<void>, "task">> = {
    interval: 3000,
    timeout: 30000,
  };

  private options: Required<PollingOptions<Payload>>;

  private status: PollingStatus = "inactive";

  private intervalTimerId: NodeJS.Timer;
  private timeoutTimerId: NodeJS.Timer;
  private trackingTimerId: NodeJS.Timer;

  private trackingTime: TrackingTime;

  private timeoutInSeconds: number;

  private abortController: AbortController;

  constructor(options: PollingOptions<Payload>) {
    super();

    this.options = {
      ...PollingConnection.defaults,
      ...options,
    };

    this.timeoutInSeconds = this.options.timeout / 1000;

    this.trackingTime = {
      passed: 0,
      remaining: this.timeoutInSeconds,
    };
  }

  start() {
    this.status = "active";

    this.abortController = new AbortController();

    this.trackingTime = {
      passed: 0,
      remaining: this.timeoutInSeconds,
    };

    this.emit("start", this.trackingTime);

    this.startTimeoutTimer();
    this.trackTimer();

    this.executeTask();
  }

  close() {
    if (this.isActive()) {
      this.status = "inactive";
      this.abortController.abort();
      this.clearTimers();
      this.emit("close", undefined);
    }
  }

  destroy() {
    this.close();
    this.removeAllEventListeners();
  }

  private isInactive() {
    return this.status === "inactive";
  }

  private isActive() {
    return this.status === "active";
  }

  private startTimeoutTimer() {
    this.timeoutTimerId = setInterval(
      () => this.handleTimeout(),
      this.options.timeout
    );
  }

  private trackTimer() {
    this.trackingTimerId = setTimeout(() => {
      const passedSeconds = this.trackingTime.passed + 1;

      if (this.isActive()) {
        this.updateTrackingTime(passedSeconds);
        this.trackTimer();
      }
    }, 1000);
  }

  private updateTrackingTime(passedSeconds: number) {
    this.trackingTime = {
      passed: passedSeconds,
      remaining: this.timeoutInSeconds - passedSeconds,
    };

    this.emit("second", this.trackingTime);
  }

  private handleTimeout() {
    this.emit("timeout", undefined);
    this.close();
  }

  private clearTimers() {
    clearInterval(this.timeoutTimerId);
    clearTimeout(this.intervalTimerId);
    clearTimeout(this.trackingTimerId);
  }

  private async executeTask() {
    if (this.isInactive()) {
      return;
    }

    try {
      await this.options.task({
        done: (data) => this.handleDone(data),
        signal: this.abortController.signal,
      });
    } catch (error) {
      this.handleError(error);
    }

    if (this.isActive()) {
      this.intervalTimerId = setTimeout(() => {
        this.executeTask();
      }, this.options.interval);
    }
  }

  private handleDone(payload: Payload) {
    if (this.isActive()) {
      this.emit("success", payload);
      this.close();
    }
  }

  private handleError(error: unknown) {
    if (this.isActive()) {
      this.emit("error", error);
    }
  }
}

export function polling<Payload = unknown>(options: PollingOptions<Payload>) {
  return new PollingConnection<Payload>(options);
}
