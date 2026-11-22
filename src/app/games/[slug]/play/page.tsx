import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ComingSoon } from "@/components/games/ComingSoon";
import { PageFallback } from "@/components/paper/PageFallback";
import { TornEdge } from "@/components/paper/TornEdge";
import { games, getGame } from "@/data/games";
import { playableGames } from "@/games/playable";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[slug]/play">): Promise<Metadata> {
  const game = getGame((await params).slug);
  return game ? { title: `Play ${game.title}` } : {};
}

/** Reads the slug inside Suspense so navigations into this page stay instant. */
async function Play({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();
  const Game = playableGames[slug];
  return (
    <TornEdge
      seed={`${slug}-play`}
      paperClassName={
        Game
          ? "px-4 pt-12 pb-10 sm:px-10"
          : "px-6 pt-14 pb-10 text-center sm:px-12"
      }
    >
      {Game ? <Game /> : <ComingSoon slug={slug} title={game.title} />}
      <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 font-hand text-xl">
        {/* Plain <a>: a full load shows the detail page, not the modal over this one. */}
        <a
          href={`/games/${slug}`}
          className="underline decoration-wavy decoration-2 underline-offset-4"
        >
          Read the rules
        </a>
        <Link
          href="/"
          className="underline decoration-wavy decoration-2 underline-offset-4"
        >
          Back to notebook
        </Link>
      </div>
    </TornEdge>
  );
}

export default function PlayPage({ params }: PageProps<"/games/[slug]/play">) {
  return (
    <main id="main" className="page-x flex-1 pt-10 sm:pt-14">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<PageFallback />}>
          <Play params={params} />
        </Suspense>
      </div>
    </main>
  );
}
