import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageFallback } from "@/components/paper/PageFallback";
import { TornEdge } from "@/components/paper/TornEdge";
import { ChessRoom } from "@/games/chess/room/ChessRoom";
import { roomCodeSchema } from "@/shared/protocol";

export const metadata: Metadata = {
  title: "Chess room",
  // Rooms are private, short-lived links: keep them out of search engines.
  robots: { index: false, follow: false },
};

/** Reads the code inside Suspense so navigations into the room stay instant. */
async function Room({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const parsed = roomCodeSchema.safeParse(code);
  if (!parsed.success) notFound();
  // Codes are case-insensitive: send lowercase links to the canonical URL.
  if (parsed.data !== code) redirect(`/games/chess/room/${parsed.data}`);
  return (
    <TornEdge
      seed={`chess-room-${code}`}
      paperClassName="px-2 pt-12 pb-10 sm:px-8"
    >
      <ChessRoom code={parsed.data} />
    </TornEdge>
  );
}

export default function ChessRoomPage({
  params,
}: PageProps<"/games/chess/room/[code]">) {
  return (
    <main id="main" className="page-x flex-1 pt-6 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <Suspense fallback={<PageFallback />}>
          <Room params={params} />
        </Suspense>
      </div>
    </main>
  );
}
