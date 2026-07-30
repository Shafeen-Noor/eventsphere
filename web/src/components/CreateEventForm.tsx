"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemePreview } from "@/components/ThemePreview";
import { ATMOSPHERES, type AtmosphereId } from "@/lib/atmospheres";
import { getPlan, type PlanId } from "@/lib/plans";
import {
  formatInTimeZone,
  getDeviceTimeZone,
  timeZoneOptions,
  utcToZonedLocalInput,
  zonedLocalToUtc,
} from "@/lib/time";

type UseCase = "friends" | "celebration";
export type CreateMode = "free" | "onetime" | "subscription";

export function CreateEventForm({
  host,
  mode,
}: {
  host: {
    displayName: string;
    email: string | null;
    plan: string;
    organizationName: string | null;
    hasAccount?: boolean;
  };
  mode: CreateMode;
}) {
  const router = useRouter();
  const isFree = mode === "free";
  const isOnetime = mode === "onetime";
  const isPro = !isFree;
  const activePlanId: PlanId = isFree ? "free" : "pro";
  const plan = getPlan(activePlanId);

  const [useCase, setUseCase] = useState<UseCase>("celebration");
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState(host.displayName || "");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [inviteCopy, setInviteCopy] = useState("");
  const [passcode, setPasscode] = useState("");
  const [timeZone, setTimeZone] = useState(getDeviceTimeZone);
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return utcToZonedLocalInput(d, getDeviceTimeZone());
  });
  const [durationHours, setDurationHours] = useState(plan.limits.maxDurationHours);
  const [uploadWindowHours, setUploadWindowHours] = useState(
    isPro ? 24 : plan.limits.maxDurationHours,
  );
  const [maxGuests, setMaxGuests] = useState(plan.limits.maxGuests);
  const [maxMedia, setMaxMedia] = useState(plan.limits.maxMedia);
  const [maxMediaPerGuest, setMaxMediaPerGuest] = useState(
    plan.limits.maxMediaPerGuestDefault,
  );
  const [requireApproval, setRequireApproval] = useState(isPro);
  const [guestVisibility, setGuestVisibility] = useState<
    "own_only" | "approved_public" | "all_members"
  >("own_only");
  const [rsvpEnabled, setRsvpEnabled] = useState(isPro);
  const [allowPlusOnes, setAllowPlusOnes] = useState(true);
  const [maxPlusOnes, setMaxPlusOnes] = useState(2);
  const [uploadMode, setUploadMode] = useState<"both" | "camera" | "library">("both");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [atmosphere, setAtmosphere] = useState<AtmosphereId>("bday");
  const [downloadPolicy, setDownloadPolicy] = useState("members");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zones = useMemo(() => timeZoneOptions(timeZone), [timeZone]);

  const startUtc = useMemo(() => {
    if (!startAt) return null;
    const d = zonedLocalToUtc(startAt, timeZone);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [startAt, timeZone]);

  useEffect(() => {
    setDurationHours(plan.limits.maxDurationHours);
    setMaxGuests(plan.limits.maxGuests);
    setMaxMedia(plan.limits.maxMedia);
    setMaxMediaPerGuest(plan.limits.maxMediaPerGuestDefault);
    setUploadWindowHours(isPro ? 24 : plan.limits.maxDurationHours);
    setRequireApproval(isPro);
    setRsvpEnabled(isPro);
  }, [activePlanId, isPro, plan.limits]);

  const headline = isFree
    ? "Start a free event"
    : isOnetime
      ? "Create one Pro event"
      : "Create a new event";
  const subcopy = isFree
    ? "No account needed. 10 guests · 100 photos · 24 hours. Guests join by name."
    : isOnetime
      ? "One-time $49 for this event’s Pro controls — not a monthly subscription."
      : "Included in your Pro subscription. No per-event checkout.";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!hostName.trim()) throw new Error("Add a host name guests will see.");
      if (!startUtc) throw new Error("Pick a valid start time.");
      const wantsRsvp = isPro && useCase === "celebration" ? rsvpEnabled : false;
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          hostName,
          description,
          locationName,
          mapsUrl: isPro ? mapsUrl : "",
          inviteCopy: isPro ? inviteCopy : "",
          inviteStickers: "",
          useCase,
          retentionHours: durationHours,
          uploadWindowHours: isPro ? uploadWindowHours : durationHours,
          maxGuests,
          maxMedia,
          maxMediaPerGuest,
          guestVisibility: isPro ? guestVisibility : "own_only",
          requireApproval: isPro ? requireApproval : false,
          passcode: passcode.trim() || null,
          rsvpEnabled: wantsRsvp,
          allowPlusOnes: wantsRsvp ? allowPlusOnes : false,
          maxPlusOnes: wantsRsvp && allowPlusOnes ? maxPlusOnes : 0,
          uploadMode,
          commentsEnabled,
          atmosphere,
          downloadPolicy,
          downloadsEnabled: downloadPolicy !== "disabled",
          startAt: startUtc.toISOString(),
          billingMode: mode,
          planTier: activePlanId,
          confirmInstantPayment: isOnetime,
        }),
      });
      const data = await res.json();
      if (res.status === 401 && !isFree) {
        router.push(
          `/signup?path=${isOnetime ? "onetime" : "subscribe"}&next=${encodeURIComponent(`/create?mode=${mode}`)}`,
        );
        return;
      }
      if (res.status === 403 && data?.error?.code === "EMAIL_UNVERIFIED") {
        router.push(`/verify?next=${encodeURIComponent(`/create?mode=${mode}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data?.error?.message || "Could not create event");
      router.push(`/e/${data.event.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const cta = isFree
    ? "Create free event"
    : isOnetime
      ? "Pay $49 · create event"
      : "Create event";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)] lg:items-start">
      <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 fade-up">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            {isFree ? "Free · no account" : isOnetime ? "Pro · one-time" : "Pro · subscription"}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--navy)]">
            {headline}
          </h1>
          <p className="mt-2 text-[var(--muted)]">{subcopy}</p>
        </div>

        {isOnetime ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-4 py-3">
            <p className="font-semibold text-[var(--navy)]">One-time payment</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Checkout is simulated until Stripe is connected. You get full Pro controls for this
              single event.
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
              $49
            </p>
          </div>
        ) : null}

        {isFree ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--muted)]">
            Free is locked to 10 guests, 100 photos, and 24 hours.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { id: "friends" as const, title: "Friends", blurb: "Trips & dinners" },
              {
                id: "celebration" as const,
                title: "Celebrations",
                blurb: "Birthdays & weddings",
              },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setUseCase(option.id)}
              className="rounded-xl border p-4 text-left transition"
              style={{
                borderColor: useCase === option.id ? "var(--accent)" : "var(--line)",
                background: useCase === option.id ? "var(--accent-soft)" : "var(--bg-elevated)",
              }}
            >
              <p className="font-[family-name:var(--font-display)] text-xl">{option.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{option.blurb}</p>
            </button>
          ))}
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-[var(--navy)]">Atmosphere</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ATMOSPHERES.map((a) => {
              const selected = atmosphere === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAtmosphere(a.id)}
                  className="group relative overflow-hidden rounded-2xl border text-left transition"
                  style={{
                    borderColor: selected ? a.accent : "var(--line)",
                    boxShadow: selected ? `0 10px 28px ${a.accent}33` : "none",
                  }}
                >
                  <div
                    className="relative min-h-[108px] p-4"
                    style={{ background: a.bg, color: a.fg }}
                  >
                    <div
                      className="absolute -right-3 -top-3 h-20 w-20 rounded-full opacity-40"
                      style={{ background: a.accent }}
                    />
                    <div className="relative flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">
                          {a.layout} gallery
                        </p>
                        <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                          {a.label}
                        </p>
                        <p className="mt-1 text-xs opacity-80">{a.blurb}</p>
                      </div>
                      <span className="text-3xl leading-none drop-shadow-sm" aria-hidden>
                        {a.motif}
                      </span>
                    </div>
                    {selected ? (
                      <span
                        className="absolute bottom-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: a.accent,
                          color:
                            a.id === "dinner" || a.id === "party" ? "#1c1b19" : "#fff",
                        }}
                      >
                        Selected
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label htmlFor="title">Event name</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sara’s Birthday"
            required
            maxLength={80}
          />
        </div>

        <div className="field">
          <label htmlFor="host">Your name (shown to guests)</label>
          <input
            id="host"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Alex"
            required
            maxLength={40}
          />
          {host.email ? (
            <p className="mt-1 text-xs text-[var(--muted)]">{host.email}</p>
          ) : isFree ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              No password — this event lives on this device until it ends.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="start">Event start</label>
            <input
              id="start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="tz">Timezone</label>
            <select id="tz" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        {startUtc ? (
          <p className="text-xs text-[var(--muted)] -mt-2">
            Guests always see this in <strong>their</strong> local time. Example:{" "}
            {formatInTimeZone(startUtc, timeZone)}
            {timeZone !== "Asia/Karachi" ? (
              <> · in Karachi {formatInTimeZone(startUtc, "Asia/Karachi")}</>
            ) : null}
            {timeZone !== "Europe/Madrid" ? (
              <> · in Madrid {formatInTimeZone(startUtc, "Europe/Madrid")}</>
            ) : null}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="duration">Event duration (hours)</label>
            <input
              id="duration"
              type="number"
              min={1}
              max={plan.limits.maxDurationHours}
              value={durationHours}
              disabled={isFree}
              onChange={(e) => setDurationHours(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="uploadWindow">Guest upload window (hours)</label>
            <input
              id="uploadWindow"
              type="number"
              min={1}
              max={durationHours}
              value={uploadWindowHours}
              disabled={isFree}
              onChange={(e) => setUploadWindowHours(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="field">
            <label htmlFor="maxGuests">Max guests</label>
            <input
              id="maxGuests"
              type="number"
              min={1}
              max={plan.limits.maxGuests}
              value={maxGuests}
              onChange={(e) => setMaxGuests(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="maxMedia">Max photos</label>
            <input
              id="maxMedia"
              type="number"
              min={1}
              max={plan.limits.maxMedia}
              value={maxMedia}
              onChange={(e) => setMaxMedia(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="perGuest">Per guest</label>
            <input
              id="perGuest"
              type="number"
              min={1}
              max={maxMedia}
              value={maxMediaPerGuest}
              onChange={(e) => setMaxMediaPerGuest(Number(e.target.value))}
            />
          </div>
        </div>

        {isPro ? (
          <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              Pro invite card
            </p>
            <div className="field">
              <label htmlFor="maps">Google Maps link</label>
              <input
                id="maps"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/…"
              />
            </div>
            <div className="field">
              <label htmlFor="inviteCopy">Custom card text</label>
              <textarea
                id="inviteCopy"
                value={inviteCopy}
                onChange={(e) => setInviteCopy(e.target.value)}
                rows={3}
                maxLength={400}
              />
            </div>
            <div className="field">
              <label htmlFor="visibility">Guest visibility</label>
              <select
                id="visibility"
                value={guestVisibility}
                onChange={(e) =>
                  setGuestVisibility(
                    e.target.value as "own_only" | "approved_public" | "all_members",
                  )
                }
              >
                <option value="own_only">Only their own photos (+ highlights)</option>
                <option value="approved_public">All approved photos</option>
                <option value="all_members">All members’ photos</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
              />
              Require approval before photos go live
            </label>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="location">Location (optional)</label>
          <input
            id="location"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="field">
          <label htmlFor="desc">Description (optional)</label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {isPro && useCase === "celebration" ? (
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={rsvpEnabled}
                onChange={(e) => setRsvpEnabled(e.target.checked)}
              />
              Enable RSVP
            </label>
          ) : null}
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={commentsEnabled}
              onChange={(e) => setCommentsEnabled(e.target.checked)}
            />
            Allow comments
          </label>
        </div>

        {isPro && useCase === "celebration" && rsvpEnabled ? (
          <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowPlusOnes}
                onChange={(e) => setAllowPlusOnes(e.target.checked)}
              />
              Allow plus-ones
            </label>
            {allowPlusOnes ? (
              <div className="field max-w-[160px]">
                <label htmlFor="maxplus">Max plus-ones</label>
                <input
                  id="maxplus"
                  type="number"
                  min={0}
                  max={10}
                  value={maxPlusOnes}
                  onChange={(e) => setMaxPlusOnes(Number(e.target.value))}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : cta}
        </button>
      </form>

      <aside className="hidden lg:block sticky top-6 fade-up">
        <ThemePreview atmosphere={atmosphere} title={title} hostName={hostName} />
      </aside>
    </div>
  );
}
