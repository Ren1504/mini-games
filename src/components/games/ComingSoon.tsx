"use client";

import { getGame } from "@/data/games";
import { HandLettered } from "@/components/sketch/HandLettered";
import { SketchBox } from "@/components/sketch/SketchBox";
import { crayon } from "@/lib/palette";
import { GameThumbnail } from "./Thumbnails";

/** Placeholder shown on /games/[slug]/play until the real game exists. */
export function ComingSoon({ slug, title }: { slug: string; title: string }) {
  const game = getGame(slug);
  return (
    <div className="flex flex-col items-center gap-6">
      {game && (
        <SketchBox
          seed={`soon-${slug}`}
          fill={crayon.yellow}
          hachureGap={10}
          fillWeight={1.2}
          className="w-full max-w-sm p-4"
        >
          <GameThumbnail
            name={game.thumbnail}
            state="hover"
            className="aspect-[16/11] w-full"
          />
        </SketchBox>
      )}
      <HandLettered
        as="h1"
        text="Game coming soon!"
        seed="soon"
        className="font-hand text-5xl sm:text-6xl"
      />
      <p className="max-w-md text-xl">
        {title} is still being doodled. Check back soon, the pencils are
        sharpened.
      </p>
    </div>
  );
}
