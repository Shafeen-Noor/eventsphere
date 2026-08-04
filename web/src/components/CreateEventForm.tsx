"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EVENT_TYPES, type EventTypeId } from "@/lib/plans";
import {
  getDeviceTimeZone,
  timeZoneOptions,
  utcToZonedLocalInput,
  zonedLocalToUtc,
} from "@/lib/time";

export type CreateMode = "free" | "essential" | "premium" | "enterprise";

export function CreateEventForm({
  host,
  mode = "free",
}: {
  host: {
    displayName: string;
    email?: string | null;
    plan?: string;
    organizationName?: string | null;
    hasAccount?: boolean;
  };
  mode?: CreateMode | string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [eventType, setEventType] = useState<EventTypeId>("party");
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState(host.displayName || "");
  const [timeZone, setTimeZone] = useState(getDeviceTimeZone);
  const [startAt, setStartAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return utcToZonedLocalInput(d, getDeviceTimeZone());
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zones = useMemo(() => timeZoneOptions(timeZone), [timeZone]);
  const startUtc = useMemo(() => {
    if (!startAt) return null;
    const d = zonedLocalToUtc(startAt, timeZone);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [startAt, timeZone]);

  const typeLabel =
    EVENT_TYPES.find((t) => t.id === eventType)?.label || "Event";

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error("Add an event name.");
      if (!hostName.trim()) throw new Error("Add a host name guests will see.");
      if (!startUtc) throw new Error("Pick a valid start time.");

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingMode: "free",
          eventType,
          title: title.trim(),
          hostName: hostName.trim(),
          startAt: startUtc.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Could not create event");
      }
      router.push(`/e/${data.event.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="es-site mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
        {mode === "free" || !mode ? "Free event" : `Create · ${mode}`}
      </p>
      <h1 className="section-title mt-2 text-4xl sm:text-5xl">
        {step === 1 ? "What kind of night?" : "Name it & set the time"}
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        {step === 1
          ? "Choose a type so guests get the right vibe. No account needed."
          : `Creating a ${typeLabel.toLowerCase()} — guests join by name.`}
      </p>

      {step === 1 ? (
        <div className="mt-8 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {EVENT_TYPES.map((type) => {
              const selected = eventType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  className={`create-type-card ${selected ? "is-selected" : ""}`}
                  onClick={() => setEventType(type.id)}
                >
                  <span className="font-semibold text-[var(--fg)]">{type.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
      ) : (
        <form onSubmit={onCreate} className="mt-8 space-y-5">
          <div className="field">
            <label htmlFor="title">Event name</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={80}
              placeholder={`${typeLabel} with friends`}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="host">Host name</label>
            <input
              id="host"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              required
              maxLength={40}
              placeholder="Alex"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="start">Starts</label>
              <input
                id="start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="tz">Time zone</label>
              <select
                id="tz"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? "Creating…" : "Create event"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
