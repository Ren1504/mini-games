"use client";

import { useId, useState, type FormEvent } from "react";
import { SketchBox } from "@/components/sketch/SketchBox";
import { SketchButton } from "@/components/sketch/SketchButton";
import {
  LIMITS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type AvatarId,
} from "@/shared/config";
import { nameSchema, roomCodeSchema } from "@/shared/protocol";
import type { Identity } from "../identity";

type Props = {
  mode: "host" | "join";
  /** Joining through an invite link: the code is already known. */
  fixedCode?: string;
  /** Last name used (and doodle, sent as a preference). */
  initial?: { name: string; avatar?: AvatarId } | null;
  /** Server-side problem to show (name taken, room full, …). */
  error?: string | null;
  submitLabel: string;
  onSubmit: (identity: Identity, code: string | null) => void;
};

const codeFilter = new RegExp(`[^${ROOM_CODE_ALPHABET}]`, "g");

/**
 * Name (+ max players for hosts, + room code for joiners). Doodles are
 * picked in the lobby; the last one used is sent along as a preference.
 */
export function IdentityForm({
  mode,
  fixedCode,
  initial,
  error,
  submitLabel,
  onSubmit,
}: Props) {
  const ids = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [maxPlayers, setMaxPlayers] = useState<number>(LIMITS.MAX_PLAYERS);
  const [code, setCode] = useState(fixedCode ?? "");
  const [touched, setTouched] = useState(false);

  const nameCheck = nameSchema.safeParse(name);
  const codeCheck =
    mode === "join" && !fixedCode ? roomCodeSchema.safeParse(code) : null;
  const nameError =
    touched && !nameCheck.success ? nameCheck.error.issues[0]?.message : null;
  const codeError =
    touched && codeCheck && !codeCheck.success
      ? "Codes are 5 letters/numbers, like K7QFM"
      : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!nameCheck.success || (codeCheck && !codeCheck.success)) return;
    onSubmit(
      {
        name: nameCheck.data,
        mode,
        ...(initial?.avatar ? { avatar: initial.avatar } : {}),
        ...(mode === "host" ? { maxPlayers } : {}),
      },
      fixedCode ?? (codeCheck?.success ? codeCheck.data : null),
    );
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex w-full max-w-xl flex-col gap-6"
    >
      {mode === "join" && !fixedCode && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-code`} className="font-hand text-2xl">
            Room code
          </label>
          <SketchBox
            seed="imposter-code-input"
            data-text-field
            strokeWidth={2.2}
            className="px-4"
          >
            <input
              id={`${ids}-code`}
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(codeFilter, "")
                    .slice(0, ROOM_CODE_LENGTH),
                )
              }
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(codeError)}
              aria-describedby={codeError ? `${ids}-code-err` : undefined}
              placeholder="K7QFM"
              className="w-full bg-transparent py-3 font-code text-3xl font-bold tracking-[0.3em] text-graphite uppercase outline-none placeholder:text-sketch/50"
            />
          </SketchBox>
          {codeError && (
            <p id={`${ids}-code-err`} className="text-lg text-crayon-red">
              {codeError}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={`${ids}-name`} className="font-hand text-2xl">
          Your name
        </label>
        <SketchBox
          seed="imposter-name-input"
          data-text-field
          strokeWidth={2.2}
          className="px-4"
        >
          <input
            id={`${ids}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            maxLength={32}
            autoComplete="nickname"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `${ids}-name-err` : undefined}
            placeholder="e.g. Pencil Pete"
            className="w-full bg-transparent py-3 font-body text-xl text-graphite outline-none placeholder:text-sketch/60"
          />
        </SketchBox>
        {nameError && (
          <p id={`${ids}-name-err`} className="text-lg text-crayon-red">
            {nameError}
          </p>
        )}
      </div>

      {mode === "host" && (
        <div className="flex flex-wrap items-center gap-4">
          <span id={`${ids}-max`} className="font-hand text-2xl">
            Max players
          </span>
          <div
            role="group"
            aria-labelledby={`${ids}-max`}
            className="flex items-center gap-3"
          >
            <button
              type="button"
              aria-label="Fewer players"
              disabled={maxPlayers <= LIMITS.MIN_PLAYERS}
              onClick={() =>
                setMaxPlayers((m) => Math.max(LIMITS.MIN_PLAYERS, m - 1))
              }
              className="grid size-11 place-items-center font-hand text-3xl disabled:opacity-30"
            >
              −
            </button>
            <output
              aria-live="polite"
              className="w-10 text-center font-hand text-3xl"
            >
              {maxPlayers}
            </output>
            <button
              type="button"
              aria-label="More players"
              disabled={maxPlayers >= LIMITS.MAX_PLAYERS}
              onClick={() =>
                setMaxPlayers((m) => Math.min(LIMITS.MAX_PLAYERS, m + 1))
              }
              className="grid size-11 place-items-center font-hand text-3xl disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="font-note text-2xl text-crayon-red">
          {error}
        </p>
      )}

      <div>
        <SketchButton
          seed={`imposter-submit-${mode}`}
          type="submit"
          filled
          color={mode === "host" ? "orange" : "blue"}
          size="lg"
        >
          {submitLabel}
        </SketchButton>
      </div>
    </form>
  );
}
