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
      priceLabel: "$49 once",
      priceCents: 4900,
      blurb: "This event only · full Pro controls",
      storageLabel: "2,000 media",
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
