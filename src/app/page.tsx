import { FeaturedGame } from "@/components/games/FeaturedGame";
import { GameGrid } from "@/components/games/GameGrid";
import { CategoryTabs } from "@/components/layout/CategoryTabs";
import { Hero } from "@/components/layout/Hero";
import { HowToPlay } from "@/components/layout/HowToPlay";
import { MarginDoodles } from "@/components/layout/MarginDoodles";
import { SortNote } from "@/components/layout/SortNote";
import { PageEdge } from "@/components/sketch/PageEdge";

export default function Home() {
  return (
    <main id="main" className="relative flex-1">
      <MarginDoodles />
      <Hero />
      <div className="page-x mt-14 sm:mt-16">
        <FeaturedGame />
      </div>
      <section
        id="games"
        aria-labelledby="games-heading"
        className="page-x mt-16 scroll-mt-6 sm:mt-20"
      >
        <div className="mx-auto max-w-7xl">
          <h2 id="games-heading" className="sr-only">
            All games
          </h2>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <CategoryTabs />
              <PageEdge seed="tabs-edge" />
            </div>
            <SortNote />
          </div>
          <GameGrid />
        </div>
      </section>
      <HowToPlay />
    </main>
  );
}
