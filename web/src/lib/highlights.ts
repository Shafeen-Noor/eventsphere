export const HIGHLIGHT_MAX = 8;

export const HIGHLIGHT_TEMPLATES = [
  {
    id: "ig8",
    label: "Instagram grid",
    blurb: "Up to 8 equal frames",
    className: "hl-template-ig8",
    idealCount: 8,
  },
  {
    id: "center",
    label: "Centerpiece",
    blurb: "Hero in the middle, friends around",
    className: "hl-template-center",
    idealCount: 7,
  },
  {
    id: "grid4",
    label: "2×2 collage",
    blurb: "Classic four-up",
    className: "hl-template-grid4",
    idealCount: 4,
  },
  {
    id: "hero",
    label: "Hero + stack",
    blurb: "One big, three small",
    className: "hl-template-hero",
    idealCount: 4,
  },
  {
    id: "mosaic",
    label: "Mosaic",
    blurb: "Loose masonry collage",
    className: "hl-template-mosaic",
    idealCount: 6,
  },
  {
    id: "film",
    label: "Film roll",
    blurb: "Horizontal cinema strip",
    className: "hl-template-film",
    idealCount: 6,
  },
  {
    id: "story",
    label: "Story strip",
    blurb: "Tall vertical frames",
    className: "hl-template-story",
    idealCount: 4,
  },
] as const;

export const HIGHLIGHT_FILTERS = [
  { id: "none", label: "Original", css: "none" },
  { id: "warm", label: "Warm", css: "sepia(0.25) saturate(1.2) contrast(1.05)" },
  { id: "cool", label: "Cool", css: "saturate(0.9) hue-rotate(15deg) brightness(1.05)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.1)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.45) contrast(1.1)" },
  { id: "soft", label: "Soft glow", css: "brightness(1.08) contrast(0.92) saturate(1.1)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.35) brightness(0.9)" },
  { id: "rose", label: "Rose", css: "sepia(0.15) hue-rotate(-12deg) saturate(1.25)" },
] as const;

export type HighlightTemplateId = (typeof HIGHLIGHT_TEMPLATES)[number]["id"];
export type HighlightFilterId = (typeof HIGHLIGHT_FILTERS)[number]["id"];

export function getHighlightFilterCss(id?: string | null) {
  return HIGHLIGHT_FILTERS.find((f) => f.id === id)?.css ?? "none";
}

export function getHighlightTemplate(id?: string | null) {
  return HIGHLIGHT_TEMPLATES.find((t) => t.id === id) ?? HIGHLIGHT_TEMPLATES[0];
}
