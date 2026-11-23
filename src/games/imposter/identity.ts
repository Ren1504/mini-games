/**
 * Who you are in a room, remembered in localStorage (wrapped in try/catch:
 * private windows and blocked storage just mean no reclaiming after a
 * refresh). The session token proves your seat to the server.
 */
import {
  AVATARS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type AvatarId,
} from "@/shared/config";

export type Identity = {
  name: string;
  avatar: AvatarId;
  mode: "host" | "join";
  maxPlayers?: number;
  /** Issued by the server on first join; reclaims the same seat later. */
  token?: string;
};

const roomKey = (code: string) => `doodle-arcade:imposter:room:${code}`;
const ME_KEY = "doodle-arcade:imposter:me";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the game still works, a refresh just means rejoining.
  }
}

const isAvatar = (a: unknown): a is AvatarId =>
  typeof a === "string" && (AVATARS as readonly string[]).includes(a);

export function loadIdentity(code: string): Identity | null {
  const id = read<Identity>(roomKey(code));
  if (!id || typeof id.name !== "string" || !isAvatar(id.avatar)) return null;
  if (id.mode !== "host" && id.mode !== "join") return null;
  return id;
}

export function saveIdentity(code: string, identity: Identity) {
  write(roomKey(code), identity);
  write(ME_KEY, { name: identity.name, avatar: identity.avatar });
}

export function saveToken(code: string, token: string) {
  const id = loadIdentity(code);
  if (id && id.token !== token) write(roomKey(code), { ...id, token });
}

/**
 * Last name and doodle used, as the raw stored string. Components read it
 * through useSyncExternalStore, which needs a stable snapshot (a string),
 * then parse it with parseMe() inside useMemo.
 */
export function lastMeRaw(): string | null {
  try {
    return window.localStorage.getItem(ME_KEY);
  } catch {
    return null;
  }
}

export function parseMe(
  raw: string | null,
): { name: string; avatar: AvatarId } | null {
  if (!raw) return null;
  try {
    const me = JSON.parse(raw) as { name?: unknown; avatar?: unknown };
    return typeof me.name === "string" && isAvatar(me.avatar)
      ? { name: me.name, avatar: me.avatar }
      : null;
  } catch {
    return null;
  }
}

/** 5 characters from the unambiguous alphabet (no 0/O/1/I). */
export function generateRoomCode(): string {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length],
  ).join("");
}

/** Where the game server lives: localhost:1999 in dev, workers.dev in prod. */
export const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTY_HOST ?? "localhost:1999";
