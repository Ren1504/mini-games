"use client";

import { useCallback } from "react";
import { roomIdentity, type Identity } from "@/components/room/identity";
import {
  useGameRoom,
  type GameServerMessage,
  type RoomError as GameRoomError,
} from "@/components/room/useGameRoom";
import { CHESS_PARTY_NAME } from "@/shared/chess/config";
import {
  chessServerMessageSchema,
  type ChessClientMessage,
  type ChessErrorCode,
  type ChessPrivateView,
  type ChessPublicState,
} from "@/shared/chess/protocol";

/** Chess rooms' saved names, doodles and seat tokens. */
export const chessIdentity = roomIdentity("chess");

const JOIN_ERRORS: ReadonlySet<ChessErrorCode> = new Set([
  "ROOM_NOT_FOUND",
  "CODE_IN_USE",
  "ROOM_FULL",
  "NAME_TAKEN",
]);

export type ChessRoomError = GameRoomError<ChessErrorCode>;

const parse = (data: unknown) => {
  const r = chessServerMessageSchema.safeParse(data);
  return r.success
    ? (r.data as GameServerMessage<
        ChessPublicState,
        ChessPrivateView,
        ChessErrorCode
      >)
    : null;
};

const joinMessage = (
  id: Identity,
  token: string | undefined,
): ChessClientMessage => ({
  type: "JOIN",
  mode: id.mode,
  name: id.name,
  ...(id.avatar ? { avatar: id.avatar } : {}),
  ...(token ? { token } : {}),
});

/** Live connection to a chess room (see useGameRoom). */
export function useChessRoom(code: string, identity: Identity | null) {
  const room = useGameRoom({
    code,
    identity,
    party: CHESS_PARTY_NAME,
    parse,
    joinErrors: JOIN_ERRORS,
    joinMessage,
    saveToken: chessIdentity.saveToken,
  });
  const { send: sendAny } = room;
  /** Typed send: only Chess messages. */
  const send = useCallback(
    (message: ChessClientMessage) => sendAny(message),
    [sendAny],
  );
  return { ...room, send };
}

export type ChessRoomApi = ReturnType<typeof useChessRoom>;
