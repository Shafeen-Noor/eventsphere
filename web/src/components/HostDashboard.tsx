"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SharePanel } from "@/components/SharePanel";
import { UpgradeEventModal } from "@/components/UpgradeEventModal";
import {
  EXTENSION_MONTH_CENTS,
  getPlan,
  guestLimitLabel,
  mediaLimitLabel,
  type PlanFeatures,
  type PlanId,
} from "@/lib/plans";
import { formatEventWhen } from "@/lib/time";

type HostEvent = {
  slug: string;
  title: string;
  description?: string;
  hostName?: string;
  planTier: string;
  features?: PlanFeatures;
  maxGuests?: number;
  maxMedia?: number;
  memberCount: number;
  mediaCount: number;
  locationName?: string;
  inviteCopy?: string;
  atmosphere?: string;
  startAt?: string | null;
  expiresAt?: string;
  disposableCamera?: boolean;
  hideUntilEventEnd?: boolean;
};

export function HostDashboard({
  event,
  appUrl,
  onOpenHub,
}: {
  event: HostEvent;
  appUrl: string;
  onOpenHub?: () => void;
}) {
  const router = useRouter();
  const plan = getPlan(event.planTier);
  const features = event.features || plan.features;
  const maxGuests = event.maxGuests ?? plan.maxGuests;
  const maxMedia = event.maxMedia ?? plan.maxMedia;

  const [description, setDescription] = useState(event.description || "");
  const [disposableCamera, setDisposableCamera] = useState(
    Boolean(event.disposableCamera),
  );
  const [hideUntilEventEnd, setHideUntilEventEnd] = useState(
    Boolean(event.hideUntilEventEnd),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [scheduleText, setScheduleText] = useState("");
  const [storyText, setStoryText] = useState("");
  const [challengeTitle, setChallengeTitle] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Yes\nNo");
  const [pending, setPending] = useState<
    { id: string; url: string; caption: string; uploader: { displayName: string } }[]
  >([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);

  const loadModeration = useCallback(async () => {
    if (!features.moderation) return;
    const res = await fetch(`/api/events/${event.slug}/moderation`);
    const data = await res.json();
    if (res.ok) setPending(data.pending || []);
  }, [event.slug, features.moderation]);

  const loadAnalytics = useCallback(async () => {
    if (!features.analytics) return;
    const res = await fetch(`/api/events/${event.slug}/analytics`);
    const data = await res.json();
    if (res.ok) setStats(data.stats || null);
  }, [event.slug, features.analytics]);

  useEffect(() => {
    void loadModeration();
    void loadAnalytics();
  }, [loadModeration, loadAnalytics]);

  async function saveCustomize() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/events/${event.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        disposableCamera,
        hideUntilEventEnd,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data?.error?.message || "Could not save");
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  async function saveSchedule() {
    const items = scheduleText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title, i) => ({ title, description: "", location: "", sortOrder: i }));
    const res = await fetch(`/api/events/${event.slug}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    setMsg(res.ok ? "Schedule saved" : "Schedule needs Essential+");
  }

  async function saveStory() {
    const chapters = storyText
      .split("\n\n")
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block, i) => {
        const [title, ...rest] = block.split("\n");
        return { title: title || `Chapter ${i + 1}`, body: rest.join("\n"), mediaIds: [], sortOrder: i };
      });
    const res = await fetch(`/api/events/${event.slug}/story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chapters),
    });
    setMsg(res.ok ? "Story saved" : "Story needs Essential+");
  }

  async function createChallenge() {
    if (!challengeTitle.trim()) return;
    const res = await fetch(`/api/events/${event.slug}/challenges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: challengeTitle.trim() }),
    });
    if (res.ok) {
      setChallengeTitle("");
      setMsg("Challenge created");
    } else setMsg("Challenges need Essential+");
  }

  async function createPoll() {
    const options = pollOptions
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) return;
    const res = await fetch(`/api/events/${event.slug}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: pollQuestion.trim(), options }),
    });
    if (res.ok) {
      setPollQuestion("");
      setMsg("Poll created");
    } else setMsg("Polls need Essential+");
  }

  async function moderate(mediaId: string, action: "approve" | "reject") {
    await fetch(`/api/events/${event.slug}/moderation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, action }),
    });
    void loadModeration();
  }

  async function extendMonth() {
    const res = await fetch(`/api/events/${event.slug}/extend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months: 1, confirmPayment: true }),
    });
    const data = await res.json();
    setMsg(
      res.ok
        ? `Extended 1 month (+$${(EXTENSION_MONTH_CENTS / 100).toFixed(0)})`
        : data?.error?.message || "Could not extend",
    );
    if (res.ok) router.refresh();
  }

  const guestPct = Math.min(100, Math.round((event.memberCount / Math.max(1, maxGuests)) * 100));
  const mediaPct = Math.min(100, Math.round((event.mediaCount / Math.max(1, maxMedia)) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Host dashboard · {plan.label}
          </p>
          <h2 className="section-title mt-1 text-3xl">{event.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenHub ? (
            <button type="button" className="btn btn-ghost" onClick={onOpenHub}>
              Open hub
            </button>
          ) : null}
          {(event.planTier as PlanId) !== "premium" &&
          (event.planTier as PlanId) !== "enterprise" ? (
            <button type="button" className="btn btn-primary" onClick={() => setUpgradeOpen(true)}>
              Upgrade event
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={() => void extendMonth()}>
            Extend +1 month
          </button>
        </div>
      </div>

      <div className="limit-card">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Guests</p>
          <p className="mt-1 font-semibold">
            {event.memberCount} / {guestLimitLabel(maxGuests)}
          </p>
          <div className="limit-bar">
            <span style={{ width: `${guestPct}%` }} />
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Media</p>
          <p className="mt-1 font-semibold">
            {event.mediaCount} / {mediaLimitLabel(maxMedia)}
          </p>
          <div className="limit-bar">
            <span style={{ width: `${mediaPct}%` }} />
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Expires</p>
          <p className="mt-1 font-semibold text-sm">
            {event.expiresAt ? formatEventWhen(event.expiresAt) : "—"}
          </p>
        </div>
      </div>

      <SharePanel
        slug={event.slug}
        appUrl={appUrl}
        title={event.title}
        hostName={event.hostName || "Host"}
        locationName={event.locationName || ""}
        inviteCopy={event.inviteCopy || ""}
        atmosphere={event.atmosphere || "party"}
        whenLabel={event.startAt ? formatEventWhen(event.startAt) : null}
      />

      <div className="panel space-y-4 p-5">
        <h3 className="section-title text-2xl">Customize</h3>
        <div className="field">
          <label htmlFor="desc">Description</label>
          <textarea
            id="desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={disposableCamera}
            onChange={(e) => setDisposableCamera(e.target.checked)}
          />
          Disposable camera mode
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideUntilEventEnd}
            onChange={(e) => setHideUntilEventEnd(e.target.checked)}
          />
          Hide gallery until event ends
        </label>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveCustomize()}>
          {saving ? "Saving…" : "Save customize"}
        </button>
      </div>

      {features.timeline ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel space-y-3 p-5">
            <h3 className="section-title text-xl">Schedule editor</h3>
            <p className="text-sm text-[var(--muted)]">One item per line.</p>
            <textarea
              className="field w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg-elevated)] p-3"
              rows={5}
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              placeholder={"Doors open\nDinner\nFirst dance"}
            />
            <button type="button" className="btn btn-ghost" onClick={() => void saveSchedule()}>
              Save schedule
            </button>
          </div>
          <div className="panel space-y-3 p-5">
            <h3 className="section-title text-xl">Story editor</h3>
            <p className="text-sm text-[var(--muted)]">Chapters separated by a blank line.</p>
            <textarea
              className="field w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg-elevated)] p-3"
              rows={5}
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder={"Chapter title\nBody text\n\nNext chapter"}
            />
            <button type="button" className="btn btn-ghost" onClick={() => void saveStory()}>
              Save story
            </button>
          </div>
        </div>
      ) : null}

      {features.challenges || features.polls ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {features.challenges ? (
            <div className="panel space-y-3 p-5">
              <h3 className="section-title text-xl">Create challenge</h3>
              <input
                value={challengeTitle}
                onChange={(e) => setChallengeTitle(e.target.value)}
                placeholder="Best toast photo"
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2"
              />
              <button type="button" className="btn btn-ghost" onClick={() => void createChallenge()}>
                Add challenge
              </button>
            </div>
          ) : null}
          {features.polls ? (
            <div className="panel space-y-3 p-5">
              <h3 className="section-title text-xl">Create poll</h3>
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Song for the last dance?"
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2"
              />
              <textarea
                rows={3}
                value={pollOptions}
                onChange={(e) => setPollOptions(e.target.value)}
                className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2"
              />
              <button type="button" className="btn btn-ghost" onClick={() => void createPoll()}>
                Add poll
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {features.moderation ? (
        <div className="panel space-y-3 p-5">
          <h3 className="section-title text-xl">Moderation queue</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No pending media.</p>
          ) : (
            <ul className="space-y-3">
              {pending.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{item.uploader.displayName}</p>
                    <p className="text-[var(--muted)]">{item.caption || "No caption"}</p>
                  </div>
                  <button type="button" className="btn btn-primary px-3 py-1.5 text-sm" onClick={() => void moderate(item.id, "approve")}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => void moderate(item.id, "reject")}>
                    Reject
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {features.analytics && stats ? (
        <div className="panel space-y-3 p-5">
          <h3 className="section-title text-xl">Analytics</h3>
          <div className="heatmap-bars">
            {[
              ["Members", stats.members],
              ["Published", stats.mediaPublished],
              ["Likes", stats.likes],
              ["Reactions", stats.reactions],
              ["Guestbook", stats.guestbook],
              ["Votes", stats.votes],
            ].map(([label, value]) => (
              <div key={String(label)} className="heatmap-bar">
                <span>{label as string}</span>
                <strong>{Number(value || 0)}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-[var(--muted)]">{msg}</p> : null}

      <UpgradeEventModal
        slug={event.slug}
        currentPlan={event.planTier}
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
