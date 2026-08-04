"use client";

import {
  guestLimitLabel,
  mediaLimitLabel,
  PLANS,
  SELECTABLE_PLANS,
  type PlanId,
} from "@/lib/plans";

export function PlanPicker({
  value,
  onChange,
  plans = SELECTABLE_PLANS,
}: {
  value: PlanId;
  onChange: (id: PlanId) => void;
  /** Optional subset; defaults to all selectable plans */
  plans?: PlanId[];
  /** @deprecated kept for call-site compatibility */
  mode?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {plans.map((id) => {
          const plan = PLANS[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="rounded-xl border p-3 text-left transition"
              style={{
                borderColor: selected ? "var(--navy)" : "var(--line)",
                background: selected ? "var(--accent-soft)" : "var(--bg-elevated)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--navy)]">{plan.label}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{plan.blurb}</p>
                </div>
                <p className="shrink-0 font-[family-name:var(--font-display)] text-lg text-[var(--navy)]">
                  {plan.priceLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Max people
          </p>
          <p className="mt-1 font-semibold text-[var(--navy)]">
            {guestLimitLabel(PLANS[value].maxGuests)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Media
          </p>
          <p className="mt-1 font-semibold text-[var(--navy)]">
            {mediaLimitLabel(PLANS[value].maxMedia)}
          </p>
        </div>
      </div>
    </div>
  );
}
