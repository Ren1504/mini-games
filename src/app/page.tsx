import Link from "next/link";
import { games } from "@/games/registry";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Mini Games</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Pick a game and play right in your browser.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <li key={game.slug}>
            <Link
              href={`/games/${game.slug}`}
              className="block h-full rounded-xl border border-black/10 p-5 transition-colors hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/[.06]"
            >
              <h2 className="text-lg font-medium">{game.title}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {game.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
