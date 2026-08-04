"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { Gallery } from "@/components/Gallery";
import { HostDashboard } from "@/components/HostDashboard";
import { MembersPanel } from "@/components/MembersPanel";
import { RsvpPanel } from "@/components/RsvpPanel";
import { UpgradeEventModal } from "@/components/UpgradeEventModal";
import { UploadPanel } from "@/components/UploadPanel";
import { getEventPhase, phaseLabel } from "@/lib/phase";
import {
  getPlan,
  type PlanFeatures,
} from "@/lib/plans";

type EventDto = {
  slug: string;
  title: string;
  description: string;
  hostName: string;
  expiresAt: string;
  startAt: string | null;
  endAt?: string | null;
  state: string;
  mediaCount: number;
  memberCount: number;
  useCase?: string;
  eventType?: string;
  locationName: string;
  inviteCopy?: string;
  mapsUrl?: string;
  rsvpEnabled: boolean;
  commentsEnabled: boolean;
  uploadsEnabled: boolean;
  requireRsvpToUpload: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  uploadMode: string;
  useGuestPrivileges: boolean;
  hasStarted: boolean;
  atmosphere: string;
  downloadPolicy: string;
  downloadsEnabled: boolean;
  downloadOpensAt: string | null;
  highlightsPublished: boolean;
  planTier: string;
  features?: PlanFeatures;
  maxGuests?: number;
  maxMedia?: number;
  disposableCamera?: boolean;
  hideUntilEventEnd?: boolean;
  whiteLabel?: boolean;
};

type HubSection =
  | "home"
  | "dashboard"
  | "gallery"
  | "upload"
  | "feed"
  | "guestbook"
  | "vote"
  | "schedule"
  | "story"
  | "slideshow"
  | "challenges"
  | "polls"
  | "seating"
  | "ask"
  | "audio"
  | "faces"
  | "recap"
  | "reel"
  | "mosaic"
  | "map"
  | "people"
  | "rsvp";

