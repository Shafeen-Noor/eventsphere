export type PlanId = "free" | "pro" | "professional";
export type BillingMode = "free" | "onetime" | "subscription";
export type HostType = "planner" | "venue" | "individual";
export type GuestVisibility = "own_only" | "approved_public" | "all_members";

export type PlanLimits = {
  maxGuests: number;
  maxMedia: number;
  maxMediaPerGuestDefault: number;
  maxDurationHours: number;
  canSetUploadWindow: boolean;
  canCustomizeInvite: boolean;
  canAddMaps: boolean;
  canUseVideos: boolean;
  canRequireApproval: boolean;
  canPublishHighlights: boolean;
  canUseLiveWall: boolean;
  canUseRsvp: boolean;
  canSetGuestVisibility: boolean;
  canCollectContacts: boolean;
  branding: boolean;
};

export type PlanDefinition = {
  id: PlanId;
  label: string;
  comingSoon?: boolean;
  limits: PlanLimits;
  subscription: {
    priceLabel: string;
    priceCents: number;
    blurb: string;
    storageLabel: string;
  };
  instant: {
    priceLabel: string;
    priceCents: number;
    blurb: string;
    storageLabel: string;
  };
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    limits: {
      maxGuests: 10,
      maxMedia: 100,
      maxMediaPerGuestDefault: 10,
      maxDurationHours: 24,
      canSetUploadWindow: false,
      canCustomizeInvite: false,
      canAddMaps: false,
      canUseVideos: false,
      canRequireApproval: false,
      canPublishHighlights: false,
      canUseLiveWall: false,
      canUseRsvp: false,
      canSetGuestVisibility: false,
      canCollectContacts: false,
      branding: true,
    },
    subscription: {
      priceLabel: "$0 / mo",
      priceCents: 0,
      blurb: "10 guests · 100 photos · 24h",
      storageLabel: "100 photos",
    },
    instant: {
      priceLabel: "$0",
      priceCents: 0,
      blurb: "10 guests · 100 photos · 24h",
      storageLabel: "100 photos",
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    limits: {
      maxGuests: 150,
      maxMedia: 2000,
      maxMediaPerGuestDefault: 50,
      maxDurationHours: 168,
      canSetUploadWindow: true,
      canCustomizeInvite: true,
      canAddMaps: true,
      canUseVideos: true,
      canRequireApproval: true,
      canPublishHighlights: true,
      canUseLiveWall: true,
      canUseRsvp: true,
      canSetGuestVisibility: true,
      canCollectContacts: true,
      branding: false,
    },
    subscription: {
      priceLabel: "$29 / mo",
      priceCents: 2900,
      blurb: "Approval · private albums · custom card · up to 7 days",
      storageLabel: "2,000 media",
    },
    instant: {
      priceLabel: "From $9 once",
      priceCents: 900,
      blurb: "Pick guests + storage for this event only",
      storageLabel: "400–2,000 media",
    },
  },
  professional: {
    id: "professional",
    label: "Professional",
    comingSoon: true,
    limits: {
      maxGuests: 1000,
      maxMedia: 20000,
      maxMediaPerGuestDefault: 100,
      maxDurationHours: 720,
      canSetUploadWindow: true,
      canCustomizeInvite: true,
      canAddMaps: true,
      canUseVideos: true,
      canRequireApproval: true,
      canPublishHighlights: true,
      canUseLiveWall: true,
      canUseRsvp: true,
      canSetGuestVisibility: true,
      canCollectContacts: true,
      branding: false,
    },
    subscription: {
      priceLabel: "$99 / mo",
      priceCents: 9900,
      blurb: "Coming soon · agency / white-label",
      storageLabel: "20,000 media",
    },
    instant: {
      priceLabel: "$149 once",
      priceCents: 14900,
      blurb: "Coming soon",
      storageLabel: "20,000 media",
    },
  },
};

export const HOST_TYPES: { id: HostType; label: string }[] = [
  { id: "planner", label: "Event planner / agency" },
  { id: "venue", label: "Venue / brand" },
  { id: "individual", label: "Individual host" },
];

export const SELECTABLE_PLANS: PlanId[] = ["free", "pro"];

/**
 * Pro one-time event size packs (USD).
 * AWS math (us-east-1 list, pitch-grade):
 * - ~4.5 MB stored per media (original + web + thumb)
 * - 7-day retain → S3 Standard ≈ $0.023/GB-mo × (7/30)
 * - Delivery (CloudFront) dominates: host download + browse ≈ $0.085/GB
 * - Buffer for PUT/GET + Neon/Vercel share folded into awsCents
 * Stripe ≈ 2.9% + $0.30 — kept outside awsCents; see net after fee in pitch.
 */
export const ONETIME_TIERS = [
  {
    id: "cozy",
    label: "Cozy",
    guests: 25,
    maxMedia: 400,
    maxMediaPerGuest: 20,
    priceCents: 900,
    priceLabel: "$9",
    /** Estimated all-in AWS variable cost for a full event */
    awsCents: 80,
    blurb: "Birthday dinner · small crew",
  },
  {
    id: "party",
    label: "Party",
    guests: 50,
    maxMedia: 800,
    maxMediaPerGuest: 25,
    priceCents: 1500,
    priceLabel: "$15",
    awsCents: 140,
    blurb: "House party · weekend trip",
  },
  {
    id: "gather",
    label: "Gather",
    guests: 100,
    maxMedia: 1400,
    maxMediaPerGuest: 30,
    priceCents: 2500,
    priceLabel: "$25",
    awsCents: 220,
    blurb: "Big birthday · family celebration",
  },
  {
    id: "celebration",
    label: "Celebration",
    guests: 150,
    maxMedia: 2000,
    maxMediaPerGuest: 40,
    priceCents: 3900,
    priceLabel: "$39",
    awsCents: 300,
    blurb: "Reception-size · full Pro controls",
  },
] as const;

export type OnetimeTierId = (typeof ONETIME_TIERS)[number]["id"];

export function getOnetimeTier(id?: string | null) {
  return ONETIME_TIERS.find((t) => t.id === id) ?? ONETIME_TIERS[0];
}

/** Stripe fee estimate in cents for a charge amount */
export function stripeFeeCents(priceCents: number) {
  return Math.round(priceCents * 0.029) + 30;
}

export function planLabel(plan: string | null | undefined) {
  const id = (plan || "free") as PlanId;
  return PLANS[id]?.label ?? "Free";
}

export function getPlan(plan: string | null | undefined): PlanDefinition {
  const id = (plan || "free") as PlanId;
  return PLANS[id] ?? PLANS.free;
}

export function assertSelectablePlan(plan: string): PlanId {
  if (plan === "professional") {
    throw new Response(
      JSON.stringify({
        error: {
          code: "PLAN_COMING_SOON",
          message: "Professional is coming soon. Choose Free or Pro for now.",
        },
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }
  if (plan !== "free" && plan !== "pro") {
    throw new Response(
      JSON.stringify({
        error: { code: "PLAN_INVALID", message: "Choose Free or Pro." },
      }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }
  return plan;
}

export function guestLimitLabel(maxGuests: number | null) {
  return maxGuests == null ? "Unlimited" : `${maxGuests} guests`;
}
