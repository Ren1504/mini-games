import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Mono,
  Caveat,
  Gochi_Hand,
  Patrick_Hand,
} from "next/font/google";
import { PencilCursor } from "@/components/fx/PencilCursor";
import { SketchFocusRing } from "@/components/fx/SketchFocusRing";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { NotebookPage } from "@/components/layout/NotebookPage";
import { Providers } from "@/components/layout/Providers";
import { SkipLink } from "@/components/layout/SkipLink";
import { SketchFilters } from "@/components/sketch/SketchFilters";
import { themeInitScript } from "@/hooks/useTheme";
import "./globals.css";

const gochi = Gochi_Hand({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gochi",
  display: "swap",
});
const patrick = Patrick_Hand({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-patrick",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

/**
 * Room codes only: a font built so lookalikes stay distinct (G/6, S/5,
 * Z/2, B/8, 0/O, 1/I). The hand fonts blur them.
 */
const codeFont = Atkinson_Hyperlegible_Mono({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-atkinson-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Doodle Arcade", template: "%s · Doodle Arcade" },
  description:
    "A notebook full of tiny browser games: snake, tic-tac-toe, memory match, 2048 and more.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDFBF4" },
    { media: "(prefers-color-scheme: dark)", color: "#22302A" },
  ],
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    // data-theme is set by the inline script before hydration, so React
    // must not complain that <html> gained an attribute.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${gochi.variable} ${patrick.variable} ${caveat.variable} ${codeFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh overflow-x-hidden">
        <SketchFilters />
        <Providers>
          <NotebookPage>
            <SkipLink />
            <Header />
            {children}
            <Footer />
          </NotebookPage>
          {modal}
          <PencilCursor />
          <SketchFocusRing />
        </Providers>
      </body>
    </html>
  );
}
