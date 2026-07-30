"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpgradeProButton({
  label = "Upgrade to Pro — $29/mo",
  className = "btn btn-primary",
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPayment: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not upgrade");
      router.refresh();
      router.push("/create?mode=subscription");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button type="button" className={className} disabled={loading} onClick={() => void onClick()}>
        {loading ? "Upgrading…" : label}
      </button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
