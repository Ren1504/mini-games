"use client";

import { useCallback } from "react";
import type { ConnectionStatus } from "@/components/room/ConnectionDot";
import {
  useGameRoom,
  type GameServerMessage,
  type RoomError as GameRoomError,
} from "@/components/room/useGameRoom";
import { PARTY_NAME } from "@/shared/config";
import {
  serverMessageSchema,
  type ClientMessage,
  type ErrorCode,
  type PrivateView,
  type PublicState,
} from "@/shared/protocol";
import { saveToken, type Identity } from "./identity";

export type { ConnectionStatus };
export { useCountdown } from "@/components/room/useGameRoom";

/** Errors that mean "you couldn't get a seat" (shown on the join screen). */
const JOIN_ERRORS: ReadonlySet<ErrorCode> = new Set([
  "ROOM_NOT_FOUND",
  "CODE_IN_USE",
  "ROOM_FULL",
  "IN_PROGRESS",
  "NAME_TAKEN",
]);

export type RoomError = GameRoomError<ErrorCode>;

const parse = (data: unknown) => {
  const r = serverMessageSchema.safeParse(data);
  return r.success
    ? (r.data as GameServerMessage<PublicState, PrivateView, ErrorCode>)
    : null;
};

const joinMessage = (
  id: Identity,
  token: string | undefined,
): ClientMessage => ({
  type: "JOIN",
  mode: id.mode,
  name: id.name,
  ...(id.avatar ? { avatar: id.avatar } : {}),
  ...(token ? { token } : {}),
  ...(id.mode === "host" && id.maxPlayers ? { maxPlayers: id.maxPlayers } : {}),
});

/** Imposter's live room connection (see useGameRoom). */
export function useImposterRoom(code: string, identity: Identity | null) {
  const room = useGameRoom({
    code,
    identity,
    party: PARTY_NAME,
    parse,
    joinErrors: JOIN_ERRORS,
    joinMessage,
    saveToken,
  });
  const { send: sendAny } = room;
  /** Typed send: only Imposter's own messages. */
  const send = useCallback(
    (message: ClientMessage) => sendAny(message),
    [sendAny],
  );
  return { ...room, send };
}
