export const ATMOSPHERES = [
  {
    id: "bday",
    label: "Birthday",
    blurb: "Balloons & polaroids",
    motif: "🎈",
    layout: "polaroid" as const,
    fg: "#3b1f2b",
    accent: "#e85d8a",
    bg: "linear-gradient(145deg, #ffd6e7 0%, #ffe9c9 48%, #ffd8c2 100%)",
  },
  {
    id: "wedding",
    label: "Wedding",
    blurb: "Soft florals, clean grid",
    motif: "💍",
    layout: "ig" as const,
    fg: "#2c2620",
    accent: "#9a7b5a",
    bg: "linear-gradient(165deg, #ffffff 0%, #f4ebe1 55%, #e8d5c4 100%)",
  },
  {
    id: "trip",
    label: "Trip",
    blurb: "Stamps & film strip",
    motif: "✈️",
    layout: "film" as const,
    fg: "#1e2f2c",
    accent: "#3d7a6e",
    bg: "linear-gradient(150deg, #cfe8e2 0%, #d7ddd6 42%, #efe6d4 100%)",
  },
  {
    id: "dinner",
    label: "Dinner",
    blurb: "Candlelit mosaic",
    motif: "🕯️",
    layout: "mosaic" as const,
    fg: "#f3ebe1",
    accent: "#d4a574",
    bg: "linear-gradient(165deg, #1a1c22 0%, #2a3140 55%, #1c2430 100%)",
  },
  {
    id: "party",
    label: "Party",
    blurb: "Neon frames, night out",
    motif: "🪩",
    layout: "disco" as const,
    fg: "#f6f0ff",
    accent: "#c084fc",
    bg: "linear-gradient(145deg, #1a1228 0%, #24183a 40%, #152035 100%)",
  },
] as const;

export type AtmosphereId = (typeof ATMOSPHERES)[number]["id"];

export function getAtmosphere(id?: string | null) {
  return ATMOSPHERES.find((a) => a.id === id) ?? ATMOSPHERES[0];
}

export function isDarkAtmosphere(id?: string | null) {
  return id === "dinner" || id === "party";
}
