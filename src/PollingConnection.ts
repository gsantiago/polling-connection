import { EventEmitter } from "./EventEmitter";

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

  private intervalTimerId: NodeJS.Timer;
  private timeoutTimerId: NodeJS.Timer;
  private trackingTimerId: NodeJS.Timer;

  private passedSeconds: number;
  private timeoutInSeconds: number;

  private abortController: AbortController;

  constructor(options: PollingOptions<Payload>) {
    super();

    this.options = {
      ...PollingConnection.defaults,
      ...options,
    };

    this.timeoutInSeconds = this.options.timeout / 1000;
  }

  start() {
    this.abortController = new AbortController();
    this.passedSeconds = 0;

    this.emit("start", {
      passed: this.passedSeconds,
      remaining: this.timeoutInSeconds,
    });

    this.startTimeoutTimer();
    this.trackTimer();

    this.executeTask();
  }

  close() {
    this.abortController.abort();
    this.clearTimers();
    this.emit("close", undefined);
  }

  destroy() {
    this.close();
    this.removeAllEventListeners();
  }

  private isAborted() {
    return this.abortController.signal.aborted;
  }

  private isActive() {
    return !this.isAborted();
  }

  private startTimeoutTimer() {
    this.timeoutTimerId = setInterval(
      () => this.handleTimeout(),
      this.options.timeout
    );
  }

  private trackTimer() {
    this.trackingTimerId = setTimeout(() => {
      this.passedSeconds += 1;

      if (this.isActive() && this.passedSeconds <= this.timeoutInSeconds) {
        this.emit("second", {
          passed: this.passedSeconds,
          remaining: this.timeoutInSeconds - this.passedSeconds,
        });

        this.trackTimer();
      }
    }, 1000);
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
    if (this.isAborted()) {
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
