"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type MouseEvent } from "react";
import { useSound } from "@/components/fx/Sound";
import { Annotate } from "@/components/sketch/Annotate";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { HandLettered } from "@/components/sketch/HandLettered";
import { Scribble } from "@/components/sketch/Scribble";
import { SketchBox } from "@/components/sketch/SketchBox";
import { useBoil } from "@/hooks/useBoil";
import { useHubParams } from "@/hooks/useHubParams";
import { timeline } from "@/lib/motion";
import { crayon } from "@/lib/palette";
import { Mascot } from "./Mascot";
import { ThemeToggle } from "./ThemeToggle";

function Logo() {
  const frame = useBoil(true);
  return (
    <Link
      href="/"
      className="relative inline-block pb-3"
      aria-label="Doodle Arcade, home"
    >
      <span style={{ filter: `url(#boil-${frame})` }} className="block">
        <HandLettered
          text="Doodle Arcade"
          seed="logo"
          popInAt={timeline.logo}
          className="block font-hand text-[clamp(1.25rem,6.6vw,2.1rem)] leading-none sm:text-5xl short:text-[2.1rem]"
        />
      </span>
      <Scribble
        seed="logo-underline"
        delay={timeline.logoUnderline}
        className="absolute -bottom-1 left-0 h-4 w-full"
      />
    </Link>
  );
}

type NavItem = {
  label: string;
  href: string;
  key: "games" | "favorites" | "how";
};
const NAV: NavItem[] = [
  { label: "Games", href: "/#games", key: "games" },
  { label: "Favorites ★", href: "/?fav=1#games", key: "favorites" },
  { label: "How to Play", href: "/#how-to-play", key: "how" },
];

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: (e: MouseEvent) => void;
}) {
  const [hot, setHot] = useState(false);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      className="inline-flex min-h-11 items-center px-1 font-hand text-xl sm:text-2xl short:text-xl"
    >
      <Annotate
        type="circle"
        show={active}
        color={crayon.blue}
        padding={[4, 8]}
        strokeWidth={2.4}
      >
        <Annotate
          type="underline"
          show={hot && !active}
          color={crayon.red}
          padding={2}
          durationMs={350}
        >
          {item.label}
        </Annotate>
      </Annotate>
    </Link>
  );
}

function SoundToggle() {
  const { enabled, toggle } = useSound();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label="Sound effects"
      title={enabled ? "Sound on" : "Sound off"}
      className="shrink-0"
    >
      <SketchBox
        seed="sound"
        shape="ellipse"
        className="grid size-10 place-items-center sm:size-12"
        inset={2}
      >
        <DoodleIcon name={enabled ? "speaker" : "speaker-off"} size={26} />
      </SketchBox>
    </button>
  );
}

/** Nav that knows the current route (reads the URL, so it sits in Suspense). */
function RouteAwareNav() {
  return <MainNav pathname={usePathname()} />;
}

/**
 * Main nav. With `pathname` null (the Suspense fallback) nothing is
 * circled and the links navigate normally; the real nav replaces it
 * immediately on the client.
 */
function MainNav({ pathname }: { pathname: string | null }) {
  const { filters, update } = useHubParams();
  const onHub = pathname === "/";

  const isActive = (key: NavItem["key"]) =>
    key === "favorites"
      ? onHub && filters.favoritesOnly
      : key === "games"
        ? (onHub && !filters.favoritesOnly) ||
          Boolean(pathname?.startsWith("/games"))
        : false;

  // On the hub, filter in place instead of navigating (keeps animations alive).
  const onFavorites = (e: MouseEvent) => {
    if (!onHub) return;
    e.preventDefault();
    update({ favoritesOnly: true });
    document.getElementById("games")?.scrollIntoView();
  };
  const onGames = (e: MouseEvent) => {
    if (!onHub) return;
    e.preventDefault();
    if (filters.favoritesOnly) update({ favoritesOnly: false });
    document.getElementById("games")?.scrollIntoView();
  };

  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap items-center gap-x-3 sm:gap-x-5">
        {NAV.map((item) => (
          <li key={item.key}>
            <NavLink
              item={item}
              active={isActive(item.key)}
              onClick={
                item.key === "favorites"
                  ? onFavorites
                  : item.key === "games"
                    ? onGames
                    : undefined
              }
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Header() {
  return (
    <header className="page-x pt-5 sm:pt-8 short:pt-3">
      {/* Phones: logo + toggles on row 1 (toggles top-right), nav on row 2.
          Wider: logo … nav, sound, theme in one row. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-5">
        <div className="order-1 mr-auto flex items-end gap-2 sm:gap-3">
          <Mascot />
          <Logo />
        </div>
        <div className="order-3 w-full sm:order-2 sm:w-auto">
          <Suspense fallback={<MainNav pathname={null} />}>
            <RouteAwareNav />
          </Suspense>
        </div>
        <div className="order-2 flex shrink-0 items-center gap-1 sm:order-3 sm:gap-3">
          <SoundToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
