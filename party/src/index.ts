/**
 * Imposter game server: one PartyServer Durable Object per room code.
 *
 * Thin adapter around the pure reducer in src/shared/game-machine.ts:
 *   WebSocket frame / alarm → event → reduce() → persist → broadcast →
 *   run effects → schedule the next alarm.
 *
 * Timers are Durable Object alarms (never setTimeout), so they survive
 * hibernation and eviction. State is saved to storage on every change.
 */
import {
  routePartykitRequest,
  Server,
  type Connection,
  type WSMessage,
} from "partyserver";
import { IMPOSTER_WORDS } from "../../src/data/imposter-words";
import { LIMITS } from "../../src/shared/config";
import {
  initialState,
  nextWakeAt,
  reduce,
  toPrivateView,
  toPublicState,
  type MachineEvent,
} from "../../src/shared/game-machine";
import type { RoomState } from "../../src/shared/model";
import {
  parseClientMessage,
  roomCodeSchema,
  type ServerMessage,
} from "../../src/shared/protocol";

type Env = { ImposterRoom: DurableObjectNamespace };

/** Per-connection data; survives hibernation (max 2 KB). */
type ConnState = {
  seatId: string | null;
  hits: readonly number[];
  strikes: number;
};

const STORAGE_KEY = "room";
const FRESH: ConnState = { seatId: null, hits: [], strikes: 0 };

/**
 * Sends a frame unless the socket is already closing/closed (a client can
 * vanish mid-broadcast, and frames can still be queued after we close a
 * flooding connection). Never throws.
 */
function sendRaw(conn: Connection, frame: string) {
  if (conn.readyState !== WebSocket.OPEN) return;
  try {
    conn.send(frame);
  } catch {
    // The socket closed between the check and the send: nothing to do.
  }
}

const send = (conn: Connection, message: ServerMessage) =>
  sendRaw(conn, JSON.stringify(message));

/** Public seat id: short and safe to show. */
const newSeatId = () =>
  `p_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
/** Secret session token: 64 hex characters from the crypto RNG. */
const newToken = () =>
  `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");

export class ImposterRoom extends Server<Env> {
  static options = { hibernate: true };

  /** Authoritative state, reloaded from storage after every wake-up. */
  room!: RoomState;

  async onStart() {
    this.room =
      (await this.ctx.storage.get<RoomState>(STORAGE_KEY)) ??
      initialState(this.name);
  }

  onConnect(conn: Connection<ConnState>) {
    conn.setState({ ...FRESH });
  }

  async onMessage(conn: Connection<ConnState>, raw: WSMessage) {
    const state = conn.state ?? FRESH;
    const now = Date.now();
    // Closed for flooding: ignore whatever was still queued.
    if (state.strikes >= 3) return;

    // Rate limit: RATE_MAX messages per RATE_WINDOW_MS; 3 strikes → closed.
    const hits = [
      ...state.hits.filter((t) => now - t < LIMITS.RATE_WINDOW_MS),
      now,
    ];
    if (hits.length > LIMITS.RATE_MAX) {
      const strikes = state.strikes + 1;
      conn.setState({ ...state, hits, strikes });
      send(conn, {
        type: "ERROR",
        code: "RATE_LIMITED",
        message: "Slow down a little!",
      });
      if (strikes >= 3) conn.close(4008, "Rate limited");
      return;
    }
    conn.setState({ ...state, hits });

    const parsed = parseClientMessage(raw);
    if (!parsed.ok) {
      send(conn, {
        type: "ERROR",
        code: "INVALID_MESSAGE",
        message: parsed.error,
      });
      return;
    }
    const message = parsed.message;

    if (message.type === "PING") {
      send(conn, {
        type: "PONG",
        clientTime: message.clientTime,
        serverTime: Date.now(),
      });
      return;
    }

    if (message.type === "JOIN") {
      await this.apply(
        {
          type: "JOIN",
          connId: conn.id,
          message,
          newSeatId: newSeatId(),
          newToken: newToken(),
        },
        conn,
      );
      return;
    }

    const seatId = conn.state?.seatId;
    if (!seatId) {
      send(conn, {
        type: "ERROR",
        code: "NOT_SEATED",
        message: "Join the room first.",
      });
      return;
    }
    await this.apply(
      { type: "INTENT", connId: conn.id, seatId, message },
      conn,
    );
  }

