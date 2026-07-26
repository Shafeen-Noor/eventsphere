"use client";

import { AtmosphereShell } from "@/components/AtmosphereShell";
import { getAtmosphere } from "@/lib/atmospheres";

const SAMPLE_PHOTOS = [
  "linear-gradient(135deg, #e4a576, #698ea2)",
  "linear-gradient(135deg, #ccd5d2, #fde5d6)",
  "linear-gradient(135deg, #152935, #698ea2)",
  "linear-gradient(135deg, #e4a576, #fde5d6)",
  "linear-gradient(135deg, #698ea2, #ccd5d2)",
  "linear-gradient(135deg, #fde5d6, #e4a576)",
];

export function ThemePreview({
  atmosphere,
  title,
  hostName,
}: {
  atmosphere: string;
  title?: string;
  hostName?: string;
}) {
  const theme = getAtmosphere(atmosphere);
  const displayTitle = title?.trim() || "Your event name";
  const displayHost = hostName?.trim() || "Host";

  const layoutClass =
    theme.layout === "polaroid"
      ? "gallery-polaroid"
      : theme.layout === "film"
        ? "gallery-film"
        : theme.layout === "mosaic"
          ? "gallery-mosaic"
          : theme.layout === "disco"
            ? "gallery-disco"
            : "gallery-ig";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">Live preview</p>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          {theme.label} · {theme.layout} layout
        </p>
      </div>

      <AtmosphereShell atmosphere={atmosphere}>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">
            Preview · {theme.label}
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl mt-1">
            {displayTitle}
          </h2>
          <p className="mt-1 text-sm opacity-75">Hosted by {displayHost}</p>
        </div>

        <div className={layoutClass}>
          {SAMPLE_PHOTOS.map((bg, index) => (
            <div
              key={bg + index}
              className={
                theme.layout === "polaroid"
                  ? "bg-white p-1.5 pb-2 shadow-md"
                  : theme.layout === "film"
                    ? "min-w-[120px] shrink-0 snap-center overflow-hidden rounded-lg"
                    : theme.layout === "mosaic"
                      ? "mb-2 break-inside-avoid overflow-hidden rounded-md"
                      : theme.layout === "disco"
                        ? "overflow-hidden rounded-lg border-2"
                        : "overflow-hidden"
              }
              style={
                theme.layout === "polaroid"
                  ? { transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)` }
                  : theme.layout === "disco"
                    ? {
                        borderColor:
                          index % 3 === 0
                            ? "#ff4fd8"
                            : index % 3 === 1
                              ? "#4fd8ff"
                              : "#ffe14f",
                      }
                    : undefined
              }
            >
              <div
                className={
                  theme.layout === "mosaic"
                    ? index % 2 === 0
                      ? "h-24 w-full"
                      : "h-16 w-full"
                    : theme.layout === "film"
                      ? "h-20 w-[120px]"
                      : "aspect-square w-full"
                }
                style={{ background: bg }}
              />
              {theme.layout === "polaroid" ? (
                <p className="mt-1 text-center text-[10px] text-[#152935]/opacity-70">
                  Memory {index + 1}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <p className="text-xs opacity-70">{theme.blurb}</p>
      </AtmosphereShell>
    </div>
  );
}
