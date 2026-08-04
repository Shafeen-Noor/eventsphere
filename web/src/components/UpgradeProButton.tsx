"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getPlan, normalizePlanId } from "@/lib/plans";

type SubscribePlan = "premium" | "enterprise" | "pro" | "professional" | "essential";

export function UpgradeProButton({
  label,
  className = "btn btn-primary",
  plan = "premium",
}: {
  label?: string;
  className?: string;
  plan?: SubscribePlan;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const planDef = getPlan(plan);
  const buttonLabel =
    label ||
    (normalizePlanId(plan) === "enterprise"
      ? `Activate Enterprise — ${planDef.priceLabel}`
      : `Upgrade to ${planDef.label} — ${planDef.priceLabel}`);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, confirmPayment: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not upgrade");
      router.refresh();
      if (normalizePlanId(plan) === "enterprise") {
        router.push("/enterprise");
      } else {
        router.push("/create");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button type="button" className={className} disabled={loading} onClick={() => void onClick()}>
        {loading ? "Upgrading…" : buttonLabel}
      </button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
