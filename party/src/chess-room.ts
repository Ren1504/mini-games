/**
 * Chess game server: one PartyServer Durable Object per room code, at
 * /parties/chess-room/<CODE>.
 *
 * Thin adapter around the pure reducer in src/shared/chess/machine.ts:
 *   WebSocket frame / alarm → event → reduceChess() → persist →
 *   broadcast → run effects → schedule the next alarm.
 *
 * Clocks, the 60s reconnect grace and empty-room cleanup are Durable
 * Object alarms (never setTimeout), so they survive hibernation.
 */
import { Server, type Connection, type WSMessage } from "partyserver";
import {
  chessNextWakeAt,
  initialChessState,
  reduceChess,
  toChessPrivateView,
  toChessPublicState,
  type ChessEvent,
  type ChessRoomState,
} from "../../src/shared/chess/machine";
import {
  parseChessClientMessage,
  type ChessServerMessage,
} from "../../src/shared/chess/protocol";
import {
  allowMessage,
  FRESH,
  newSeatId,
  newToken,
  sendRaw,
  type ConnState,
} from "./room-utils";

const STORAGE_KEY = "chess";

const send = (conn: Connection, message: ChessServerMessage) =>
  sendRaw(conn, JSON.stringify(message));

export class ChessRoom extends Server {
  static options = { hibernate: true };

  /** Authoritative state, reloaded from storage after every wake-up. */
  room!: ChessRoomState;

  async onStart() {
    this.room =
      (await this.ctx.storage.get<ChessRoomState>(STORAGE_KEY)) ??
      initialChessState(this.name);
  }

  onConnect(conn: Connection<ConnState>) {
    conn.setState({ ...FRESH });
  }

  async onMessage(conn: Connection<ConnState>, raw: WSMessage) {
    const allowed = allowMessage(conn, Date.now(), () =>
      send(conn, {
        type: "ERROR",
        code: "RATE_LIMITED",
        message: "Slow down a little!",
      }),
    );
    if (!allowed) return;

    const parsed = parseChessClientMessage(raw);
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
  private async apply(event: ChessEvent, origin?: Connection<ConnState>) {
    const prev = this.room;
    const { state, effects } = reduceChess(prev, event, {
      now: Date.now(),
      random: Math.random,
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

  /** Same STATE to every seated connection, plus each one's own YOU. */
  private broadcastState() {
    const frame = this.publicFrame();
    for (const conn of this.getConnections<ConnState>())
      this.sendStateTo(conn, frame);
  }

  private publicFrame() {
    return JSON.stringify({
      type: "STATE",
      state: toChessPublicState(this.room),
    } satisfies ChessServerMessage);
  }

  private sendStateTo(conn: Connection<ConnState>, frame = this.publicFrame()) {
    const seatId = conn.state?.seatId;
    if (!seatId) return; // not seated (yet): sees nothing
    const you = toChessPrivateView(this.room, seatId);
    if (!you) {
      // Seat was released (grace period over).
      conn.setState({ ...(conn.state ?? FRESH), seatId: null });
      return;
    }
    sendRaw(conn, frame);
    send(conn, { type: "YOU", you });
  }

  private async scheduleAlarm() {
    const at = chessNextWakeAt(this.room, Date.now());
    const current = await this.ctx.storage.getAlarm();
    if (at === null) {
      if (current !== null) await this.ctx.storage.deleteAlarm();
    } else if (current !== at) {
      await this.ctx.storage.setAlarm(at);
    }
  }
}
