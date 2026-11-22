/**
 * JS mirror of the CSS palette in globals.css. rough.js needs real color
 * strings, so the hex values live here too. Keep both files in sync.
 */
export const ink = {
  graphite: "#2B2B2B",
  sketch: "#5A5A5A",
  paper: "#FDFBF4",
  card: "#FFFDF7",
  rule: "#A7C7E7",
  margin: "#E88B8B",
  sticky: "#FFF2A1",
} as const;

export const crayon = {
  red: "#E4572E",
  blue: "#3A86FF",
  yellow: "#FFBE0B",
  green: "#43AA8B",
  purple: "#8E5CF7",
  orange: "#FB8500",
} as const;

export type CrayonName = keyof typeof crayon;

export const highlighter = "rgba(255, 241, 118, 0.7)";

/** Washi tape tints: crayon colors, semi-transparent like real tape. */
export const tapeColors = [
  "rgba(228, 87, 46, 0.55)",
  "rgba(58, 134, 255, 0.5)",
  "rgba(255, 190, 11, 0.6)",
  "rgba(67, 170, 139, 0.55)",
  "rgba(142, 92, 247, 0.5)",
  "rgba(251, 133, 0, 0.55)",
] as const;
