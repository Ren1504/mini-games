import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameModal } from "@/components/games/GameModal";
import { games, getGame } from "@/data/games";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

async function Modal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getGame(slug)) notFound();
  return <GameModal slug={slug} />;
}

/**
 * Intercepted /games/[slug]: opened from the hub, shown as a modal.
 * The slug is read inside Suspense so the navigation stays instant; the
 * data is static, so the empty fallback is never visible in practice.
 */
export default function GameModalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Modal params={params} />
    </Suspense>
  );
}
