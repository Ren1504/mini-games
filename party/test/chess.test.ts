/**
 * ChessRoom against the REAL Durable Object, inside workerd: real
 * WebSockets, real storage, real alarms, real eviction.
 */
import { env, evictDurableObject, runInDurableObject } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { ChessRoomState } from "../../src/shared/chess/machine";
import type {
  ChessClientMessage,
  ChessPrivateView,
  ChessPublicState,
  ChessServerMessage,
} from "../../src/shared/chess/protocol";

type Client = {
  ws: WebSocket;
  inbox: ChessServerMessage[];
  send: (m: ChessClientMessage) => void;
};

const BASE = "http://chess.test/parties/chess-room/";

async function connect(code: string): Promise<Client> {
  const res = await exports.default.fetch(BASE + code, {
    headers: { Upgrade: "websocket" },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket!;
  ws.accept();
  const inbox: ChessServerMessage[] = [];
  ws.addEventListener("message", (e) =>
    inbox.push(JSON.parse(String(e.data)) as ChessServerMessage),
  );
  return { ws, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}

/** Waits (up to 3s) for a message matching `match`. */
async function waitFor<T extends ChessServerMessage>(
  c: Client,
  match: (m: ChessServerMessage) => m is T,
): Promise<T> {
  for (let i = 0; i < 150; i++) {
    const found = [...c.inbox].reverse().find(match);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(
    `timed out; inbox: ${JSON.stringify(c.inbox.map((m) => m.type))}`,
  );
}

type Of<K extends ChessServerMessage["type"]> = Extract<
  ChessServerMessage,
  { type: K }
>;
const isYou = (m: ChessServerMessage): m is Of<"YOU"> => m.type === "YOU";
const isError = (m: ChessServerMessage): m is Of<"ERROR"> => m.type === "ERROR";

const you = async (c: Client): Promise<ChessPrivateView> =>
  (await waitFor(c, isYou)).you;
async function stateWhere(
  c: Client,
  ok: (s: ChessPublicState) => boolean,
): Promise<ChessPublicState> {
  return (
    await waitFor(c, (m): m is Of<"STATE"> => m.type === "STATE" && ok(m.state))
  ).state;
}

const stub = (code: string) =>
  env.ChessRoom.get(env.ChessRoom.idFromName(code));

/** Host + guest seated and the game started; returns who is white. */
async function startedGame(code: string, minutes: 0 | 5 = 0) {
  const ann = await connect(code);
  ann.send({ type: "JOIN", mode: "host", name: "Ann", avatar: "cat" });
  const annView = await you(ann);
  const bob = await connect(code);
  bob.send({ type: "JOIN", mode: "join", name: "Bob", avatar: "dog" });
  await stateWhere(ann, (s) => s.players.length === 2);
  ann.send({ type: "SET_CLOCK", minutes });
  await stateWhere(ann, (s) => s.clockMinutes === minutes);
  ann.send({ type: "START" });
  const state = await stateWhere(bob, (s) => s.phase === "PLAYING");
  const annIsWhite = state.game!.whiteId === annView.playerId;
  return {
    ann,
    bob,
    white: annIsWhite ? ann : bob,
    black: annIsWhite ? bob : ann,
  };
}

describe("ChessRoom Durable Object", () => {
  it("is routed separately from Imposter rooms", async () => {
    const c = await connect("CHS22");
    c.send({ type: "JOIN", mode: "join", name: "Ann" });
    expect((await waitFor(c, isError)).code).toBe("ROOM_NOT_FOUND");
  });

  it("plays a whole game to checkmate and reports it to both players", async () => {
    const { white, black, ann, bob } = await startedGame("MATE3");
    const moves = ["f2f3", "e7e5", "g2g4", "d8h4"];
    for (const [i, uci] of moves.entries()) {
      const mover = i % 2 === 0 ? white : black;
      mover.send({ type: "MOVE", uci });
      await stateWhere(
        ann,
        (s) => (s.game?.moves.length ?? moves.length) >= i + 1,
      );
    }
    for (const c of [ann, bob]) {
      const end = await stateWhere(c, (s) => s.result !== null);
      expect(end.phase).toBe("LOBBY");
      expect(end.result).toMatchObject({
        outcome: "CHECKMATE",
        winner: "b",
        moves,
      });
    }
  });

  it("rejects illegal and out-of-turn moves with a reason", async () => {
    const { white, black } = await startedGame("RULE4");
    black.send({ type: "MOVE", uci: "e7e5" });
    expect((await waitFor(black, isError)).code).toBe("NOT_YOUR_TURN");
    white.send({ type: "MOVE", uci: "e2e5" });
    expect((await waitFor(white, isError)).code).toBe("ILLEGAL_MOVE");
  });

  it("schedules the first-move deadline as a storage alarm", async () => {
    await startedGame("CLKK5", 5);
    const { saved, alarm } = await runInDurableObject(
      stub("CLKK5"),
      async (_instance, state) => ({
        saved: await state.storage.get<ChessRoomState>("chess"),
        alarm: await state.storage.getAlarm(),
      }),
    );
    expect(saved?.game?.remaining).toEqual({ w: 300_000, b: 300_000 });
    // Clocks wait for White's first move; until then the alarm is the
    // 30-second first-move deadline.
    expect(alarm).toBe(saved!.game!.turnStartedAt + 30_000);
  });

  it("restores a seat and the game after the object is evicted", async () => {
    const code = "EVCT6";
    const { white, bob } = await startedGame(code);
    white.send({ type: "MOVE", uci: "e2e4" });
    const before = await you(bob);
    await stateWhere(bob, (s) => s.game?.moves.length === 1);
    bob.ws.close();

    await evictDurableObject(stub(code), { webSockets: "close" });

    const back = await connect(code);
    back.send({
      type: "JOIN",
      mode: "join",
      name: "Bob",
      token: before.token,
    });
    expect((await you(back)).playerId).toBe(before.playerId);
    const state = await stateWhere(back, (s) => s.phase === "PLAYING");
    expect(state.game?.moves).toEqual(["e2e4"]);
  });

  it("keeps a third person out", async () => {
    await startedGame("FULL7");
    const late = await connect("FULL7");
    late.send({ type: "JOIN", mode: "join", name: "Cid" });
    expect((await waitFor(late, isError)).code).toBe("ROOM_FULL");
  });
});
