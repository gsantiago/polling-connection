export interface TrackingTime {
  passed: number;
  remaining: number;
}

type Events<Payload> = {
  start: TrackingTime;
  success: Payload;
  error: unknown;
  timeout: undefined;
  second: TrackingTime;
  close: undefined;
};

type EventListener<T> = (data: T) => void;

type Listeners<Payload> = {
  [K in keyof Events<Payload>]?: Array<EventListener<Events<Payload>[K]>>;
};

export abstract class EventEmitter<Payload> {
  private listeners: Listeners<Payload> = {};

  on<K extends keyof Events<Payload>>(
    event: K,
    listener: EventListener<Events<Payload>[K]>
  ) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event]!.push(listener);
  }

  protected emit<K extends keyof Events<Payload>>(
    event: K,
    data: Events<Payload>[K]
  ) {
    const listeners = this.listeners[event] ?? [];
    listeners.forEach((fn) => fn(data));
  }

  removeAllEventListeners() {
    this.listeners = {};
  }
}
