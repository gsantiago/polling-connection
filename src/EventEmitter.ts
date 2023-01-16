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

type Receivers<Payload, K extends keyof Events<Payload>> = {
  event: K;
  listener: Events<Payload>[K];
}[];

export abstract class EventEmitter<Payload> {
  private receivers: Receivers<Payload, keyof Events<Payload>> = [];

  on<K extends keyof Events<Payload>>(event: K, listener: Events<Payload>[K]) {
    this.receivers.push({ event, listener });

    return () => {
      this.receivers = this.receivers.filter(
        (receiver) => receiver.listener !== listener
      );
    };
  }

  protected emit<K extends keyof Events<Payload>>(
    event: K,
    ...args: Parameters<Events<Payload>[K]>
  ) {
    const listeners = this.receivers.filter((r) => r.event === event);
    listeners.forEach(({ listener }) => listener.apply(this, args));
  }

  removeAllEventListeners() {
    this.receivers = [];
  }
}
