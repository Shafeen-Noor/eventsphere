export type PlanId = "free" | "essential" | "premium" | "enterprise";

/** Soft “unlimited” cap stored in DB for media/guests. */
export const UNLIMITED = 999_999;

export const EXTENSION_MONTH_CENTS = 500;

export type EventTypeId =
  | "wedding"
  | "birthday"
  | "party"
  | "corporate"
  | "conference"
  | "reunion"
  | "baby_shower"
  | "graduation"
  | "holiday"
  | "other";

export const EVENT_TYPES: { id: EventTypeId; label: string }[] = [
  { id: "wedding", label: "Wedding" },
  { id: "birthday", label: "Birthday" },
  { id: "party", label: "Party / celebration" },
  { id: "corporate", label: "Corporate" },
  { id: "conference", label: "Conference" },
  { id: "reunion", label: "Reunion" },
  { id: "baby_shower", label: "Baby shower" },
  { id: "graduation", label: "Graduation" },
  { id: "holiday", label: "Holiday gathering" },
  { id: "other", label: "Other" },
];

export type PlanFeatures = {
  branding: boolean;
  guestbook: boolean;
  feed: boolean;
  slideshow: boolean;
  zipDownload: boolean;
  coverPhoto: boolean;
  timeline: boolean;
  challenges: boolean;
  polls: boolean;
  audioMemories: boolean;
  seating: boolean;
  voting: boolean;
  ai: boolean;
  multihost: boolean;
  password: boolean;
  faces: boolean;
  analytics: boolean;
  moderation: boolean;
  whiteLabel: boolean;
  api: boolean;
};

export type PlanDefinition = {
  id: PlanId;
  label: string;
  priceCents: number;
  priceLabel: string;
  blurb: string;
  maxGuests: number;
  maxMedia: number;
  retentionHours: number;
  features: PlanFeatures;
};

const FREE_FEATURES: PlanFeatures = {
  branding: true,
  guestbook: true,
  feed: true,
  slideshow: false,
  zipDownload: false,
  coverPhoto: false,
  timeline: false,
  challenges: false,
  polls: false,
  audioMemories: false,
  seating: false,
  voting: false,
  ai: false,
  multihost: false,
  password: false,
  faces: false,
  analytics: false,
  moderation: false,
  whiteLabel: false,
  api: false,
};

const ESSENTIAL_FEATURES: PlanFeatures = {
  ...FREE_FEATURES,
  branding: true,
  slideshow: true,
  zipDownload: true,
  coverPhoto: true,
  timeline: true,
  challenges: true,
  polls: true,
  audioMemories: true,
  seating: true,
};

const PREMIUM_FEATURES: PlanFeatures = {
  ...ESSENTIAL_FEATURES,
  branding: false,
  voting: true,
  ai: true,
  multihost: true,
  password: true,
  faces: true,
  analytics: true,
  moderation: true,
};

const ENTERPRISE_FEATURES: PlanFeatures = {
  ...PREMIUM_FEATURES,
  branding: false,
  whiteLabel: true,
  api: true,
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    priceCents: 0,
    priceLabel: "$0",
    blurb: "5 guests · 40 media · 24h · guestbook + live feed",
    maxGuests: 5,
    maxMedia: 40,
    retentionHours: 24,
    features: FREE_FEATURES,
  },
  essential: {
    id: "essential",
    label: "Essential",
    priceCents: 900,
    priceLabel: "$9",
    blurb: "50 guests · 500 media · 7 days · slideshow, polls, seating",
    maxGuests: 50,
    maxMedia: 500,
    retentionHours: 24 * 7,
    features: ESSENTIAL_FEATURES,
  },
  premium: {
    id: "premium",
    label: "Premium",
    priceCents: 2900,
    priceLabel: "$29",
    blurb: "200 guests · unlimited media · 30 days · AI, faces, moderation",
    maxGuests: 200,
    maxMedia: UNLIMITED,
    retentionHours: 24 * 30,
    features: PREMIUM_FEATURES,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    priceCents: 19900,
    priceLabel: "$199/mo",
    blurb: "Unlimited everything · white-label · API access",
    maxGuests: UNLIMITED,
    maxMedia: UNLIMITED,
    retentionHours: 24 * 365,
    features: ENTERPRISE_FEATURES,
  },
};

export const SELECTABLE_PLANS: PlanId[] = [
  "free",
  "essential",
  "premium",
  "enterprise",
];

/** Map legacy plan ids and aliases onto current PlanIds. */
export function normalizePlanId(plan: string | null | undefined): PlanId {
  const raw = (plan || "free").toLowerCase().trim();
  if (raw === "pro") return "essential";
  if (raw === "professional") return "enterprise";
  if (
    raw === "free" ||
    raw === "essential" ||
    raw === "premium" ||
    raw === "enterprise"
  ) {
    return raw;
  }
  return "free";
}

export function getPlan(plan: string | null | undefined): PlanDefinition {
  return PLANS[normalizePlanId(plan)];
}

export function planLabel(plan: string | null | undefined) {
  return getPlan(plan).label;
}

export function mediaLimitLabel(maxMedia: number | null | undefined) {
  if (maxMedia == null || maxMedia >= UNLIMITED) return "Unlimited media";
  return `${maxMedia.toLocaleString()} media`;
}

export function guestLimitLabel(maxGuests: number | null | undefined) {
  if (maxGuests == null || maxGuests >= UNLIMITED) return "Unlimited guests";
  return `${maxGuests.toLocaleString()} guests`;
}

export type PlanLimitedEventFields = {
  planTier: PlanId;
  maxGuests: number;
  maxMedia: number;
  retentionHours: number;
  whiteLabel?: boolean;
};

/** Apply plan caps onto an event draft / row (does not persist). */
export function applyPlanLimitsToEvent<T extends Record<string, unknown>>(
  event: T,
  planId?: string | null,
): T & PlanLimitedEventFields {
  const plan = getPlan(
    planId ??
      (typeof event.planTier === "string" ? event.planTier : undefined),
  );
  return {
    ...event,
    planTier: plan.id,
    maxGuests: plan.maxGuests,
    maxMedia: plan.maxMedia,
    retentionHours: plan.retentionHours,
    whiteLabel: plan.features.whiteLabel,
  };
}

export function assertSelectablePlan(plan: string): PlanId {
  const id = normalizePlanId(plan);
  if (!SELECTABLE_PLANS.includes(id)) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "PLAN_INVALID",
          message: "Choose Free, Essential, Premium, or Enterprise.",
        },
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }
  return id;
}
