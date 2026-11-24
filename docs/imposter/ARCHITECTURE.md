# Imposter: architecture

Real-time social-deduction game inside Doodle Arcade. Everyone gets the
same secret word except one imposter, who only gets the category and a
vague clue. Players give one typed hint each, discuss out loud (or on their
own call), then vote.

## Pieces

```
 Browser (Next.js, Vercel)                      Cloudflare (free plan)
┌─────────────────────────────┐   WebSocket   ┌────────────────────────────────┐
│ /games/imposter/play        │◀────────────▶│ /party Worker (PartyServer)     │
│   Host / Join screen        │  partysocket  │  routePartykitRequest()         │
│ /games/imposter/room/[code] │               │   /parties/imposter-room/<CODE> │
│   lobby → round screens     │               │            │                    │
│                             │               │            ▼                    │
│ imports src/shared/*        │               │ ImposterRoom Durable Object     │
│  (protocol, config, types)  │               │  one per room code, SQLite      │
│ NEVER the word bank         │               │  game-machine reducer (pure)    │
└─────────────────────────────┘               │  alarms drive every timer       │
                                              │  word bank (server-only import) │
                                              └────────────────────────────────┘
```

- **One Durable Object per room**, addressed by its 5-character code
  (`idFromName(code)`). It holds the full authoritative `RoomState`
  (`src/shared/model.ts`) and saves it to storage on every change, so a
  hibernated or evicted object wakes up exactly where it was.
- **WebSocket Hibernation** is on (`static options = { hibernate: true }`).
  Per-connection data (seat id, rate-limit counters) lives in
  `connection.setState()`, which survives hibernation.
- **The rules are a pure reducer** (`src/shared/game-machine.ts`,
  step b): `(state, event, ctx) → { state, effects }`, with no I/O. The
  Durable Object is a thin adapter: it turns WebSocket frames and alarms into
  events, runs the reducer, persists, broadcasts and sets the next alarm.
  The same reducer powers the 5-player simulated tests.

## Phases

```
LOBBY ──START (host, ≥3 connected)──▶ REVEAL (20s)
REVEAL ──timer──▶ HINTS (20s per player, random order, 1 round)
HINTS  ──last hint / timeouts──▶ DISCUSSION (150s; skip unlocks after 30s)
DISCUSSION ──timer, or every connected player skips──▶ VOTING (30s)
VOTING ──timer, or every connected player locked──▶ RESULT
RESULT ──PLAY_AGAIN (host)──▶ LOBBY ──START──▶ next round
any round phase ──imposter gone >10s──▶ RESULT (IMPOSTER_FLED)
any round phase ──<3 connected──▶ RESULT (TOO_FEW_PLAYERS)
```

Outcome: the imposter **alone** has the most votes → **CAUGHT** (crewmates
win). Not top-voted, or tied at the top → **ESCAPED**. Unvoted players
abstain. No self-votes. Disconnected players are left out of the skip and
vote denominators.

## Timers

- All durations live in `TIMINGS` (`src/shared/config.ts`).
- The server stores `phaseEndsAt` (server clock, ms) and sets a Durable
  Object **alarm** for it (`ctx.storage.setAlarm`). No `setTimeout`, so timers
  survive hibernation. One alarm slot is enough: the room always schedules
  the earliest of {phase end, reconnect-grace expiry, empty-room cleanup}.
- Clients render countdowns from `phaseEndsAt`, corrected by a clock
  offset measured with 5 PING/PONG round trips on connect (median), so every
  screen agrees within ±250 ms.

## Privacy

| Data                      | Who receives it                                  |
| ------------------------- | ------------------------------------------------ |
| Secret word + category    | Each crewmate, on their own connection (`YOU`)   |
| Imposter's clue           | Everyone dealt in (`YOU`), and in the RESULT     |
| "IMPOSTER" + category     | The imposter only (`YOU`)                        |
| Imposter id               | Nobody until RESULT                              |
| Who voted for whom        | Nobody, ever: only per-player tallies in RESULT  |
| Upcoming hint order       | Nobody: only whose turn it is now                |
| Session token             | Its owner only                                   |
| Everything else (`STATE`) | Broadcast, validated against `publicStateSchema` |

`publicStateSchema` is `.strict()`: a test proves that a state containing
the word, the imposter id, vote targets, a token or a role fails
validation. The word bank (`src/data/imposter-words.ts`) is imported only by
the `/party` worker, never by Next.js code.

## Identity and reconnection

- On first join the server issues a seat id (public) and a session token
  (secret). The client keeps the token in `localStorage` (try/catch),
  per room code.
- Reconnect = `JOIN` with the token → same seat, same role, same card. The
  imposter is never reassigned.
- A dropped player shows as "reconnecting…" and keeps their seat for 10 s
  (`RECONNECT_GRACE_MS`). After that they have left: in the lobby the seat
  is released; mid-round they are marked `left`, their vote is dropped,
  nobody can vote for them and their token can't reclaim the seat until the
  next lobby. Clients show "Ann left".
- A disconnected active hinter is skipped immediately. An imposter gone
  past the grace period ends the round (IMPOSTER_FLED); fewer than 3
  players left ends it as TOO_FEW_PLAYERS. Otherwise the round continues.
- A host gone past the grace period hands host to the earliest-joined
  player still here ("You're the host now").
- Two tabs: the newest connection takes the seat and the old one gets
  `ERROR REPLACED`.
- Joining is only possible in the lobby. Opening an invite link mid-round
  shows "game already in progress" (`ERROR IN_PROGRESS`). Players reclaiming
  their own seat with their token can come back within the grace period.

## Validation and abuse

Every client frame goes through `parseClientMessage` (zod, ≤ 2 KB). The
reducer then rejects anything in the wrong phase, out of turn, duplicated,
host-only from a non-host, or after the deadline. Rate limit: 20 messages
per 5 s per connection. Hints are ≤ 3 words and ≤ 30 characters, and the
server rejects hints that contain the secret word. No profanity filter and
no kick feature (by request).

## Code layout

```
src/shared/          shared by site + worker (relative imports, zod only)
  config.ts          TIMINGS, LIMITS, room-code alphabet, avatars
  model.ts           authoritative RoomState types (server-side secrets)
  protocol.ts        zod schemas for every message, clock-offset helper
  game-machine.ts    pure reducer (step b)
src/data/imposter-words.ts   200+ words (step c, server-only)
party/               Cloudflare Worker package (step b)
  wrangler.jsonc     DO binding + new_sqlite_classes migration
  src/index.ts       routePartykitRequest + ImposterRoom (PartyServer)
src/app/games/imposter/room/[code]/   room page (step d)
src/games/imposter/  client UI + socket hook (step d)
```
