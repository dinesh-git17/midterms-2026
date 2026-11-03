import { POLL_MS } from "./config";

/** Milliseconds until the next poll is due, 0 when it already is. Quick tab flips must not each fetch. */
export function dueIn(lastPoll: number, now: number, every = POLL_MS): number {
  return Math.max(0, lastPoll + every - now);
}
