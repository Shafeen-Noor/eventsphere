"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatedInvite } from "@/components/AnimatedInvite";
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
  atmosphere: string;
  requiresPasscode: boolean;
  rsvpEnabled: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  collectContacts?: boolean;
};

export function InviteCard({
  slug,
  title,
  description,
  hostName,
  locationName,
  mapsUrl = "",
  inviteCopy = "",
  startAt,
  atmosphere,
  requiresPasscode,
  rsvpEnabled,
  allowPlusOnes,
  maxPlusOnes,
  collectContacts = false,
}: Props) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [status, setStatus] = useState<"going" | "maybe" | "declined">("going");
  const [plusOnes, setPlusOnes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whenLabel = useMemo(() => formatEventWhen(startAt), [startAt]);

  const plusOptions = useMemo(() => {
    const max = Math.max(0, maxPlusOnes);
    return Array.from({ length: max + 1 }, (_, i) => i);
  }, [maxPlusOnes]);

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
    <div className="grid gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <AnimatedInvite
        atmosphere={atmosphere}
        title={title}
        hostName={hostName}
        whenLabel={whenLabel}
        locationName={locationName}
        inviteCopy={inviteCopy}
        description={description}
        autoOpen
      >
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex underline opacity-90"
            onClick={(e) => e.stopPropagation()}
          >
            Open in Google Maps
          </a>
        ) : null}
      </AnimatedInvite>

      <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 max-w-md w-full fade-up">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl">
            {rsvpEnabled ? "Will you be there?" : "Join this event"}
          </h2>
          <p className="mt-2 text-[var(--muted)]">
            {collectContacts
              ? "Add your name plus email or WhatsApp for invite updates."
              : rsvpEnabled
                ? "Confirm your name and RSVP."
                : "Enter your name to join the shared gallery."}
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
              <label htmlFor="wa">WhatsApp number</label>
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
                    background: status === opt.id ? "var(--accent)" : "#ffffff",
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

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading
            ? "Sending…"
            : rsvpEnabled
              ? "Confirm RSVP"
              : "Join event"}
        </button>
      </form>
    </div>
  );
}
