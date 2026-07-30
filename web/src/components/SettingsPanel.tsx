"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ThemePreview } from "@/components/ThemePreview";
import { ATMOSPHERES, type AtmosphereId } from "@/lib/atmospheres";
import {
  getDeviceTimeZone,
  timeZoneOptions,
  utcToZonedLocalInput,
  zonedLocalToUtc,
} from "@/lib/time";

type EventSettings = {
  title: string;
  description: string;
  locationName: string;
  commentsEnabled: boolean;
  rsvpEnabled: boolean;
  uploadsEnabled: boolean;
  requireRsvpToUpload: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  uploadMode: string;
  startAt: string | null;
  atmosphere: string;
  downloadPolicy: string;
  downloadsEnabled: boolean;
  downloadOpensAt: string | null;
  useCase: string;
};

export function SettingsPanel({
  slug,
  initial,
}: {
  slug: string;
  initial: EventSettings;
}) {
  const router = useRouter();
  const [timeZone, setTimeZone] = useState(getDeviceTimeZone);
  const zones = useMemo(() => timeZoneOptions(timeZone), [timeZone]);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [locationName, setLocationName] = useState(initial.locationName);
  const [commentsEnabled, setCommentsEnabled] = useState(initial.commentsEnabled);
  const [rsvpEnabled, setRsvpEnabled] = useState(initial.rsvpEnabled);
  const [uploadsEnabled, setUploadsEnabled] = useState(initial.uploadsEnabled);
  const [requireRsvpToUpload, setRequireRsvpToUpload] = useState(
    initial.requireRsvpToUpload,
  );
  const [allowPlusOnes, setAllowPlusOnes] = useState(initial.allowPlusOnes);
  const [maxPlusOnes, setMaxPlusOnes] = useState(initial.maxPlusOnes);
  const [uploadMode, setUploadMode] = useState(initial.uploadMode);
  const [startAt, setStartAt] = useState(() =>
    utcToZonedLocalInput(initial.startAt, getDeviceTimeZone()),
  );
  const [atmosphere, setAtmosphere] = useState<AtmosphereId>(
    (initial.atmosphere as AtmosphereId) || "bday",
  );
  const [downloadPolicy, setDownloadPolicy] = useState(initial.downloadPolicy);
  const [downloadsEnabled, setDownloadsEnabled] = useState(initial.downloadsEnabled);
  const [downloadOpensAt, setDownloadOpensAt] = useState(() =>
    utcToZonedLocalInput(initial.downloadOpensAt, getDeviceTimeZone()),
  );
  const [passcode, setPasscode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>, success: string) {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/events/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data?.error?.message || "Could not update");
      return;
    }
    if (typeof body.uploadsEnabled === "boolean") setUploadsEnabled(body.uploadsEnabled);
    setMessage(success);
    router.refresh();
  }

  return (
    <div className="panel p-5 space-y-4">
      <h3 className="font-[family-name:var(--font-display)] text-xl">Event settings</h3>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 space-y-3">
        <p className="text-sm font-medium">Event start</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="start">When the gallery & uploads unlock</label>
            <input
              id="start"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="tz">Timezone</label>
            <select
              id="tz"
              value={timeZone}
              onChange={(e) => {
                const next = e.target.value;
                if (startAt) {
                  const utc = zonedLocalToUtc(startAt, timeZone);
                  setStartAt(utcToZonedLocalInput(utc, next));
                }
                if (downloadOpensAt) {
                  const utc = zonedLocalToUtc(downloadOpensAt, timeZone);
                  setDownloadOpensAt(utcToZonedLocalInput(utc, next));
                }
                setTimeZone(next);
              }}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Guests see this moment in their own local timezone.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 space-y-3">
        <p className="text-sm font-medium">Photo capture</p>
        <div className="field">
          <label htmlFor="mode">Guest capture mode</label>
          <select
            id="mode"
            value={uploadMode}
            onChange={(e) => setUploadMode(e.target.value)}
          >
            <option value="both">Camera + library upload</option>
            <option value="camera">Camera only</option>
            <option value="library">Library upload only</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || uploadsEnabled}
            onClick={() => patch({ uploadsEnabled: true }, "Uploads opened")}
          >
            Open uploads
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={saving || !uploadsEnabled}
            onClick={() => patch({ uploadsEnabled: false }, "Uploads closed")}
          >
            Close uploads
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 space-y-3">
        <p className="text-sm font-medium">RSVP & plus-ones</p>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rsvpEnabled}
            onChange={(e) => setRsvpEnabled(e.target.checked)}
          />
          RSVP enabled
        </label>
        {rsvpEnabled ? (
          <>
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
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requireRsvpToUpload}
                onChange={(e) => setRequireRsvpToUpload(e.target.checked)}
              />
              Require Going to upload
            </label>
          </>
        ) : null}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 space-y-3">
        <p className="text-sm font-medium">Downloads</p>
        <div className="field">
          <label htmlFor="dl">Download policy</label>
          <select
            id="dl"
            value={downloadPolicy}
            onChange={(e) => setDownloadPolicy(e.target.value)}
          >
            <option value="members">All members</option>
            <option value="going_only">Going only</option>
            <option value="organizer_only">Organizer only</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="opens">Downloads open at (optional)</label>
          <input
            id="opens"
            type="datetime-local"
            value={downloadOpensAt}
            onChange={(e) => setDownloadOpensAt(e.target.value)}
          />
        </div>
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
                className="relative overflow-hidden rounded-2xl border text-left"
                style={{
                  borderColor: selected ? a.accent : "var(--line)",
                  boxShadow: selected ? `0 8px 22px ${a.accent}33` : undefined,
                }}
              >
                <div className="min-h-[88px] p-3" style={{ background: a.bg, color: a.fg }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <strong className="font-[family-name:var(--font-display)] text-lg">
                        {a.label}
                      </strong>
                      <div className="mt-1 text-xs opacity-80">{a.blurb}</div>
                    </div>
                    <span className="text-2xl" aria-hidden>
                      {a.motif}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <ThemePreview atmosphere={atmosphere} title={title} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="stitle">Title</label>
        <input id="stitle" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="sloc">Location</label>
        <input id="sloc" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="sdesc">Description</label>
        <textarea
          id="sdesc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={commentsEnabled}
          onChange={(e) => setCommentsEnabled(e.target.checked)}
        />
        Comments
      </label>

      <div className="field">
        <label htmlFor="spass">New passcode</label>
        <input
          id="spass"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          maxLength={12}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() =>
            patch(
              {
                title,
                description,
                locationName,
                commentsEnabled,
                rsvpEnabled,
                requireRsvpToUpload,
                allowPlusOnes,
                maxPlusOnes,
                uploadMode,
                uploadsEnabled,
                startAt: startAt ? zonedLocalToUtc(startAt, timeZone).toISOString() : null,
                atmosphere,
                downloadPolicy,
                downloadsEnabled: downloadsEnabled && downloadPolicy !== "disabled",
                downloadOpensAt: downloadOpensAt
                  ? zonedLocalToUtc(downloadOpensAt, timeZone).toISOString()
                  : null,
                ...(passcode.trim() ? { passcode: passcode.trim() } : {}),
              },
              "Settings saved",
            )
          }
        >
          Save settings
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => patch({ extendHours: 48 }, "Extended by 48 hours")}
        >
          Extend +48h
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={() => patch({ state: "ended" }, "Event ended")}
        >
          End event
        </button>
      </div>

      <div className="rounded-xl border border-[rgba(196,92,74,0.35)] p-4 space-y-3">
        <p className="text-sm font-medium text-[var(--danger)]">Danger zone</p>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ color: "var(--danger)", borderColor: "rgba(196,92,74,0.45)" }}
          disabled={saving}
          onClick={async () => {
            if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
            setSaving(true);
            const res = await fetch(`/api/events/${slug}`, { method: "DELETE" });
            setSaving(false);
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data?.error?.message || "Could not delete");
              return;
            }
            router.push("/");
            router.refresh();
          }}
        >
          Delete event forever
        </button>
      </div>

      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
