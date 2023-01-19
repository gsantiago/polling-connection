export interface TrackingTime {
  passed: number;
  remaining: number;
}

export type EventMap<Payload> = {
  start: (trackingTime: TrackingTime) => void;
  success: (payload: Payload) => void;
  error: (err: unknown) => void;
  timeout: () => void;
  second: (trackingTime: TrackingTime) => void;
  close: () => void;
};
