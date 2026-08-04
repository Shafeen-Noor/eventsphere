"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  guestLimitLabel,
  mediaLimitLabel,
  PLANS,
  type PlanId,
} from "@/lib/plans";

const COMPARE: PlanId[] = ["free", "essential", "premium"];

const FEATURE_ROWS: { key: string; label: string; check: (id: PlanId) => boolean | string }[] = [
  {
    key: "guests",
    label: "Guests",
    check: (id) => guestLimitLabel(PLANS[id].maxGuests),
  },
  {
    key: "media",
    label: "Media",
    check: (id) => mediaLimitLabel(PLANS[id].maxMedia),
  },
  {
    key: "retention",
    label: "Retention",
    check: (id) => {
      const h = PLANS[id].retentionHours;
      if (h >= 24 * 30) return `${Math.round(h / 24)} days`;
      if (h >= 24) return `${Math.round(h / 24)} days`;
      return `${h}h`;
    },
  },
  {
    key: "slideshow",
    label: "Slideshow",
    check: (id) => PLANS[id].features.slideshow,
  },
  {
    key: "challenges",
    label: "Challenges & polls",
    check: (id) => PLANS[id].features.challenges,
  },
  {
    key: "ai",
    label: "AI & faces",
    check: (id) => PLANS[id].features.ai,
  },
  {
    key: "moderation",
    label: "Moderation & analytics",
    check: (id) => PLANS[id].features.moderation,
  },
  {
    key: "branding",
    label: "No EventSphere watermark",
    check: (id) => !PLANS[id].features.branding,
  },
];

export function UpgradeEventModal({
  slug,
  currentPlan = "free",
  open,
  onClose,
}: {
  slug: string;
  currentPlan?: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function upgrade(planTier: "essential" | "premium") {
    setLoading(planTier);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier, confirmPayment: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Upgrade failed");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="upgrade-modal" role="dialog" aria-modal="true" aria-label="Upgrade event">
      <button type="button" className="upgrade-modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="upgrade-modal-panel panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Upgrade this event
            </p>
            <h2 className="section-title mt-1 text-3xl">Free · Essential · Premium</h2>
          </div>
          <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="upgrade-table mt-6 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                {COMPARE.map((id) => (
                  <th key={id}>
                    <div>{PLANS[id].label}</div>
                    <div className="text-sm font-normal text-[var(--muted)]">
                      {PLANS[id].priceLabel}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  {COMPARE.map((id) => {
                    const v = row.check(id);
                    return (
                      <td key={id}>
                        {typeof v === "boolean" ? (v ? "Yes" : "—") : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {currentPlan !== "essential" && currentPlan !== "premium" && currentPlan !== "enterprise" ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(loading)}
              onClick={() => void upgrade("essential")}
            >
              {loading === "essential" ? "Upgrading…" : `Upgrade to Essential — ${PLANS.essential.priceLabel}`}
            </button>
          ) : null}
          {currentPlan !== "premium" && currentPlan !== "enterprise" ? (
            <button
              type="button"
              className="btn btn-accent"
              disabled={Boolean(loading)}
              onClick={() => void upgrade("premium")}
            >
              {loading === "premium" ? "Upgrading…" : `Upgrade to Premium — ${PLANS.premium.priceLabel}`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
