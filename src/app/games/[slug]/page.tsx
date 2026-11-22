import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameDetail } from "@/components/games/GameDetail";
import { TornEdge } from "@/components/paper/TornEdge";
import { games, getGame } from "@/data/games";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[slug]">): Promise<Metadata> {
  const game = getGame((await params).slug);
  return game ? { title: game.title, description: game.description } : {};
}

export default async function GamePage({ params }: PageProps<"/games/[slug]">) {
  const { slug } = await params;
  if (!getGame(slug)) notFound();

  return (
    <main id="main" className="page-x flex-1 pt-10 sm:pt-14">
      <div className="mx-auto max-w-5xl">
        <TornEdge
          seed={slug}
          paperClassName="relative px-5 pt-14 pb-10 sm:px-10 sm:pt-16"
        >
          <GameDetail slug={slug} />
        </TornEdge>
      </div>
    </main>
  );
}
