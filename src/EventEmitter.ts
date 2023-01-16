export interface TrackingTime {
  passed: number;
  remaining: number;
}

type Events<Payload> = {
  start: (trackingTime: TrackingTime) => void;
  success: (payload: Payload) => void;
  error: (err: unknown) => void;
  timeout: () => void;
  second: (trackingTime: TrackingTime) => void;
  close: () => void;
};

type Listeners<Payload> = {
  [K in keyof Events<Payload>]?: Events<Payload>[K][];
};

export abstract class EventEmitter<Payload> {
  private listeners: Listeners<Payload> = {};

  on<K extends keyof Events<Payload>>(event: K, listener: Events<Payload>[K]) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event]!.push(listener);
  }

  protected emit<K extends keyof Events<Payload>>(
    event: K,
    ...args: Parameters<Events<Payload>[K]>
  ) {
    const listeners = this.listeners[event] ?? [];
    listeners.forEach((fn) => fn.apply(this, args));
  }

  removeAllEventListeners() {
    this.listeners = {};
  }
}