export function EventHub({
  event,
  role,
  canUploadPrivilege,
  canDownloadPrivilege: _canDownloadPrivilege,
  initialRsvpStatus,
  initialPlusOnes: _initialPlusOnes,
  appUrl,
}: {
  event: EventDto;
  role: string;
  canUploadPrivilege: boolean;
  canDownloadPrivilege: boolean;
  initialRsvpStatus: string | null;
  initialPlusOnes: number;
  appUrl: string;
}) {
  const router = useRouter();
  const plan = getPlan(event.planTier);
  const features = event.features || plan.features;
  const phase = getEventPhase(event);
  const isOrganizer = role === "organizer" || role === "co_organizer";
  const [section, setSection] = useState<HubSection>(
    isOrganizer ? "dashboard" : "home",
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(initialRsvpStatus);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [highlightsPublished] = useState(event.highlightsPublished);

  useEffect(() => setRsvpStatus(initialRsvpStatus), [initialRsvpStatus]);

  const expired = event.state === "expired" || event.state === "ended" || phase === "archive";
  const needsGoingRsvp =
    !isOrganizer &&
    event.rsvpEnabled &&
    event.requireRsvpToUpload &&
    rsvpStatus !== "going";
  const privilegeBlocksUpload =
    !isOrganizer && event.useGuestPrivileges && !canUploadPrivilege;
  const canUpload =
    !expired &&
    (isOrganizer || (event.uploadsEnabled && !needsGoingRsvp && !privilegeBlocksUpload));

  const nav: { id: HubSection; label: string; show: boolean }[] = useMemo(
    () => [
      { id: "home", label: "Home", show: true },
      { id: "dashboard", label: "Dashboard", show: isOrganizer },
      { id: "gallery", label: "Gallery", show: true },
      { id: "upload", label: "Upload", show: canUpload || isOrganizer },
      { id: "feed", label: "Feed", show: features.feed },
      { id: "guestbook", label: "Guestbook", show: features.guestbook },
      { id: "vote", label: "Vote", show: features.voting },
      { id: "schedule", label: "Schedule", show: features.timeline },
      { id: "story", label: "Story", show: features.timeline },
      { id: "slideshow", label: "Slideshow", show: features.slideshow },
      { id: "challenges", label: "Challenges", show: features.challenges },
      { id: "polls", label: "Polls", show: features.polls },
      { id: "seating", label: "Seating", show: features.seating },
      { id: "ask", label: "Ask AI", show: features.ai },
      { id: "audio", label: "Audio", show: features.audioMemories },
      { id: "faces", label: "Faces", show: features.faces },
      { id: "recap", label: "Recap", show: features.ai },
      { id: "reel", label: "Reel", show: true },
      { id: "mosaic", label: "Mosaic", show: true },
      { id: "map", label: "Map", show: Boolean(event.mapsUrl || event.locationName) },
      { id: "people", label: "People", show: true },
      { id: "rsvp", label: "RSVP", show: event.rsvpEnabled },
    ],
    [
      isOrganizer,
      canUpload,
      features,
      event.mapsUrl,
      event.locationName,
      event.rsvpEnabled,
    ],
  );

  return (
    <div className="es-site space-y-5 pb-16">
      <div className="phase-banner">
        <span>
          {phaseLabel(phase)}
          {event.eventType ? ` · ${event.eventType.replace(/_/g, " ")}` : ""}
        </span>
        <Countdown expiresAt={event.expiresAt} />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-4xl sm:text-5xl">{event.title}</h1>
          <p className="mt-2 text-[var(--muted)]">
            Hosted by {event.hostName}
            {event.locationName ? ` · ${event.locationName}` : ""}
            {` · ${event.memberCount} people · ${event.mediaCount} media`}
          </p>
          {event.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">{event.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isOrganizer && event.planTier === "free" ? (
            <button type="button" className="btn btn-primary" onClick={() => setUpgradeOpen(true)}>
              Upgrade
            </button>
          ) : null}
          {features.slideshow ? (
            <Link href={`/e/${event.slug}/slideshow`} className="btn btn-ghost">
              Fullscreen slideshow
            </Link>
          ) : null}
        </div>
      </header>

      <nav className="hub-nav" aria-label="Event sections">
        {nav
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              className={section === t.id ? "is-active" : undefined}
              onClick={() => setSection(t.id)}
            >
              {t.label}
            </button>
          ))}
      </nav>

      {section === "home" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nav
            .filter((t) => t.show && t.id !== "home")
            .slice(0, 9)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className="panel p-5 text-left transition hover:border-[var(--accent)]"
                onClick={() => setSection(t.id)}
              >
                <h3 className="section-title text-2xl">{t.label}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">Open {t.label.toLowerCase()}</p>
              </button>
            ))}
        </div>
      ) : null}

      {section === "dashboard" && isOrganizer ? (
        <HostDashboard
          event={{
            ...event,
            features,
            hostName: event.hostName,
          }}
          appUrl={appUrl}
          onOpenHub={() => setSection("home")}
        />
      ) : null}

      {section === "gallery" || section === "mosaic" ? (
        <Gallery
          slug={event.slug}
          refreshKey={refreshKey}
          commentsEnabled={event.commentsEnabled}
          atmosphere={event.atmosphere}
          eventClosed={expired}
          isOrganizer={isOrganizer}
          highlightsPublished={highlightsPublished}
          memoryCards={section === "mosaic"}
          filterMode={section === "mosaic" ? "highlights" : undefined}
        />
      ) : null}

      {section === "upload" ? (
        canUpload ? (
          <UploadPanel
            slug={event.slug}
            disabled={false}
            uploadMode={event.uploadMode as "both" | "camera" | "library"}
            onUploaded={() => setRefreshKey((k) => k + 1)}
          />
        ) : (
          <div className="panel p-5 text-sm text-[var(--muted)]">
            {needsGoingRsvp
              ? "RSVP as Going to unlock uploads."
              : "Uploads are closed right now."}
          </div>
        )
      ) : null}

      {section === "feed" && features.feed ? <FeedSection slug={event.slug} /> : null}
      {section === "guestbook" && features.guestbook ? (
        <GuestbookSection slug={event.slug} />
      ) : null}
      {section === "vote" && features.voting ? (
        <VoteSection slug={event.slug} refreshKey={refreshKey} atmosphere={event.atmosphere} commentsEnabled={event.commentsEnabled} />
      ) : null}
      {section === "schedule" && features.timeline ? (
        <ScheduleSection slug={event.slug} />
      ) : null}
      {section === "story" && features.timeline ? <StorySection slug={event.slug} /> : null}
      {section === "slideshow" && features.slideshow ? (
        <div className="panel p-6">
          <h3 className="section-title text-2xl">Slideshow</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Open fullscreen for the room display.
          </p>
          <Link href={`/e/${event.slug}/slideshow`} className="btn btn-primary mt-4">
            Launch slideshow
          </Link>
        </div>
      ) : null}
      {section === "challenges" && features.challenges ? (
        <ChallengesSection slug={event.slug} />
      ) : null}
      {section === "polls" && features.polls ? <PollsSection slug={event.slug} /> : null}
      {section === "seating" && features.seating ? <SeatingSection slug={event.slug} /> : null}
      {section === "ask" && features.ai ? <AskSection slug={event.slug} /> : null}
      {section === "audio" && features.audioMemories ? (
        <AudioSection slug={event.slug} />
      ) : null}
      {section === "faces" && features.faces ? <FacesSection slug={event.slug} /> : null}
      {section === "recap" && features.ai ? <RecapSection slug={event.slug} /> : null}
      {section === "reel" ? <ReelSection slug={event.slug} /> : null}
      {section === "map" ? (
        <div className="panel p-6 space-y-3">
          <h3 className="section-title text-2xl">Map</h3>
          <p className="text-[var(--muted)]">{event.locationName || "Location TBD"}</p>
          {event.mapsUrl ? (
            <a href={event.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
              Open in maps
            </a>
          ) : null}
        </div>
      ) : null}
      {section === "people" ? (
        <MembersPanel slug={event.slug} isOrganizer={isOrganizer} />
      ) : null}
      {section === "rsvp" && event.rsvpEnabled ? (
        <RsvpPanel
          slug={event.slug}
          allowPlusOnes={event.allowPlusOnes}
          maxPlusOnes={event.maxPlusOnes}
          onSaved={(status) => {
            setRsvpStatus(status);
            router.refresh();
          }}
        />
      ) : null}

      {features.branding ? (
        <p className="powered-by">
          Powered by <strong>EventSphere</strong>
        </p>
      ) : null}

      <UpgradeEventModal
        slug={event.slug}
        currentPlan={event.planTier}
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}

