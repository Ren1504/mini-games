"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { HandLettered } from "@/components/sketch/HandLettered";
import { SketchButton } from "@/components/sketch/SketchButton";
import { cn } from "@/lib/cn";
import type { ConnectionStatus } from "./ConnectionDot";

/** Screens and notices shared by every online game room. */

export function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      {children}
    </div>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="py-24 text-center font-note text-3xl text-sketch"
    >
      {text}
    </p>
  );
}

/** How long to wait before saying the game server can't be reached. */
const UNREACHABLE_AFTER_MS = 6000;

/**
 * "Joining the room…", but if nothing arrives within a few seconds and
 * the socket isn't connected, say so plainly instead of spinning forever.
 */
export function Joining({ status }: { status: ConnectionStatus }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), UNREACHABLE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (!slow) return <Loading text="Joining the room…" />;
  if (status === "connected") return <Loading text="Still joining…" />;
  return (
    <Centered>
      <HandLettered
        as="h1"
        text="Can't reach the game server"
        seed="unreachable"
        className="font-hand text-4xl sm:text-5xl"
      />
      <p className="max-w-md text-xl" role="alert">
        {status === "offline"
          ? "You seem to be offline. Check your internet connection."
          : "The game server isn't answering. It keeps retrying in the background."}
      </p>
      <p className="max-w-md font-note text-xl text-sketch">
        Running it on your own computer? Make sure <code>npm run dev:all</code>{" "}
        is running (it starts the game server on port 1999).
      </p>
      <SketchButton
        seed="unreachable-retry"
        filled
        color="blue"
        onClick={() => window.location.reload()}
      >
        Try again
      </SketchButton>
    </Centered>
  );
}

/** "Join room" in hand lettering, the code itself in the clear code font. */
export function JoinHeading({ code }: { code: string }) {
  return (
    <h1 className="flex flex-col items-center gap-2">
      <HandLettered
        as="span"
        text="Join room"
        seed="join-room"
        className="font-hand text-5xl"
      />
      <span
        className="font-code text-4xl font-bold tracking-[0.15em] text-graphite"
        aria-label={code.split("").join(" ")}
      >
        {code}
      </span>
    </h1>
  );
}

/** Something to show briefly; `at` makes each one distinct. */
export type Notice = { message: string; at: number };

/** A sticky note at the bottom for 4s: rejected actions, or room notices. */
export function Toast({
  item,
  role,
  className,
}: {
  item: Notice | null;
  role: "alert" | "status";
  className?: string;
}) {
  const [visible, setVisible] = useState<Notice | null>(null);
  const [lastShown, setLastShown] = useState<number | null>(null);
  if (item && item.at !== lastShown) {
    setLastShown(item.at);
    setVisible(item);
  }
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(null), 4000);
    return () => window.clearTimeout(t);
  }, [visible]);
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4",
        className,
      )}
    >
      <AnimatePresence>
        {visible && (
          <motion.p
            key={visible.at}
            className="sticky-note px-5 py-3 font-hand text-xl text-[#2b2b2b]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {visible.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
