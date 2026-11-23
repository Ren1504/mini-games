"use client";

import { useId, useState, type FormEvent } from "react";
import { DoodleAvatar, AVATAR_NAMES } from "@/components/sketch/DoodleAvatar";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { SketchBox } from "@/components/sketch/SketchBox";
import { SketchButton } from "@/components/sketch/SketchButton";
import { crayon, ink } from "@/lib/palette";
import {
  AVATARS,
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
  initial?: { name: string; avatar: AvatarId } | null;
  /** Server-side problem to show (name taken, room full, …). */
  error?: string | null;
  /** Doodles other players already picked (when known). */
  takenAvatars?: readonly AvatarId[];
  submitLabel: string;
  onSubmit: (identity: Identity, code: string | null) => void;
};

const codeFilter = new RegExp(`[^${ROOM_CODE_ALPHABET}]`, "g");

/** Name + doodle (+ max players for hosts, + room code for joiners). */
export function IdentityForm({
  mode,
  fixedCode,
  initial,
  error,
  takenAvatars = [],
  submitLabel,
  onSubmit,
}: Props) {
  const ids = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const firstFree =
    AVATARS.find((a) => !takenAvatars.includes(a)) ?? AVATARS[0];
  const [avatar, setAvatar] = useState<AvatarId>(
    initial && !takenAvatars.includes(initial.avatar)
      ? initial.avatar
      : firstFree,
  );
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
        avatar,
        mode,
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
              className="w-full bg-transparent py-3 font-hand text-3xl tracking-[0.35em] text-graphite uppercase outline-none placeholder:text-sketch/50"
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-hand text-2xl">Pick your doodle</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {AVATARS.map((a) => {
            const taken = takenAvatars.includes(a);
            const checked = a === avatar;
            return (
              <label
                key={a}
                data-focus-ring
                className={`relative grid place-items-center ${taken ? "cursor-not-allowed" : ""}`}
              >
                <input
                  type="radio"
                  name={`${ids}-avatar`}
                  value={a}
                  checked={checked}
                  disabled={taken}
                  onChange={() => setAvatar(a)}
                  className="peer sr-only"
                />
                <SketchBox
                  as="span"
                  seed={`pick-${a}`}
                  stroke={checked ? ink.graphite : ink.sketch}
                  strokeWidth={checked ? 2.6 : 1.3}
                  fill={checked ? crayon.yellow : undefined}
                  hachureGap={7}
                  fillWeight={1.2}
                  className="grid size-16 place-items-center sm:size-[4.5rem]"
                >
                  <DoodleAvatar avatar={a} size={46} faded={taken} />
                </SketchBox>
                <span className="sr-only">
                  {AVATAR_NAMES[a]}
                  {taken ? " (taken)" : ""}
                </span>
                {checked && (
                  <span className="absolute -top-1 -right-1" aria-hidden="true">
                    <DoodleIcon
                      name="check"
                      size={22}
                      color={crayon.red}
                      strokeWidth={2.8}
                    />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

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
