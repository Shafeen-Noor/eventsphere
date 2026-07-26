"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type EventListItem = {
  id: string;
  slug: string;
  title: string;
  role: string;
  expired: boolean;
  memberCount: number;
  mediaCount: number;
  isOwner: boolean;
};

export function EventList({ events }: { events: EventListItem[] }) {
  const router = useRouter();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(slug: string, title: string) {
    const ok = confirm(
      `Delete “${title}”? This permanently removes the event, photos, RSVPs, and members.`,
    );
    if (!ok) return;

    setBusySlug(slug);
    setError(null);
    const res = await fetch(`/api/events/${slug}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusySlug(null);

    if (!res.ok) {
      setError(data?.error?.message || "Could not delete event");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="panel p-5 transition hover:border-[rgba(226,163,90,0.35)]"
          >
            <div className="flex items-start justify-between gap-3">
              <Link href={`/e/${event.slug}`} className="min-w-0 flex-1">
                <h3 className="font-[family-name:var(--font-display)] text-2xl truncate">
                  {event.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {event.memberCount} people · {event.mediaCount} photos
                </p>
              </Link>
              <span className="text-xs uppercase tracking-wider text-[var(--muted)] shrink-0">
                {event.expired ? "Expired" : event.role}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/e/${event.slug}`} className="btn btn-ghost px-3 py-1.5 text-sm">
                Open
              </Link>
              {event.isOwner ? (
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1.5 text-sm"
                  style={{ color: "var(--danger)", borderColor: "rgba(224,122,106,0.35)" }}
                  disabled={busySlug === event.slug}
                  onClick={() => remove(event.slug, event.title)}
                >
                  {busySlug === event.slug ? "Deleting…" : "Delete"}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