function FeedSection({ slug }: { slug: string }) {
  const [items, setItems] = useState<
    { id: string; title: string; body: string; actorName: string | null; createdAt: string }[]
  >([]);
  useEffect(() => {
    void fetch(`/api/events/${slug}/feed`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) setItems(d.items);
      });
  }, [slug]);
  return (
    <div className="panel p-5">
      <h3 className="section-title text-2xl">Live feed</h3>
      <ul className="feed-list mt-4">
        {items.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No activity yet.</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <strong>{item.actorName || "Guest"}</strong>
              <span>{item.title}</span>
              {item.body ? <p>{item.body}</p> : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function GuestbookSection({ slug }: { slug: string }) {
  const [entries, setEntries] = useState<
    { id: string; message: string; user: { displayName: string }; signatureSvg: string | null }[]
  >([]);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${slug}/guestbook`);
    const data = await res.json();
    if (res.ok) setEntries(data.entries || []);
  }, [slug]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/events/${slug}/guestbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (res.ok) {
      setMessage("");
      void load();
    }
  }
  return (
    <div className="panel space-y-4 p-5">
      <h3 className="section-title text-2xl">Guestbook</h3>
      <form onSubmit={submit} className="space-y-3">
        <textarea
          className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] p-3"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave a note…"
          required
        />
        <div className="signature-pad" aria-hidden>
          Sign with your words above
        </div>
        <button type="submit" className="btn btn-primary">
          Sign guestbook
        </button>
      </form>
      <ul className="space-y-3">
        {entries.map((e) => (
          <li key={e.id} className="border-t border-[var(--line)] pt-3">
            <p className="font-semibold">{e.user.displayName}</p>
            <p className="text-sm text-[var(--muted)]">{e.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VoteSection({
  slug,
  refreshKey,
  atmosphere,
  commentsEnabled,
}: {
  slug: string;
  refreshKey: number;
  atmosphere: string;
  commentsEnabled: boolean;
}) {
  async function onVote(mediaId: string) {
    await fetch(`/api/events/${slug}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId }),
    });
  }
  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <h3 className="section-title text-2xl">Photo vote</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Tap Vote on a photo you love.</p>
      </div>
      <Gallery
        slug={slug}
        refreshKey={refreshKey}
        commentsEnabled={commentsEnabled}
        atmosphere={atmosphere}
        onVote={(id) => void onVote(id)}
      />
    </div>
  );
}