  async onClose(conn: Connection<ConnState>) {
    const seatId = conn.state?.seatId;
    if (!seatId) return;
    // Another tab may still hold the same seat.
    for (const other of this.getConnections<ConnState>()) {
      if (other.id !== conn.id && other.state?.seatId === seatId) return;
    }
    await this.apply({ type: "DISCONNECT", seatId });
  }

  async onAlarm() {
    await this.apply({ type: "TICK" });
  }

  /** Runs one event through the reducer and makes the result real. */
  private async apply(event: MachineEvent, origin?: Connection<ConnState>) {
    const prev = this.room;
    const { state, effects } = reduce(prev, event, {
      now: Date.now(),
      random: Math.random,
      words: IMPOSTER_WORDS,
    });

    let boundConn: Connection<ConnState> | null = null;
    for (const effect of effects) {
      if (effect.type === "ERROR") {
        if (origin?.id === effect.connId) {
          send(origin, {
            type: "ERROR",
            code: effect.code,
            message: effect.message,
          });
        }
      } else if (effect.type === "BIND") {
        if (origin?.id === effect.connId) {
          origin.setState({
            ...(origin.state ?? FRESH),
            seatId: effect.seatId,
          });
          boundConn = origin;
        }
      } else if (effect.type === "REPLACE_OTHERS") {
        for (const other of this.getConnections<ConnState>()) {
          if (
            other.id === effect.connId ||
            other.state?.seatId !== effect.seatId
          )
            continue;
          send(other, {
            type: "ERROR",
            code: "REPLACED",
            message: "You opened this room in another tab.",
          });
          // Unbind first so closing it doesn't count as a disconnect.
          other.setState({ ...(other.state ?? FRESH), seatId: null });
          other.close(4001, "Replaced by a newer connection");
        }
      } else if (effect.type === "CLEANUP") {
        // Empty for 10 minutes: forget the room entirely.
        this.room = state;
        await this.ctx.storage.deleteAll();
        await this.ctx.storage.deleteAlarm();
        return;
      }
    }

    if (state !== prev) {
      this.room = state;
      await this.ctx.storage.put(STORAGE_KEY, state);
      this.broadcastState();
    } else if (boundConn) {
      // Reclaiming a seat that never went offline (a second tab) changes
      // nothing to broadcast, but the new connection still needs a view.
      this.sendStateTo(boundConn);
    }
    await this.scheduleAlarm();
  }

  /** Public state to everyone; each private view only to its owner. */
  private broadcastState() {
    const publicFrame = this.publicFrame();
    for (const conn of this.getConnections<ConnState>())
      this.sendStateTo(conn, publicFrame);
  }

  private publicFrame() {
    return JSON.stringify({
      type: "STATE",
      state: toPublicState(this.room),
    } satisfies ServerMessage);
  }

  /** STATE + this connection's own YOU (nothing if it holds no seat). */
  private sendStateTo(
    conn: Connection<ConnState>,
    publicFrame = this.publicFrame(),
  ) {
    const seatId = conn.state?.seatId;
    if (!seatId) return; // not seated (yet): sees nothing
    const you = toPrivateView(this.room, seatId);
    if (!you) {
      // Seat was released (e.g. removed from the lobby).
      conn.setState({ ...(conn.state ?? FRESH), seatId: null });
      return;
    }
    sendRaw(conn, publicFrame);
    send(conn, { type: "YOU", you });
  }

  private async scheduleAlarm() {
    const at = nextWakeAt(this.room, Date.now());
    const current = await this.ctx.storage.getAlarm();
    if (at === null) {
      if (current !== null) await this.ctx.storage.deleteAlarm();
    } else if (current !== at) {
      await this.ctx.storage.setAlarm(at);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("Imposter game server is running.", { status: 200 });
    }
    return (
      (await routePartykitRequest(request, env, {
        onBeforeConnect: (_req, { name }) => {
          // Room names must be valid 5-character codes.
          if (
            !roomCodeSchema.safeParse(name).success ||
            name !== name.toUpperCase()
          ) {
            return new Response("Invalid room code", { status: 400 });
          }
        },
      })) || new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
