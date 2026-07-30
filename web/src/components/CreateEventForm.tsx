"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlanPicker } from "@/components/PlanPicker";
import { ThemePreview } from "@/components/ThemePreview";
import { ATMOSPHERES, type AtmosphereId } from "@/lib/atmospheres";
import {
  guestLimitLabel,
  getPlan,
  PLANS,
  type PlanId,
} from "@/lib/plans";

type UseCase = "friends" | "celebration";
type BillingMode = "subscription" | "instant";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateEventForm({
  host,
  mode,
}: {
  host: {
    displayName: string;
    email: string | null;
    plan: string;
    organizationName: string | null;
  };
  mode: BillingMode;
}) {
  const router = useRouter();
  const isInstant = mode === "instant";
  const subscriptionPlan = (host.plan || "free") as PlanId;
  const [eventPlan, setEventPlan] = useState<PlanId>("free");
  const activePlanId = isInstant ? eventPlan : subscriptionPlan;
  const plan = getPlan(activePlanId);
  const isPro = activePlanId === "pro";

  const [useCase, setUseCase] = useState<UseCase>("celebration");
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState(host.displayName);
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [inviteCopy, setInviteCopy] = useState("");
  const [inviteStickers, setInviteStickers] = useState("🎉✨");
  const [passcode, setPasscode] = useState("");
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(21, 0, 0, 0);
    return toLocalInputValue(d);
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

  // Sync caps when plan changes
  useEffect(() => {
    setDurationHours(plan.limits.maxDurationHours);
    setMaxGuests(plan.limits.maxGuests);
    setMaxMedia(plan.limits.maxMedia);
    setMaxMediaPerGuest(plan.limits.maxMediaPerGuestDefault);
    setUploadWindowHours(isPro ? 24 : plan.limits.maxDurationHours);
    setRequireApproval(isPro);
    setRsvpEnabled(isPro);
  }, [activePlanId, isPro, plan.limits]);

  const retentionHours = durationHours;
  const instantFee = isInstant ? PLANS[eventPlan].instant.priceCents : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
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
          inviteStickers: isPro ? inviteStickers : "",
          useCase,
          retentionHours,
          uploadWindowHours: isPro ? uploadWindowHours : retentionHours,
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
          startAt: startAt ? new Date(startAt).toISOString() : null,
          billingMode: mode,
          planTier: activePlanId,
          confirmInstantPayment: isInstant && instantFee > 0,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/signup?next=${encodeURIComponent(`/create?mode=${mode}`)}`);
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

  const ctaLabel = isInstant
    ? instantFee > 0
      ? `Pay ${PLANS[eventPlan].instant.priceLabel.replace(" once", "")} · create event`
      : "Create free event"
    : "Create event";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)] lg:items-start">
      <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 fade-up">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            {isInstant ? "Instant event · one-time only" : "New event · subscription"}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--navy)]">
            {isInstant ? "Create this event" : "Create a new event"}
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            {isInstant
              ? "Free is $0. Pro is a one-time fee for this event — not a subscription. Professional is coming soon."
              : "Uses your plan limits. No extra payment for this event."}
          </p>
        </div>

        {!isInstant ? (
          <div className="rounded-xl border border-[rgba(79,125,98,0.35)] bg-[#e7f0ea] px-4 py-3 text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--ok)]">
              Included with {plan.label}
            </p>
            <p className="mt-1">
              Up to {guestLimitLabel(plan.limits.maxGuests)} · {plan.limits.maxMedia}{" "}
              photos · {plan.limits.maxDurationHours}h max
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              One-time event plan
            </p>
            <PlanPicker mode="instant" value={eventPlan} onChange={setEventPlan} />
            {instantFee > 0 ? (
              <div className="rounded-xl border border-[var(--line)] bg-[rgba(228,165,118,0.16)] px-4 py-3">
                <p className="font-semibold text-[var(--navy)]">One-time payment</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Not a subscription. You pay once for this single event’s Pro features.
                  Checkout is simulated until Stripe is connected.
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
                  {PLANS[eventPlan].instant.priceLabel.replace(" once", "")}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { id: "friends" as const, title: "Friends", blurb: "Trips & dinners · 48h" },
              {
                id: "celebration" as const,
                title: "Celebrations",
                blurb: "Birthdays & weddings · 7 days + RSVP",
              },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setUseCase(option.id)}
              className="rounded-xl border p-4 text-left transition"
              style={{
                borderColor: useCase === option.id ? "var(--terracotta)" : "var(--line)",
                background: useCase === option.id ? "rgba(228,165,118,0.18)" : "white",
              }}
            >
              <p className="font-[family-name:var(--font-display)] text-xl">{option.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{option.blurb}</p>
            </button>
          ))}
        </div>

        <div>
          <p className="text-sm text-[var(--muted)] mb-2">Atmosphere theme</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ATMOSPHERES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAtmosphere(a.id)}
                className="rounded-xl border p-3 text-left transition"
                style={{
                  borderColor: atmosphere === a.id ? "var(--navy)" : "var(--line)",
                  background: a.bg,
                  color: a.id === "dinner" || a.id === "party" ? "#f7f1ea" : "#152935",
                  boxShadow:
                    atmosphere === a.id ? "0 0 0 2px rgba(21,41,53,0.25)" : undefined,
                }}
              >
                <p className="font-semibold">{a.label}</p>
                <p className="text-xs opacity-80 mt-1">{a.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:hidden">
          <ThemePreview atmosphere={atmosphere} title={title} hostName={hostName} />
        </div>

        <div className="field">
          <label htmlFor="title">Event name</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={useCase === "friends" ? "Amritsar trip" : "Sara’s Birthday"}
            required
            maxLength={80}
          />
        </div>

        <div className="field">
          <label htmlFor="host">Host name (shown to guests)</label>
          <input
            id="host"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Alex"
            required
            maxLength={40}
          />
          {host.email ? (
            <p className="text-xs text-[var(--muted)] mt-1">
              {host.organizationName ? `${host.organizationName} · ` : null}
              {host.email}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="start">
            Event start {useCase === "celebration" || rsvpEnabled ? "(required)" : "(optional)"}
          </label>
          <input
            id="start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required={useCase === "celebration"}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="duration">Event duration (hours)</label>
            <input
              id="duration"
              type="number"
              min={1}
              max={plan.limits.maxDurationHours}
              value={durationHours}
              disabled={!isPro}
              onChange={(e) => setDurationHours(Number(e.target.value))}
            />
            {!isPro ? (
              <p className="text-xs text-[var(--muted)] mt-1">Free is fixed at 24 hours.</p>
            ) : (
              <p className="text-xs text-[var(--muted)] mt-1">Pro max 7 days (168h).</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="uploadWindow">Guest upload window (hours)</label>
            <input
              id="uploadWindow"
              type="number"
              min={1}
              max={durationHours}
              value={uploadWindowHours}
              disabled={!isPro}
              onChange={(e) => setUploadWindowHours(Number(e.target.value))}
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              After this, guests stop uploading; you curate.
            </p>
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
            <label htmlFor="maxMedia">Max photos total</label>
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
            <label htmlFor="perGuest">Max photos / guest</label>
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
          <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4">
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
                placeholder="You’re invited — can’t wait to celebrate with you!"
              />
            </div>
            <div className="field">
              <label htmlFor="stickers">Emojis / stickers</label>
              <input
                id="stickers"
                value={inviteStickers}
                onChange={(e) => setInviteStickers(e.target.value)}
                placeholder="🎉✨📸"
              />
            </div>
            <div className="field">
              <label htmlFor="visibility">What guests can see</label>
              <select
                id="visibility"
                value={guestVisibility}
                onChange={(e) =>
                  setGuestVisibility(
                    e.target.value as "own_only" | "approved_public" | "all_members",
                  )
                }
              >
                <option value="own_only">Only their own photos (+ published highlights)</option>
                <option value="approved_public">All approved photos</option>
                <option value="all_members">All members’ published photos</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
              />
              Require host approval before photos go live
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

        <div className="field">
          <label htmlFor="pass">Passcode (optional)</label>
          <input
            id="pass"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            minLength={4}
            maxLength={12}
          />
        </div>

        <div className="field">
          <label htmlFor="mode">How guests add photos</label>
          <select
            id="mode"
            value={uploadMode}
            onChange={(e) =>
              setUploadMode(e.target.value as "both" | "camera" | "library")
            }
          >
            <option value="both">Camera + library upload</option>
            <option value="camera">Camera only</option>
            <option value="library">Library upload only</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="dl">Default download policy</label>
          <select
            id="dl"
            value={downloadPolicy}
            onChange={(e) => setDownloadPolicy(e.target.value)}
          >
            <option value="members">All event members</option>
            <option value="going_only">Only RSVP Going</option>
            <option value="organizer_only">Host only</option>
            <option value="disabled">Nobody (disabled)</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {useCase === "celebration" ? (
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={rsvpEnabled}
                onChange={(e) => setRsvpEnabled(e.target.checked)}
              />
              Enable RSVP invite
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

        {useCase === "celebration" && rsvpEnabled ? (
          <div className="rounded-xl border border-[var(--line)] p-4 space-y-3 bg-white/60">
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
                <label htmlFor="maxplus">Max plus-ones per guest</label>
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

        <p className="text-sm text-[var(--muted)]">
          Gallery stays open for <strong>{retentionHours} hours</strong> from the start time.
        </p>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <button type="submit" className="btn btn-accent w-full" disabled={loading}>
          {loading ? "Creating…" : ctaLabel}
        </button>
      </form>

      <aside className="hidden lg:block sticky top-6 fade-up">
        <ThemePreview atmosphere={atmosphere} title={title} hostName={hostName} />
      </aside>
    </div>
  );
}
