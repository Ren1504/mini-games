import { TornEdge } from "./TornEdge";

/** Blank torn-out page shown for a moment while a game page streams in. */
export function PageFallback() {
  return (
    <TornEdge
      seed="fallback"
      paperClassName="grid min-h-[28rem] place-items-center px-6"
    >
      <p className="font-note text-3xl text-sketch" role="status">
        flipping pages…
      </p>
    </TornEdge>
  );
}
