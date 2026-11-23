/**
 * Integration test against the REAL Durable Object, inside workerd:
 * real WebSockets, real SQLite storage, real alarms, real eviction.
 */
import { env, evictDurableObject, runInDurableObject } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { RoomState } from "../../src/shared/model";
import type {
  ClientMessage,
  PrivateView,
  PublicState,
  ServerMessage,
} from "../../src/shared/protocol";

type Client = {
  ws: WebSocket;
  inbox: ServerMessage[];
  send: (m: ClientMessage) => void;
};

const BASE = "http://imposter.test/parties/imposter-room/";

async function connect(code: string): Promise<Client> {
  const res = await exports.default.fetch(BASE + code, {
    headers: { Upgrade: "websocket" },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket!;
  ws.accept();
  const inbox: ServerMessage[] = [];
  ws.addEventListener("message", (e) =>
    inbox.push(JSON.parse(String(e.data)) as ServerMessage),
  );
  return { ws, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}

/** Waits (up to 3s) for a message matching `match`. */
async function waitFor<T extends ServerMessage>(
  c: Client,
  match: (m: ServerMessage) => m is T,
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

const isYou = (
  m: ServerMessage,
): m is Extract<ServerMessage, { type: "YOU" }> => m.type === "YOU";
const isState = (
  m: ServerMessage,
): m is Extract<ServerMessage, { type: "STATE" }> => m.type === "STATE";
const isError = (
  m: ServerMessage,
): m is Extract<ServerMessage, { type: "ERROR" }> => m.type === "ERROR";

const you = async (c: Client): Promise<PrivateView> =>
  (await waitFor(c, isYou)).you;
async function stateWhere(
  c: Client,
  ok: (s: PublicState) => boolean,
): Promise<PublicState> {
  return (
    await waitFor(
      c,
      (m): m is Extract<ServerMessage, { type: "STATE" }> =>
        isState(m) && ok(m.state),
    )
  ).state;
}

const stub = (code: string) =>
  env.ImposterRoom.get(env.ImposterRoom.idFromName(code));

/** Host + two players seated and the round started. */
async function startedRoom(code: string) {
  const host = await connect(code);
  host.send({ type: "JOIN", mode: "host", name: "Host", avatar: "cat" });
  await you(host);
  const ann = await connect(code);
  ann.send({ type: "JOIN", mode: "join", name: "Ann", avatar: "frog" });
  const bob = await connect(code);
  bob.send({ type: "JOIN", mode: "join", name: "Bob", avatar: "robot" });
  await stateWhere(host, (s) => s.players.length === 3);
  host.send({ type: "START" });
  await stateWhere(host, (s) => s.phase === "REVEAL");
  return { host, ann, bob, all: [host, ann, bob] };
}

describe("worker routing", () => {
  it("serves a health check and rejects invalid room codes", async () => {
    expect(
      (await exports.default.fetch("http://imposter.test/health")).status,
    ).toBe(200);
    const bad = await exports.default.fetch(BASE + "AB0CD", {
      headers: { Upgrade: "websocket" },
    });
    expect(bad.status).toBe(400);
  });

  it("answers PING with server time", async () => {
    const c = await connect("PNG22");
    c.send({ type: "PING", clientTime: 123 });
    const pong = await waitFor(
      c,
      (m): m is Extract<ServerMessage, { type: "PONG" }> => m.type === "PONG",
    );
    expect(pong.clientTime).toBe(123);
    expect(pong.serverTime).toBeGreaterThan(0);
  });
});

describe("ImposterRoom Durable Object", () => {
  it("refuses to join a room that was never hosted", async () => {
    const c = await connect("NQPE7");
    c.send({ type: "JOIN", mode: "join", name: "Ann", avatar: "frog" });
    expect((await waitFor(c, isError)).code).toBe("ROOM_NOT_FOUND");
  });

  it("deals private cards over each player's own socket only", async () => {
    const { all } = await startedRoom("DEAL3");
    const views = await Promise.all(all.map(you));
    expect(views.filter((v) => v.role === "imposter")).toHaveLength(1);
    const crewWord = views.find((v) => v.card?.kind === "word")!.card;
    for (const [i, c] of all.entries()) {
      // Every YOU frame on this socket belongs to this player.
      for (const m of c.inbox)
        if (m.type === "YOU") expect(m.you.playerId).toBe(views[i].playerId);
      if (views[i].role === "imposter" && crewWord?.kind === "word") {
        expect(JSON.stringify(c.inbox)).not.toContain(`"${crewWord.word}"`);
      }
    }
  });

  it("persists state and schedules the phase alarm in storage", async () => {
    await startedRoom("ALRM4");
    const { saved, alarm } = await runInDurableObject(
      stub("ALRM4"),
      async (_instance, state) => ({
        saved: await state.storage.get<RoomState>("room"),
        alarm: await state.storage.getAlarm(),
      }),
    );
    expect(saved?.phase).toBe("REVEAL");
    expect(saved?.round?.secret.word).toBeTruthy(); // secrets stay server-side
    expect(alarm).toBe(saved?.phaseEndsAt);
  });

  it("restores a player's seat and role after the object is evicted", async () => {
    const code = "EVCT5";
    const { ann } = await startedRoom(code);
    const before = await you(ann);
    ann.ws.close();

    // Tear down the instance; only durable storage survives.
    await evictDurableObject(stub(code), { webSockets: "close" });

    const back = await connect(code);
    back.send({
      type: "JOIN",
      mode: "join",
      name: "Ann",
      avatar: "frog",
      token: before.token,
    });
    const after = await you(back);
    expect(after.playerId).toBe(before.playerId);
    expect(after.role).toBe(before.role);
    expect(after.card).toEqual(before.card);
    const state = await stateWhere(back, (s) => s.phase === "REVEAL");
    expect(state.round?.turnOrder).toHaveLength(3);
  });

  it("tells a late joiner the game is in progress", async () => {
    await startedRoom("LATE6");
    const late = await connect("LATE6");
    late.send({ type: "JOIN", mode: "join", name: "Late", avatar: "owl" });
    expect((await waitFor(late, isError)).code).toBe("IN_PROGRESS");
  });
});
