/**
 * Helpers shared by every game room on this server (Imposter, Chess…).
 */
import type { Connection } from "partyserver";
import { LIMITS } from "../../src/shared/config";

/** Per-connection data; survives hibernation (max 2 KB). */
export type ConnState = {
  seatId: string | null;
  hits: readonly number[];
  strikes: number;
};

export const FRESH: ConnState = { seatId: null, hits: [], strikes: 0 };

/**
 * Sends a frame unless the socket is already closing/closed (a client can
 * vanish mid-broadcast, and frames can still be queued after we close a
 * flooding connection). Never throws.
 */
export function sendRaw(conn: Connection, frame: string) {
  if (conn.readyState !== WebSocket.OPEN) return;
  try {
    conn.send(frame);
  } catch {
    // The socket closed between the check and the send: nothing to do.
  }
}

/** Public seat id: short and safe to show. */
export const newSeatId = () =>
  `p_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

/** Secret session token: 64 hex characters from the crypto RNG. */
export const newToken = () =>
  `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");

/**
 * Rate limit: RATE_MAX messages per RATE_WINDOW_MS; 3 strikes → closed.
 * Returns false when this message must be dropped (the caller has already
 * been told why via `onLimited`).
 */
export function allowMessage(
  conn: Connection<ConnState>,
  now: number,
  onLimited: () => void,
): boolean {
  const state = conn.state ?? FRESH;
  // Closed for flooding: ignore whatever was still queued.
  if (state.strikes >= 3) return false;
  const hits = [
    ...state.hits.filter((t) => now - t < LIMITS.RATE_WINDOW_MS),
    now,
  ];
  if (hits.length > LIMITS.RATE_MAX) {
    const strikes = state.strikes + 1;
    conn.setState({ ...state, hits, strikes });
    onLimited();
    if (strikes >= 3) conn.close(4008, "Rate limited");
    return false;
  }
  conn.setState({ ...state, hits });
  return true;
}
