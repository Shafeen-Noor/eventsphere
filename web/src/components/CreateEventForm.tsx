"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ThemePreview } from "@/components/ThemePreview";
import { ATMOSPHERES, type AtmosphereId } from "@/lib/atmospheres";

type UseCase = "friends" | "celebration";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateEventForm({
  host,
}: {
  host: { displayName: string; email: string | null };
}) {
  const router = useRouter();
  const [useCase, setUseCase] = useState<UseCase>("celebration");
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState(host.displayName);
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(21, 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [allowPlusOnes, setAllowPlusOnes] = useState(true);
  const [maxPlusOnes, setMaxPlusOnes] = useState(2);
  const [uploadMode, setUploadMode] = useState<"both" | "camera" | "library">("both");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [atmosphere, setAtmosphere] = useState<AtmosphereId>("bday");
  const [downloadPolicy, setDownloadPolicy] = useState("members");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retentionHours = useMemo(
    () => (useCase === "friends" ? 48 : 168),
    [useCase],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const wantsRsvp = useCase === "celebration" ? rsvpEnabled : false;
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          hostName,
          description,
          locationName,
          useCase,
          retentionHours,
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
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/signup?next=/create");
        return;
      }
      if (!res.ok) throw new Error(data?.error?.message || "Could not create event");
      router.push(`/e/${data.event.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)] lg:items-start">
      <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 fade-up">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--navy)]">
            Create an event
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Send the invite first. Guests RSVP now — the gallery opens at your start time.
          </p>
        </div>

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
            placeholder={useCase === "friends" ? "Amritsar trip" : "Sara & Dan’s wedding"}
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
            <p className="text-xs text-[var(--muted)] mt-1">Signed in as {host.email}</p>
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
          <p className="text-xs text-[var(--muted)] mt-1">
            Guests only see the RSVP until this moment — then uploads & gallery unlock.
          </p>
        </div>

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
          <p className="text-xs text-[var(--muted)] mt-1">
            After RSVPs arrive, you can switch to per-guest upload/download privileges.
          </p>
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

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : "Create & send invites"}
        </button>
      </form>

      <aside className="hidden lg:block sticky top-6 fade-up">
        <ThemePreview atmosphere={atmosphere} title={title} hostName={hostName} />
      </aside>
    </div>
  );
}
