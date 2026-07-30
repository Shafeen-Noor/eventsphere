"use client";

import { guestLimitLabel, PLANS, type PlanId } from "@/lib/plans";

export function PlanPicker({
  mode,
  value,
  onChange,
}: {
  mode: "subscription" | "instant";
  value: PlanId;
  onChange: (id: PlanId) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const plan = PLANS[id];
          const tier = plan[mode];
          const selected = value === id;
          const disabled = Boolean(plan.comingSoon);
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(id)}
              className="rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55"
              style={{
                borderColor: selected ? "var(--navy)" : "var(--line)",
                background: selected ? "#e8f0f4" : "#ffffff",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--navy)]">
                    {plan.label}
                    {plan.comingSoon ? (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                        Coming soon
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{tier.blurb}</p>
                </div>
                <p className="shrink-0 font-[family-name:var(--font-display)] text-lg text-[var(--navy)]">
                  {tier.priceLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {!PLANS[value].comingSoon ? (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Max people
            </p>
            <p className="mt-1 font-semibold text-[var(--navy)]">
              {guestLimitLabel(PLANS[value].limits.maxGuests)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Photos
            </p>
            <p className="mt-1 font-semibold text-[var(--navy)]">
              {PLANS[value].limits.maxMedia}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
