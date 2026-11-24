"use client";

import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import { LIMITS } from "@/shared/config";
import { clockOffset } from "@/shared/protocol";
import type { ConnectionStatus } from "./ConnectionDot";
import { PARTY_HOST, type Identity } from "./identity";

/** The four server frames every game room sends. */
export type GameServerMessage<State, You, Code extends string> =
  | { type: "STATE"; state: State }
  | { type: "YOU"; you: You }
  | { type: "PONG"; clientTime: number; serverTime: number }
  | { type: "ERROR"; code: Code; message: string };

export type RoomError<Code extends string> = {
  code: Code;
  message: string;
  at: number;
};

type Sample = { sent: number; received: number; serverTime: number };

export type GameRoomOptions<State, You, Code extends string, Join> = {
  code: string;
  identity: Identity | null;
  /** PartyServer party name, e.g. "imposter-room". */
  party: string;
  /** Validates a parsed frame (zod); null drops it. */
  parse: (data: unknown) => GameServerMessage<State, You, Code> | null;
  /** Errors that mean "you couldn't get a seat" (shown on the join screen). */
  joinErrors: ReadonlySet<Code>;
  /** The JOIN message for this game, with the stored token if any. */
  joinMessage: (identity: Identity, token: string | undefined) => Join;
  /** Remember the seat token so a refresh lands in the same seat. */
  saveToken: (code: string, token: string) => void;
};

/**
 * Connects to a game room's Durable Object and keeps a live copy of the
 * public state plus your own view. partysocket reconnects automatically;
 * on every (re)connect we JOIN again with the stored token, so a refresh
 * or a dropped connection lands you back in the same seat.
 */
export function useGameRoom<
  State extends { version: number; code: string },
  You extends { token: string },
  Code extends string,
  Join,
>({
  code,
  identity,
  party,
  parse,
  joinErrors,
  joinMessage,
  saveToken,
}: GameRoomOptions<State, You, Code, Join>) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [state, setState] = useState<State | null>(null);
  const [you, setYou] = useState<You | null>(null);
  const [joinError, setJoinError] = useState<RoomError<Code> | null>(null);
  const [lastError, setLastError] = useState<RoomError<Code> | null>(null);
  const [replaced, setReplaced] = useState(false);
  const [offset, setOffset] = useState(0);
  const socketRef = useRef<PartySocket | null>(null);
  const identityRef = useRef(identity);
  const tokenRef = useRef<string | undefined>(identity?.token);
  // Latest callbacks without re-opening the socket when they change.
  const opts = useRef({ parse, joinErrors, joinMessage, saveToken });
  useEffect(() => {
    opts.current = { parse, joinErrors, joinMessage, saveToken };
  });

  useEffect(() => {
    identityRef.current = identity;
    if (identity?.token) tokenRef.current = identity.token;
  }, [identity]);

  const sendRaw = useCallback((message: unknown) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(message));
  }, []);

  const join = useCallback(() => {
    const id = identityRef.current;
    if (!id) return;
    sendRaw(opts.current.joinMessage(id, tokenRef.current));
  }, [sendRaw]);

  const hasIdentity = identity !== null;

  useEffect(() => {
    if (!hasIdentity) return;
    const socket = new PartySocket({ host: PARTY_HOST, party, room: code });
    socketRef.current = socket;
    let samples: Sample[] = [];
    let pingTimers: number[] = [];

    const onOpen = () => {
      setStatus("connected");
      join();
      // Clock sync: a few round trips, median offset (see clockOffset).
      samples = [];
      pingTimers.forEach((t) => window.clearTimeout(t));
      pingTimers = Array.from({ length: LIMITS.CLOCK_SYNC_PINGS }, (_, i) =>
        window.setTimeout(
          () => sendRaw({ type: "PING", clientTime: Date.now() }),
          i * 150,
        ),
      );
    };
    const onClose = (e: CloseEvent) => {
      if (e.code === 4001) {
        // Another tab took this seat; stop reconnecting here.
        setReplaced(true);
        socket.close();
        return;
      }
      setStatus(navigator.onLine ? "reconnecting" : "offline");
    };
    const onMessage = (e: MessageEvent) => {
      let data: unknown;
      try {
        data = JSON.parse(String(e.data));
      } catch {
        return;
      }
      const msg = opts.current.parse(data);
      if (!msg) return;
      switch (msg.type) {
        case "STATE":
          setState((prev) =>
            prev &&
            prev.version > msg.state.version &&
            prev.code === msg.state.code
              ? prev
              : msg.state,
          );
          setJoinError(null);
          break;
        case "YOU":
          setYou(msg.you);
          tokenRef.current = msg.you.token;
          opts.current.saveToken(code, msg.you.token);
          break;
        case "PONG": {
          samples.push({
            sent: msg.clientTime,
            received: Date.now(),
            serverTime: msg.serverTime,
          });
          setOffset(clockOffset(samples));
          break;
        }
        case "ERROR": {
          const err = { code: msg.code, message: msg.message, at: Date.now() };
          if (msg.code === "REPLACED") setReplaced(true);
          else if (opts.current.joinErrors.has(msg.code)) setJoinError(err);
          else setLastError(err);
          break;
        }
      }
    };
    const onOffline = () => setStatus("offline");
    const onOnline = () =>
      setStatus(
        socket.readyState === WebSocket.OPEN ? "connected" : "reconnecting",
      );

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      pingTimers.forEach((t) => window.clearTimeout(t));
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      socket.close();
      socketRef.current = null;
    };
  }, [code, hasIdentity, join, party, sendRaw]);

  /** Retry joining, e.g. with a new name/doodle after a clash. */
  const retryJoin = useCallback(
    (next?: Identity) => {
      if (next) identityRef.current = next;
      setJoinError(null);
      join();
    },
    [join],
  );

  return {
    status,
    state,
    you,
    joinError,
    lastError,
    replaced,
    /** Add to Date.now() to get server time. */
    offset,
    send: sendRaw,
    retryJoin,
  };
}

/** Milliseconds left until `endsAt` (server clock), ticking ~10×/s. */
export function useCountdown(
  endsAt: number | null,
  offset: number,
): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return endsAt === null ? null : Math.max(0, endsAt - (now + offset));
}
