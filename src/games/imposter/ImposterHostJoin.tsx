"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { HandLettered } from "@/components/sketch/HandLettered";
import { SketchButton } from "@/components/sketch/SketchButton";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, spring } from "@/lib/motion";
import {
  generateRoomCode,
  lastMeRaw,
  parseMe,
  saveIdentity,
  type Identity,
} from "./identity";
import { IdentityForm } from "./ui/IdentityForm";

const noop = () => () => {};

/**
 * /games/imposter/play: choose HOST or JOIN, then name + doodle.
 * Hosting generates a fresh room code; the room page then connects and
 * the server makes the first player the host.
 */
export function ImposterHostJoin() {
  const router = useRouter();
  const reduced = useReducedMotionSafe();
  const [mode, setMode] = useState<"host" | "join" | null>(null);
  // localStorage only exists in the browser: read it after hydration.
  const rememberedRaw = useSyncExternalStore(noop, lastMeRaw, () => null);
  const remembered = useMemo(() => parseMe(rememberedRaw), [rememberedRaw]);

  const go = (identity: Identity, code: string | null) => {
    const room = code ?? generateRoomCode();
    saveIdentity(room, identity);
    router.push(`/games/imposter/room/${room}`);
  };

  return (
    <div className="flex flex-col items-center gap-8 text-left">
      <div className="flex flex-col items-center gap-2 text-center">
        <HandLettered
          as="h1"
          text="Imposter"
          seed="imposter-title"
          className="font-hand text-6xl sm:text-7xl"
        />
        <p className="max-w-md font-note text-2xl text-sketch">
          Everyone gets the secret word, except one sneaky imposter. 3 to 10
          players.
        </p>
      </div>

      <div
        className="flex flex-wrap justify-center gap-4"
        role="group"
        aria-label="Host or join"
      >
        <SketchButton
          seed="imposter-host"
          filled={mode === "host"}
          color="orange"
          size="lg"
          onClick={() => setMode("host")}
          aria-pressed={mode === "host"}
        >
          HOST A ROOM
        </SketchButton>
        <SketchButton
          seed="imposter-join"
          filled={mode === "join"}
          color="blue"
          size="lg"
          onClick={() => setMode("join")}
          aria-pressed={mode === "join"}
        >
          JOIN A ROOM
        </SketchButton>
      </div>

      {mode && (
        <motion.div
          key={mode}
          className="flex w-full justify-center"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: duration.reduced } : spring}
        >
          <IdentityForm
            key={`${mode}-${remembered?.name ?? ""}`}
            mode={mode}
            initial={remembered}
            submitLabel={mode === "host" ? "Create room ▶" : "Join ▶"}
            onSubmit={go}
          />
        </motion.div>
      )}
    </div>
  );
}
