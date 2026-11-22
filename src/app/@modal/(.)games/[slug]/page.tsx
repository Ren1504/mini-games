import { notFound } from "next/navigation";
import { GameModal } from "@/components/games/GameModal";
import { games, getGame } from "@/data/games";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

/** Intercepted /games/[slug]: opened from the hub, shown as a modal. */
export default async function GameModalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getGame(slug)) notFound();
  return <GameModal slug={slug} />;
}
