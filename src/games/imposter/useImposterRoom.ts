"use client";

import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import { LIMITS, PARTY_NAME } from "@/shared/config";
import {
  clockOffset,
  serverMessageSchema,
  type ClientMessage,
  type ErrorCode,
  type PrivateView,
  type PublicState,
} from "@/shared/protocol";
import { PARTY_HOST, saveToken, type Identity } from "./identity";

import type { ConnectionStatus } from "@/components/room/ConnectionDot";

export type { ConnectionStatus };

/** Errors that mean "you couldn't get a seat" (shown on the join screen). */
const JOIN_ERRORS: ReadonlySet<ErrorCode> = new Set([
  "ROOM_NOT_FOUND",
  "CODE_IN_USE",
  "ROOM_FULL",
  "IN_PROGRESS",
  "NAME_TAKEN",
]);

export type RoomError = { code: ErrorCode; message: string; at: number };

type Sample = { sent: number; received: number; serverTime: number };

/**
 * Connects to a room's Durable Object and keeps a live copy of the public
 * state plus your private view. partysocket reconnects automatically; on
 * every (re)connect we JOIN again with the stored token, so a refresh or
 * a dropped connection lands you back in the same seat.
 */
export function useImposterRoom(code: string, identity: Identity | null) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [state, setState] = useState<PublicState | null>(null);
  const [you, setYou] = useState<PrivateView | null>(null);
  const [joinError, setJoinError] = useState<RoomError | null>(null);
  const [lastError, setLastError] = useState<RoomError | null>(null);
  const [replaced, setReplaced] = useState(false);
  const [offset, setOffset] = useState(0);
  const socketRef = useRef<PartySocket | null>(null);
  const identityRef = useRef(identity);
  const tokenRef = useRef<string | undefined>(identity?.token);

  useEffect(() => {
    identityRef.current = identity;
    if (identity?.token) tokenRef.current = identity.token;
  }, [identity]);

  const sendRaw = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(message));
  }, []);

  const join = useCallback(() => {
    const id = identityRef.current;
    if (!id) return;
    sendRaw({
      type: "JOIN",
      mode: id.mode,
      name: id.name,
      ...(id.avatar ? { avatar: id.avatar } : {}),
      ...(tokenRef.current ? { token: tokenRef.current } : {}),
      ...(id.mode === "host" && id.maxPlayers
        ? { maxPlayers: id.maxPlayers }
        : {}),
    });
  }, [sendRaw]);

  const hasIdentity = identity !== null;

  useEffect(() => {
    if (!hasIdentity) return;
    const socket = new PartySocket({
      host: PARTY_HOST,
      party: PARTY_NAME,
      room: code,
    });
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
      const parsed = serverMessageSchema.safeParse(data);
      if (!parsed.success) return;
      const msg = parsed.data;
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
          saveToken(code, msg.you.token);
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
          else if (JOIN_ERRORS.has(msg.code)) setJoinError(err);
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
  }, [code, hasIdentity, join, sendRaw]);

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
