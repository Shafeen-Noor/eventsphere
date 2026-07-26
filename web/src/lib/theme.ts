import type { CSSProperties } from "react";

/** Convert #RRGGBB to rgba() for soft backgrounds. */
export function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(226, 163, 90, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function themeStyle(themeColor: string): CSSProperties {
  return {
    ["--accent" as string]: themeColor,
    ["--accent-soft" as string]: hexToRgba(themeColor, 0.18),
    ["--theme-glow" as string]: hexToRgba(themeColor, 0.22),
  };
}
