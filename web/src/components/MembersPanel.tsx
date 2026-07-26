"use client";

import { useCallback, useEffect, useState } from "react";

type Member = {
  userId: string;
  displayName: string;
  role: string;
  joinedAt: string;
  mediaCount: number;
  canUpload: boolean;
  canDownload: boolean;
  rsvpStatus: string | null;
  plusOnes: number;
  isMe: boolean;
};

export function MembersPanel({
  slug,
  isOrganizer,
}: {
  slug: string;
  isOrganizer: boolean;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [useGuestPrivileges, setUseGuestPrivileges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${slug}/members`);
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || "Could not load members");
      return;
    }
    setMembers(data.members);
    setUseGuestPrivileges(Boolean(data.useGuestPrivileges));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(userId: string) {
    if (!confirm("Remove this person from the event?")) return;
    const res = await fetch(`/api/events/${slug}/members?userId=${userId}`, {
      method: "DELETE",
    });
    if (res.ok) load();
  }

  async function setMode(next: boolean) {
    setSaving(true);
    const res = await fetch(`/api/events/${slug}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useGuestPrivileges: next }),
    });
    setSaving(false);
    if (!res.ok) return;
    setUseGuestPrivileges(next);
  }

  async function setPrivilege(
    userId: string,
    patch: { canUpload?: boolean; canDownload?: boolean },
  ) {
    setSaving(true);
    const res = await fetch(`/api/events/${slug}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    setSaving(false);
    if (!res.ok) return;
    setUseGuestPrivileges(true);
    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, ...patch } : m)),
    );
  }

  const guests = members.filter((m) => m.role !== "organizer");

  return (
    <div className="space-y-4">
      {isOrganizer ? (
        <div className="panel p-5 space-y-3">
          <h3 className="font-[family-name:var(--font-display)] text-xl">
            Guest privileges
          </h3>
          <p className="text-sm text-[var(--muted)]">
            After RSVPs come in, choose exactly who can upload and download photos —
            not just “everyone” or “host only”.
          </p>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useGuestPrivileges}
              disabled={saving}
              onChange={(e) => setMode(e.target.checked)}
            />
            Manage upload & download per guest
          </label>
          {useGuestPrivileges && guests.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Waiting for guests to RSVP — then you can toggle their privileges below.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="panel p-5 space-y-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl">
          People ({members.length})
        </h3>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <ul className="divide-y divide-[var(--line)]">
          {members.map((m) => {
            const isHost = m.role === "organizer" || m.role === "co_organizer";
            return (
              <li key={m.userId} className="py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {m.displayName}
                      {m.isMe ? " (you)" : ""}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                      {m.role.replace("_", " ")}
                      {m.rsvpStatus ? ` · ${m.rsvpStatus}` : ""}
                      {m.plusOnes ? ` +${m.plusOnes}` : ""}
                      {` · ${m.mediaCount} uploads`}
                    </p>
                  </div>
                  {isOrganizer && !m.isMe && !isHost ? (
                    <button
                      type="button"
                      className="btn btn-ghost px-3 py-1 text-xs"
                      onClick={() => remove(m.userId)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                {isOrganizer && useGuestPrivileges && !isHost ? (
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={m.canUpload}
                        disabled={saving}
                        onChange={(e) =>
                          setPrivilege(m.userId, { canUpload: e.target.checked })
                        }
                      />
                      Can upload
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={m.canDownload}
                        disabled={saving}
                        onChange={(e) =>
                          setPrivilege(m.userId, { canDownload: e.target.checked })
                        }
                      />
                      Can download
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
