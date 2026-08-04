"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventPhase, phaseLabel } from "@/lib/phase";
import { getPlan, type PlanFeatures } from "@/lib/plans";
import { formatEventWhen } from "@/lib/time";

type Props = {
  slug: string;
  title: string;
  description: string;
  hostName: string;
  locationName: string;
  mapsUrl?: string;
  inviteCopy?: string;
  startAt: string | null;
  endAt?: string | null;
  expiresAt?: string | null;
  atmosphere?: string;
  requiresPasscode: boolean;
  rsvpEnabled?: boolean;
  allowPlusOnes?: boolean;
  maxPlusOnes?: number;
  collectContacts?: boolean;
  planTier?: string;
  features?: Partial<PlanFeatures>;
};

const HUB_TILES: { key: keyof PlanFeatures | "gallery" | "upload"; label: string; always?: boolean }[] = [
  { key: "gallery", label: "Gallery", always: true },
  { key: "upload", label: "Upload", always: true },
  { key: "feed", label: "Live feed" },
  { key: "guestbook", label: "Guestbook" },
  { key: "slideshow", label: "Slideshow" },
  { key: "challenges", label: "Challenges" },
  { key: "polls", label: "Polls" },
  { key: "timeline", label: "Schedule" },
  { key: "voting", label: "Vote" },
  { key: "seating", label: "Seating" },
  { key: "audioMemories", label: "Audio" },
  { key: "faces", label: "Faces" },
  { key: "ai", label: "Ask AI" },
];

function useCountdown(targetIso: string | null | undefined) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!targetIso) {
      setLabel("");
      return;
    }
    const tick = () => {
      const ms = new Date(targetIso).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("Starting now");
        return;
      }
      const totalSec = Math.floor(ms / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (d > 0) setLabel(`${d}d ${h}h ${m}m`);
      else setLabel(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return label;
}

export function InviteCard({
  slug,
  title,
  description,
  hostName,
  locationName,
  mapsUrl = "",
  inviteCopy = "",
  startAt,
  endAt = null,
  expiresAt = null,
  requiresPasscode,
  rsvpEnabled = false,
  allowPlusOnes = true,
  maxPlusOnes = 2,
  collectContacts = false,
  planTier = "free",
  features,
}: Props) {
  const router = useRouter();
  const plan = getPlan(planTier);
  const feats = features || plan.features;
  const phase = getEventPhase({ startAt, endAt, expiresAt });
  const countdown = useCountdown(phase === "countdown" ? startAt : null);
  const whenLabel = useMemo(() => formatEventWhen(startAt), [startAt]);

  const [displayName, setDisplayName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [status, setStatus] = useState<"going" | "maybe" | "declined">("going");
  const [plusOnes, setPlusOnes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plusOptions = useMemo(() => {
    const max = Math.max(0, maxPlusOnes);
    return Array.from({ length: max + 1 }, (_, i) => i);
  }, [maxPlusOnes]);

  const tiles = HUB_TILES.filter((t) => {
    if (t.always) return true;
    return Boolean(feats[t.key as keyof PlanFeatures]);
  }).slice(0, 8);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          passcode: passcode || null,
          rsvpStatus: rsvpEnabled ? status : null,
          plusOnes: rsvpEnabled && allowPlusOnes && status === "going" ? plusOnes : 0,
          contactEmail: collectContacts ? contactEmail || null : null,
          contactWhatsapp: collectContacts ? contactWhatsapp || null : null,
          notificationsOptIn: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not join");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="es-site guest-invite-room">
      <div className="guest-invite-atmosphere" aria-hidden />
      <div className="guest-invite-main">
        <div className="panel mx-auto max-w-xl overflow-hidden p-0">
          <div className="phase-banner">
            <span>{phaseLabel(phase)}</span>
            {phase === "countdown" && countdown ? (
              <strong className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                {countdown}
              </strong>
            ) : (
              <strong className="text-sm">{phase === "live" ? "Join the hub" : "Memories stay open"}</strong>
            )}
          </div>

          <div className="space-y-4 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              You’re invited
            </p>
            <h1 className="section-title text-4xl sm:text-5xl">{title}</h1>
            <p className="text-[var(--muted)]">
              Hosted by {hostName}
              {whenLabel ? ` · ${whenLabel}` : ""}
              {locationName ? ` · ${locationName}` : ""}
            </p>
            {inviteCopy ? <p className="leading-relaxed">{inviteCopy}</p> : null}
            {description ? (
              <p className="text-sm leading-relaxed text-[var(--muted)]">{description}</p>
            ) : null}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-semibold underline"
              >
                Open in maps
              </a>
            ) : null}

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Inside the hub
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tiles.map((t) => (
                  <span
                    key={t.key}
                    className="rounded-full border border-[var(--line)] bg-[var(--bg)] px-3 py-1 text-xs font-semibold"
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 border-t border-[var(--line)] bg-[var(--bg)] p-6 sm:p-8">
            <div>
              <h2 className="section-title text-2xl">
                {rsvpEnabled ? "Will you be there?" : "Join by name"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {collectContacts
                  ? "Add your name plus email or WhatsApp for updates."
                  : "Enter your name to open the shared hub."}
              </p>
            </div>

            <div className="field">
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={40}
                placeholder="Riley"
                autoFocus
              />
            </div>

            {collectContacts ? (
              <>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>
                <div className="field">
                  <label htmlFor="wa">WhatsApp</label>
                  <input
                    id="wa"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </>
            ) : null}

            {requiresPasscode ? (
              <div className="field">
                <label htmlFor="pass">Passcode</label>
                <input
                  id="pass"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  maxLength={12}
                />
              </div>
            ) : null}

            {rsvpEnabled ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "going" as const, label: "Going" },
                      { id: "maybe" as const, label: "Maybe" },
                      { id: "declined" as const, label: "Can’t make it" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="btn px-4 py-2 text-sm"
                      style={{
                        background: status === opt.id ? "var(--accent)" : "var(--bg-elevated)",
                        color: status === opt.id ? "#ffffff" : "var(--fg)",
                        border: "1px solid var(--line)",
                      }}
                      onClick={() => setStatus(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {allowPlusOnes && status === "going" && maxPlusOnes > 0 ? (
                  <div className="field">
                    <label htmlFor="plus">Plus-ones (up to {maxPlusOnes})</label>
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
              </>
            ) : null}

            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

            <button type="submit" className="btn btn-primary w-full py-4 text-base" disabled={loading}>
              {loading ? "Joining…" : rsvpEnabled ? "Confirm & enter" : "Enter the hub"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
