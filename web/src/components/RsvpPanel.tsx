"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RsvpRow = {
  userId: string;
  displayName: string;
  status: string;
  plusOnes: number;
  note: string;
  isMe: boolean;
};

export function RsvpPanel({
  slug,
  gateMode = false,
  allowPlusOnes = true,
  maxPlusOnes = 2,
  onSaved,
}: {
  slug: string;
  gateMode?: boolean;
  allowPlusOnes?: boolean;
  maxPlusOnes?: number;
  onSaved?: (status: "going" | "maybe" | "declined") => void;
}) {
  const [status, setStatus] = useState<"going" | "maybe" | "declined">("going");
  const [plusOnes, setPlusOnes] = useState(0);
  const [summary, setSummary] = useState({ going: 0, maybe: 0, declined: 0 });
  const [rows, setRows] = useState<RsvpRow[]>([]);
  const [maxAllowed, setMaxAllowed] = useState(maxPlusOnes);
  const [plusAllowed, setPlusAllowed] = useState(allowPlusOnes);
  const [saving, setSaving] = useState(false);

  const plusOptions = useMemo(
    () => Array.from({ length: Math.max(0, maxAllowed) + 1 }, (_, i) => i),
    [maxAllowed],
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${slug}/rsvp`);
    const data = await res.json();
    if (!res.ok) return;
    setSummary(data.summary);
    setRows(data.rsvps);
    if (typeof data.maxPlusOnes === "number") setMaxAllowed(data.maxPlusOnes);
    if (typeof data.allowPlusOnes === "boolean") setPlusAllowed(data.allowPlusOnes);
    const mine = data.rsvps.find((r: RsvpRow) => r.isMe);
    if (mine) {
      setStatus(mine.status);
      setPlusOnes(mine.plusOnes);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/events/${slug}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        plusOnes: plusAllowed && status === "going" ? plusOnes : 0,
      }),
    });
    setSaving(false);
    if (!res.ok) return;
    onSaved?.(status);
    load();
  }

  return (
    <div className="panel p-5 space-y-4">
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-xl">
          {gateMode ? "RSVP to unlock uploads" : "RSVP"}
        </h3>
        <p className="text-sm text-[var(--muted)] mt-1">
          {gateMode
            ? "Choose Going to add photos once the event is live."
            : `${summary.going} going · ${summary.maybe} maybe · ${summary.declined} declined`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["going", "maybe", "declined"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className="btn px-4 py-2 text-sm capitalize"
            style={{
              background: status === s ? "var(--accent)" : "transparent",
              color: status === s ? "#1a1208" : "var(--fg)",
              border: "1px solid var(--line)",
            }}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {plusAllowed && status === "going" && maxAllowed > 0 ? (
        <div className="field max-w-[180px]">
          <label htmlFor="plus">Plus-ones (max {maxAllowed})</label>
          <select
            id="plus"
            value={plusOnes}
            onChange={(e) => setPlusOnes(Number(e.target.value))}
          >
            {plusOptions.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Just me" : `+${n}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : gateMode ? "Confirm RSVP" : "Save RSVP"}
      </button>

      {!gateMode ? (
        <ul className="max-h-40 overflow-auto divide-y divide-[var(--line)] text-sm">
          {rows.map((r) => (
            <li key={r.userId} className="flex justify-between py-2">
              <span>
                {r.displayName}
                {r.plusOnes ? ` +${r.plusOnes}` : ""}
              </span>
              <span className="text-[var(--muted)] capitalize">{r.status}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
