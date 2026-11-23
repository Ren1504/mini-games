# Imposter

A real-time party game for 3–10 players inside Doodle Arcade. Everyone gets
the same secret word except one **imposter**, who only gets the category and
a vague clue. Each player types one hint, the group talks it over (out loud
or on a call), then everyone votes. Catch the imposter and the crewmates
win; otherwise the imposter does.

- Site: Next.js (this repo), deployable to Vercel's free plan.
- Game server: `party/`, a PartyServer Worker with one Durable Object per
  room, deployable to Cloudflare's free plan.
- How it works inside: [ARCHITECTURE.md](ARCHITECTURE.md).

## Run it locally

```bash
npm install
npm run party:install   # the game server's own packages
npm run dev:all         # site on :3000 + game server on :1999
```

Open <http://localhost:3000/games/imposter/play>, press **HOST A ROOM**, then
invite players with the room code or the **copy invite** link.

### Playing several players on one computer

Each browser profile remembers one player per room (in `localStorage`), so a
second tab in the **same** profile is treated as the same player opening a
second tab: it takes over the seat. To be several players at once, use:

- private/incognito windows (each one is a separate player), or
- different browsers or browser profiles, or
- phones on the same Wi-Fi (see below).

You need 3 players to start.

### Testing on phones (same Wi-Fi)

Both servers must listen on your network, and the site must know your
computer's address:

```bash
# 1. Find your computer's local IP, e.g. 192.168.0.105
# 2. Game server, reachable from the network:
npm --prefix party run dev -- --ip 0.0.0.0
# 3. Site, pointing at it (in a second terminal):
NEXT_PUBLIC_PARTY_HOST=192.168.0.105:1999 npx next dev -H 192.168.0.105
```

Then open `http://192.168.0.105:3000/games/imposter/play` on the phones.
Start the site with your IP (not `0.0.0.0`): the dev server only accepts
requests from the hostname it was started with, so phones would otherwise
be blocked.
(On Windows PowerShell set the variable with
`$env:NEXT_PUBLIC_PARTY_HOST="192.168.0.105:1999"` first.)

### Windows: stop the game server with Ctrl+C

Stop `wrangler dev` with **Ctrl+C** in its terminal. Killing it any other way
can leave `workerd` processes running in the background. They keep the local
room database locked and the next server freezes (rooms never load). If that
happens, end them:

```powershell
Get-Process workerd | Stop-Process -Force
```

## Deploy for free

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account and
a free [Vercel](https://vercel.com/signup) account.

### 1. Game server → Cloudflare Workers

```bash
cd party
npx wrangler login     # opens the browser once
npx wrangler deploy
```

`wrangler deploy` prints the server's address, like
`https://doodle-arcade-imposter.<your-subdomain>.workers.dev`. Check it in a
browser: `/health` should say "Imposter game server is running."

Durable Objects with SQLite storage (what `wrangler.jsonc` declares) are
included in the Workers free plan.

### 2. Site → Vercel

1. In Vercel, **Add New → Project** and import the GitHub repo. The defaults
   (Next.js, repo root) are right.
2. Add an environment variable:
   `NEXT_PUBLIC_PARTY_HOST` = `doodle-arcade-imposter.<your-subdomain>.workers.dev`
   (just the host: no `https://`, no trailing slash).
3. Deploy.

`NEXT_PUBLIC_` variables are built into the site, so **redeploy** the site
whenever you change it. The browser connects over `wss://` automatically.

### Updating

- Changed `party/` or anything in `src/shared/` or `src/data/imposter-words.ts`?
  Run `npx wrangler deploy` in `party/` again.
- Changed the site? Pushing to GitHub redeploys it on Vercel.

Timers, the protocol and the word bank are shared, so after changing them
deploy **both**.

## Add or change words

Words live in [`src/data/imposter-words.ts`](../../src/data/imposter-words.ts),
one row per word, grouped by category:

```ts
["Titanic", "Ocean", 1],   // [word, imposter clue, difficulty]
```

- **Word:** globally famous (recognisable in India, the USA, Brazil, Japan
  and Europe), nothing political, controversial or NSFW.
- **Clue:** 1–2 words, related but never a giveaway (`Titanic → "Ocean"`, not
  `"Ship that sank"`).
- **Difficulty:** 1 = everyone knows it, 2 = most people, 3 = a stretch.
  Rounds pick about 60% easy, 30% medium, 10% hard (`DIFFICULTY_WEIGHTS`).

Run `npm test`: it checks there are 200+ words, no duplicates, valid ids,
and that every clue is 1–2 words and doesn't contain its word. The word bank
is only imported by the game server, so it never reaches the browser.

## Change timers and limits

Everything tunable is in [`src/shared/config.ts`](../../src/shared/config.ts):

| Setting                                    | Default  | What it is                              |
| ------------------------------------------ | -------- | --------------------------------------- |
| `TIMINGS.REVEAL_MS`                        | 20 s     | Looking at your secret card             |
| `TIMINGS.HINT_MS`                          | 20 s     | Per player, to type a hint              |
| `TIMINGS.DISCUSSION_MS`                    | 150 s    | Talking it over                         |
| `TIMINGS.SKIP_UNLOCK_MS`                   | 30 s     | "Skip to voting" stays locked this long |
| `TIMINGS.VOTE_MS`                          | 30 s     | Voting                                  |
| `TIMINGS.RECONNECT_GRACE_MS`               | 30 s     | A dropped player keeps their seat       |
| `TIMINGS.EMPTY_ROOM_TTL_MS`                | 10 min   | Empty rooms are wiped after this        |
| `LIMITS.MIN_PLAYERS` / `MAX_PLAYERS`       | 3 / 10   | Room size                               |
| `LIMITS.HINT_MAX_WORDS` / `HINT_MAX_CHARS` | 3 / 30   | Hint length                             |
| `LIMITS.RATE_MAX` per `RATE_WINDOW_MS`     | 20 / 5 s | Messages per connection                 |

The server enforces these and the site displays them, so deploy both after
changing them. Animation timings for the game use the shared motion tokens in
`src/lib/motion.ts` (`tileSlide`, `sound.tick*` …).

## Tests

```bash
npm test             # rules, word bank, protocol, simulated 5-player games
npm run party:test   # the real Durable Object inside the Workers runtime
```

CI runs both on every push.
