"use client";

import { useState } from "react";
import { StickyNote } from "@/components/paper/StickyNote";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";

/**
 * Room code on a sticky note, with a "copy invite link" doodle button.
 * `roomPath` is the game's room route, e.g. "/games/imposter/room".
 */
export function RoomCodeNote({
  code,
  roomPath,
}: {
  code: string;
  roomPath: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${roomPath}/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  };
  return (
    <StickyNote rotate={-2} className="w-fit">
      <div className="-mx-2 -my-3 flex items-center gap-3">
        <div className="flex flex-col leading-none">
          <span className="font-note text-lg">room code</span>
          <span
            className="font-code text-3xl font-bold tracking-[0.15em]"
            aria-label={`Room code ${code.split("").join(" ")}`}
          >
            {code}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex min-h-11 items-center gap-1 rounded px-1 font-hand text-lg underline decoration-wavy underline-offset-4"
        >
          <DoodleIcon name={copied ? "check" : "link"} size={20} />
          {copied ? "copied!" : "copy invite"}
        </button>
      </div>
    </StickyNote>
  );
}
