export const ATMOSPHERES = [
  {
    id: "bday",
    label: "Birthday",
    blurb: "Balloons, confetti, playful polaroids",
    layout: "polaroid" as const,
    bg: "linear-gradient(165deg, #ffe3ef 0%, #fff4d6 45%, #fde5d6 100%)",
  },
  {
    id: "wedding",
    label: "Wedding",
    blurb: "Soft white florals, elegant grid",
    layout: "ig" as const,
    bg: "linear-gradient(180deg, #ffffff 0%, #f7f1ea 50%, #fde5d6 100%)",
  },
  {
    id: "trip",
    label: "Trip",
    blurb: "Planes, stamps, film-strip travel vibes",
    layout: "film" as const,
    bg: "linear-gradient(160deg, #d9ebe8 0%, #ccd5d2 40%, #f3efe6 100%)",
  },
  {
    id: "dinner",
    label: "Dinner",
    blurb: "Dark candlelit mosaic",
    layout: "mosaic" as const,
    bg: "linear-gradient(180deg, #1a2430 0%, #243443 55%, #152935 100%)",
  },
  {
    id: "party",
    label: "Party",
    blurb: "Disco lights and neon frames",
    layout: "disco" as const,
    bg: "linear-gradient(145deg, #2a1538 0%, #152935 45%, #3a2458 100%)",
  },
] as const;

export type AtmosphereId = (typeof ATMOSPHERES)[number]["id"];

export function getAtmosphere(id?: string | null) {
  return ATMOSPHERES.find((a) => a.id === id) ?? ATMOSPHERES[0];
}

export function isDarkAtmosphere(id?: string | null) {
  return id === "dinner" || id === "party";
}
