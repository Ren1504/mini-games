/**
 * Colors for rough.js and inline SVG. Each value is a CSS variable defined
 * in globals.css, so one `data-theme` switch on <html> recolors every
 * drawing (light notebook ↔ chalkboard) without regenerating any shapes.
 * The light-theme hex values live in globals.css next to the dark ones.
 */
export const ink = {
  /** Pencil (light) / chalk (dark): primary text and strokes. */
  graphite: "var(--color-graphite)",
  /** Lighter sketch lines and secondary text. */
  sketch: "var(--color-sketch)",
  paper: "var(--color-paper)",
  /** Card and torn-page paper. */
  card: "var(--color-card)",
  rule: "var(--color-rule)",
  margin: "var(--color-margin)",
  sticky: "var(--color-sticky)",
  /** Pencil-hatched drop shadows (stays dark in both themes). */
  shadow: "var(--color-shadow)",
  /** Keyboard keys and crumpled paper. */
  key: "var(--color-key)",
} as const;

export const crayon = {
  red: "var(--color-crayon-red)",
  blue: "var(--color-crayon-blue)",
  yellow: "var(--color-crayon-yellow)",
  green: "var(--color-crayon-green)",
  purple: "var(--color-crayon-purple)",
  orange: "var(--color-crayon-orange)",
} as const;

export type CrayonName = keyof typeof crayon;

export const highlighter = "var(--color-highlighter)";

/** Washi tape tints: semi-transparent like real tape (same in both themes). */
export const tapeColors = [
  "rgba(228, 87, 46, 0.55)",
  "rgba(58, 134, 255, 0.5)",
  "rgba(255, 190, 11, 0.6)",
  "rgba(67, 170, 139, 0.55)",
  "rgba(142, 92, 247, 0.5)",
  "rgba(251, 133, 0, 0.55)",
] as const;