function ScheduleSection({ slug }: { slug: string }) {
  const [items, setItems] = useState<{ id: string; title: string; location: string; startsAt: string | null }[]>([]);
  useEffect(() => {
    void fetch(`/api/events/${slug}/schedule`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) setItems(d.items);
      });
  }, [slug]);
  return (
    <div className="panel p-5">
      <h3 className="section-title text-2xl">Schedule</h3>
      <ul className="mt-4 space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No schedule yet.</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-[var(--muted)]">
                {[item.startsAt ? new Date(item.startsAt).toLocaleString() : null, item.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function StorySection({ slug }: { slug: string }) {
  const [chapters, setChapters] = useState<{ id: string; title: string; body: string }[]>([]);
  useEffect(() => {
    void fetch(`/api/events/${slug}/story`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.chapters)) setChapters(d.chapters);
      });
  }, [slug]);
  return (
    <div className="space-y-4">
      {chapters.length === 0 ? (
        <div className="panel p-5 text-sm text-[var(--muted)]">No story chapters yet.</div>
      ) : (
        chapters.map((c) => (
          <article key={c.id} className="panel p-5">
            <h3 className="section-title text-2xl">{c.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-[var(--muted)]">{c.body}</p>
          </article>
        ))
      )}
    </div>
  );
}

function ChallengesSection({ slug }: { slug: string }) {
  const [challenges, setChallenges] = useState<
    { id: string; title: string; description: string; submissionCount: number }[]
  >([]);
  useEffect(() => {
    void fetch(`/api/events/${slug}/challenges`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.challenges)) setChallenges(d.challenges);
      });
  }, [slug]);
  return (
    <div className="panel p-5">
      <h3 className="section-title text-2xl">Challenges</h3>
      <ul className="mt-4 space-y-3">
        {challenges.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No challenges yet.</li>
        ) : (
          challenges.map((c) => (
            <li key={c.id} className="border-t border-[var(--line)] pt-3">
              <p className="font-semibold">{c.title}</p>
              <p className="text-sm text-[var(--muted)]">
                {c.description || `${c.submissionCount} submissions`}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function PollsSection({ slug }: { slug: string }) {
  const [polls, setPolls] = useState<
    {
      id: string;
      question: string;
      options: { id: string; label: string; votes: number }[];
      myOptionId: string | null;
    }[]
  >([]);
  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${slug}/polls`);
    const data = await res.json();
    if (res.ok) setPolls(data.polls || []);
  }, [slug]);
  useEffect(() => {
    void load();
  }, [load]);
  async function vote(pollId: string, optionId: string) {
    await fetch(`/api/events/${slug}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, optionId }),
    });
    void load();
  }
  return (
    <div className="space-y-4">
      {polls.length === 0 ? (
        <div className="panel p-5 text-sm text-[var(--muted)]">No polls yet.</div>
      ) : (
        polls.map((poll) => (
          <div key={poll.id} className="panel space-y-3 p-5">
            <h3 className="section-title text-xl">{poll.question}</h3>
            {poll.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="btn btn-ghost w-full justify-between"
                onClick={() => void vote(poll.id, opt.id)}
              >
                <span>{opt.label}</span>
                <span className="text-[var(--muted)]">
                  {opt.votes}
                  {poll.myOptionId === opt.id ? " · yours" : ""}
                </span>
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function SeatingSection({ slug }: { slug: string }) {
  const [tables, setTables] = useState<
    { id: string; name: string; capacity: number; assignments: { guestName: string; seatLabel: string }[] }[]
  >([]);
  const [myTable, setMyTable] = useState<{ name: string; seatLabel: string } | null>(null);
  useEffect(() => {
    void fetch(`/api/events/${slug}/seating`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.tables)) setTables(d.tables);
        if (d.myTable) setMyTable(d.myTable);
      });
  }, [slug]);
  return (
    <div className="panel space-y-4 p-5">
      <h3 className="section-title text-2xl">Seating</h3>
      {myTable ? (
        <p className="text-sm">
          You’re at <strong>{myTable.name}</strong>
          {myTable.seatLabel ? ` · seat ${myTable.seatLabel}` : ""}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {tables.map((t) => (
          <div key={t.id} className="rounded-xl border border-[var(--line)] p-4">
            <p className="font-semibold">
              {t.name}{" "}
              <span className="text-sm text-[var(--muted)]">({t.capacity})</span>
            </p>
            <ul className="mt-2 text-sm text-[var(--muted)]">
              {t.assignments.map((a, i) => (
                <li key={i}>
                  {a.guestName || "Open"}
                  {a.seatLabel ? ` · ${a.seatLabel}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function AskSection({ slug }: { slug: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAnswer(null);
    const res = await fetch(`/api/events/${slug}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setAnswer(data.answer);
    else setAnswer(data?.error?.message || "Could not ask");
  }
  return (
    <form onSubmit={ask} className="panel space-y-3 p-5">
      <h3 className="section-title text-2xl">Ask about this event</h3>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
        placeholder="When is dinner?"
        required
      />
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Thinking…" : "Ask"}
      </button>
      {answer ? <p className="text-sm leading-relaxed">{answer}</p> : null}
    </form>
  );
}

function AudioSection({ slug }: { slug: string }) {
  const [items, setItems] = useState<{ id: string; title: string; url?: string }[]>([]);
  useEffect(() => {
    void fetch(`/api/events/${slug}/audio`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.memories || d.items)) setItems(d.memories || d.items);
      });
  }, [slug]);
  return (
    <div className="panel p-5">
      <h3 className="section-title text-2xl">Audio memories</h3>
      <ul className="mt-4 space-y-2 text-sm">
        {items.length === 0 ? (
          <li className="text-[var(--muted)]">No audio yet.</li>
        ) : (
          items.map((a) => (
            <li key={a.id}>
              {a.title || "Voice note"}
              {a.url ? <audio className="mt-1 w-full" controls src={a.url} /> : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function FacesSection({ slug }: { slug: string }) {
  const [collections, setCollections] = useState<{ id: string; label: string; count?: number }[]>([]);
  useEffect(() => {
    void fetch(`/api/events/${slug}/faces`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.collections || d.faces)) {
          setCollections(d.collections || d.faces);
        }
      });
  }, [slug]);
  return (
    <div className="panel p-5">
      <h3 className="section-title text-2xl">Faces</h3>
      <ul className="mt-4 space-y-2 text-sm">
        {collections.length === 0 ? (
          <li className="text-[var(--muted)]">No face groups yet.</li>
        ) : (
          collections.map((c) => (
            <li key={c.id}>
              {c.label || "Guest"} {c.count != null ? `· ${c.count}` : ""}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function RecapSection({ slug }: { slug: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function generate() {
    setLoading(true);
    const res = await fetch(`/api/events/${slug}/recap`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setSummary(data.recap?.summary || data.summary || "Recap ready.");
    else setSummary(data?.error?.message || "Could not generate recap");
  }
  useEffect(() => {
    void fetch(`/api/events/${slug}/recap`)
      .then((r) => r.json())
      .then((d) => {
        if (d.recap?.summary || d.summary) setSummary(d.recap?.summary || d.summary);
      });
  }, [slug]);
  return (
    <div className="panel space-y-3 p-5">
      <h3 className="section-title text-2xl">Event recap</h3>
      {summary ? <p className="leading-relaxed">{summary}</p> : null}
      <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void generate()}>
        {loading ? "Writing…" : summary ? "Refresh recap" : "Generate recap"}
      </button>
    </div>
  );
}

function ReelSection({ slug }: { slug: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    void fetch(`/api/events/${slug}/media?filter=all&sort=newest`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.media)) {
          setUrls(d.media.slice(0, 12).map((m: { url: string }) => m.url));
        }
      });
  }, [slug]);
  return (
    <div className="reel-viewport">
      {urls.length === 0 ? (
        <p className="p-6 text-sm text-[var(--muted)]">Upload photos to fill the reel.</p>
      ) : (
        urls.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt="" />
        ))
      )}
    </div>
  );
}
