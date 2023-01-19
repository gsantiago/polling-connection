import { EventMap } from "./EventMap";

type Receivers<Payload, K extends keyof EventMap<Payload>> = {
  event: K;
  listener: EventMap<Payload>[K];
}[];

export abstract class EventEmitter<Payload> {
  private receivers: Receivers<Payload, keyof EventMap<Payload>> = [];

  on<K extends keyof EventMap<Payload>>(
    event: K,
    listener: EventMap<Payload>[K]
  ) {
    this.receivers.push({ event, listener });

    return () => {
      this.receivers = this.receivers.filter(
        (receiver) => receiver.listener !== listener
      );
    };
  }

  protected emit<K extends keyof EventMap<Payload>>(
    event: K,
    ...args: Parameters<EventMap<Payload>[K]>
  ) {
    const listeners = this.receivers.filter((r) => r.event === event);
    listeners.forEach(({ listener }) => listener.apply(this, args));
  }

  removeAllEventListeners() {
    this.receivers = [];
  }
}
