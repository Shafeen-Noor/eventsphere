"use client";

import JSZip from "jszip";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HighlightsStudio } from "@/components/HighlightsStudio";
import { getAtmosphere } from "@/lib/atmospheres";
import { HIGHLIGHT_MAX } from "@/lib/highlights";

type MediaItem = {
  id: string;
  type: string;
  caption: string;
  contentType?: string;
  url: string;
  originalUrl: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isMine: boolean;
  canDelete: boolean;
  canDownload: boolean;
  isHighlight?: boolean;
  state?: string;
  uploader: { id: string; displayName: string };
  createdAt: string;
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; displayName: string };
  isMine: boolean;
};

export function Gallery({
  slug,
  refreshKey,
  commentsEnabled,
  atmosphere,
  eventClosed = false,
  isOrganizer = false,
  highlightsPublished = false,
  onHighlightsPublished,
}: {
  slug: string;
  refreshKey: number;
  commentsEnabled: boolean;
  atmosphere: string;
  eventClosed?: boolean;
  isOrganizer?: boolean;
  highlightsPublished?: boolean;
  onHighlightsPublished?: (published: boolean) => void;
}) {
  const theme = getAtmosphere(atmosphere);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canDownload, setCanDownload] = useState(false);
  const [downloadBlockedReason, setDownloadBlockedReason] = useState<string | null>(null);
  const [canCurate, setCanCurate] = useState(false);
  const [published, setPublished] = useState(highlightsPublished);
  const [pendingCount, setPendingCount] = useState(0);
  const [highlightTemplate, setHighlightTemplate] = useState("ig8");
  const [highlightFilter, setHighlightFilter] = useState("none");
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [zipping, setZipping] = useState(false);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const [starCount, setStarCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, starsRes] = await Promise.all([
        fetch(`/api/events/${slug}/media?filter=${filter}&sort=newest`),
        fetch(`/api/events/${slug}/media?filter=highlights&sort=newest`),
      ]);
      const data = await res.json();
      const starsData = await starsRes.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not load gallery");
      setMedia(data.media);
      setCanDownload(Boolean(data.canDownload));
      setDownloadBlockedReason(data.downloadBlockedReason || null);
      setCanCurate(Boolean(data.canCurateHighlights));
      setPublished(Boolean(data.highlightsPublished));
      setPendingCount(Number(data.pendingCount || 0));
      setHighlightTemplate(data.highlightTemplate || "ig8");
      setHighlightFilter(data.highlightFilter || "none");
      if (starsRes.ok && Array.isArray(starsData.media)) {
        setStarCount(starsData.media.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load gallery");
    } finally {
      setLoading(false);
    }
  }, [slug, filter]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, 15000);
    return () => clearInterval(id);
  }, [load]);

  async function toggleLike(item: MediaItem) {
    const method = item.likedByMe ? "DELETE" : "POST";
    const res = await fetch(`/api/media/${item.id}/like`, { method });
    const data = await res.json();
    if (!res.ok) return;
    const patch = { likedByMe: data.liked as boolean, likeCount: data.likeCount as number };
    setMedia((prev) => prev.map((m) => (m.id === item.id ? { ...m, ...patch } : m)));
    setLightbox((prev) => (prev?.id === item.id ? { ...prev, ...patch } : prev));
  }

  const lightboxIndex = useMemo(
    () => (lightbox ? media.findIndex((m) => m.id === lightbox.id) : -1),
    [lightbox, media],
  );

  function stepLightbox(delta: number) {
    if (!media.length || lightboxIndex < 0) return;
    const next = (lightboxIndex + delta + media.length) % media.length;
    const item = media[next];
    setLightbox(item);
    setOpenCommentsFor(item.id);
    setCommentText("");
    if (commentsEnabled && !comments[item.id]) {
      void fetch(`/api/media/${item.id}/comments`)
        .then((r) => r.json())
        .then((data) => {
          if (data.comments) {
            setComments((prev) => ({ ...prev, [item.id]: data.comments }));
          }
        });
    }
  }

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") stepLightbox(1);
      if (e.key === "ArrowLeft") stepLightbox(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, lightboxIndex, media.length]);

  async function toggleComments(item: MediaItem) {
    if (openCommentsFor === item.id) {
      setOpenCommentsFor(null);
      return;
    }
    setOpenCommentsFor(item.id);
    setCommentText("");
    if (!commentsEnabled) return;
    const res = await fetch(`/api/media/${item.id}/comments`);
    const data = await res.json();
    if (res.ok) {
      setComments((prev) => ({ ...prev, [item.id]: data.comments }));
    }
  }

  async function sendComment(mediaId: string) {
    if (!commentText.trim()) return;
    const res = await fetch(`/api/media/${mediaId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentText.trim() }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setComments((prev) => ({
      ...prev,
      [mediaId]: [...(prev[mediaId] || []), data.comment],
    }));
    setMedia((prev) =>
      prev.map((m) =>
        m.id === mediaId ? { ...m, commentCount: m.commentCount + 1 } : m,
      ),
    );
    setLightbox((prev) =>
      prev?.id === mediaId ? { ...prev, commentCount: prev.commentCount + 1 } : prev,
    );
    setCommentText("");
  }

  async function remove(item: MediaItem) {
    if (!confirm("Delete this memory?")) return;
    const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
  }

  async function toggleHighlight(item: MediaItem) {
    const next = !item.isHighlight;
    if (next && starCount >= HIGHLIGHT_MAX) {
      alert(`Highlight collage can include up to ${HIGHLIGHT_MAX} photos.`);
      return;
    }
    const res = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHighlight: next }),
    });
    if (!res.ok) return;
    setMedia((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, isHighlight: next } : m)),
    );
    setStarCount((n) => n + (next ? 1 : -1));
  }

  async function setMediaState(item: MediaItem, state: "published" | "rejected") {
    const res = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) return;
    if (state === "rejected") {
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
    } else {
      setMedia((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, state: "published" } : m)),
      );
    }
    setPendingCount((n) => Math.max(0, n - 1));
  }

  function openLightbox(item: MediaItem) {
    setLightbox(item);
    setOpenCommentsFor(item.id);
    setCommentText("");
    if (commentsEnabled && !comments[item.id]) {
      void fetch(`/api/media/${item.id}/comments`)
        .then((r) => r.json())
        .then((data) => {
          if (data.comments) {
            setComments((prev) => ({ ...prev, [item.id]: data.comments }));
          }
        });
    }
  }

  async function downloadOne(item: MediaItem) {
    if (!item.originalUrl) return;
    const a = document.createElement("a");
    a.href = item.originalUrl;
    a.download = `${item.id}.jpg`;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadAll() {
    if (!canDownload) return;
    const downloadable = media.filter((m) => m.originalUrl);
    if (!downloadable.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      let i = 0;
      for (const item of downloadable) {
        i += 1;
        const res = await fetch(item.originalUrl!);
        const blob = await res.blob();
        const ext =
          item.type === "video"
            ? "mp4"
            : item.contentType?.includes("png")
              ? "png"
              : "jpg";
        zip.file(`${String(i).padStart(3, "0")}-${item.uploader.displayName}.${ext}`, blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-photos.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not build the zip. Try downloading photos one by one.");
    } finally {
      setZipping(false);
    }
  }

  const layoutClass =
    theme.layout === "polaroid"
      ? "gallery-polaroid"
      : theme.layout === "film"
        ? "gallery-film"
        : theme.layout === "mosaic"
          ? "gallery-mosaic"
          : theme.layout === "disco"
            ? "gallery-disco"
            : "gallery-ig";

  return (
    <div className="space-y-4">
      {eventClosed ? (
        <div className="event-moment event-moment-end">
          <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">
            The night is over
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl mt-2">
            {published ? "Highlights are live" : "Building the recap"}
          </h2>
          <p className="mt-2 max-w-xl text-sm opacity-80">
            {isOrganizer
              ? "Star shots, pick a template + filter, then publish."
              : published
                ? "A curated cut of every angle from the room."
                : "Your host is still curating. Your own photos stay visible to you."}
          </p>
        </div>
      ) : null}

      {published && !canCurate ? (
        <HighlightsStudio
          slug={slug}
          shots={[]}
          canEdit={false}
          wallOnly
          initialTemplate={highlightTemplate}
          initialFilter={highlightFilter}
          published={published}
        />
      ) : null}

      {canCurate ? (
        <HighlightsStudio
          slug={slug}
          shots={media}
          canEdit
          initialTemplate={highlightTemplate}
          initialFilter={highlightFilter}
          published={published}
          onPublished={(v) => {
            setPublished(v);
            onHighlightsPublished?.(v);
            load();
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ...(isOrganizer
                ? [["pending", `Pending${pendingCount ? ` (${pendingCount})` : ""}`] as const]
                : []),
              ["mine", "Mine"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="btn btn-ghost px-3 py-1.5 text-sm"
              style={{
                background: filter === id ? "var(--accent-soft)" : undefined,
                borderColor: filter === id ? "var(--accent)" : undefined,
              }}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary text-sm"
          disabled={!canDownload || zipping || !media.length}
          onClick={downloadAll}
          title={downloadBlockedReason || "Download all photos"}
        >
          {zipping ? "Preparing zip…" : "Download all"}
        </button>
      </div>

      {!canDownload && downloadBlockedReason ? (
        <p className="text-sm text-[var(--muted)]">{downloadBlockedReason}</p>
      ) : null}

      {loading && !media.length ? (
        <p className="text-[var(--muted)]">Loading gallery…</p>
      ) : null}
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}

      {!loading && !media.length ? (
        <div className="panel p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">No photos yet</p>
          <p className="text-[var(--muted)] mt-2">Be the first to add a memory.</p>
        </div>
      ) : (
        <div className={layoutClass}>
          {media.map((item, index) => (
            <article
              key={item.id}
              className={
                theme.layout === "polaroid"
                  ? "break-inside-avoid bg-white p-2 pb-3 shadow-md"
                  : theme.layout === "film"
                    ? "min-w-[260px] max-w-[280px] shrink-0 snap-center overflow-hidden rounded-xl border border-[var(--line)] bg-black/10"
                    : theme.layout === "mosaic"
                      ? "mb-3 break-inside-avoid overflow-hidden rounded-lg"
                      : theme.layout === "disco"
                        ? "overflow-hidden rounded-xl border-2"
                        : "overflow-hidden bg-black/5"
              }
              style={
                theme.layout === "polaroid"
                  ? { transform: `rotate(${index % 2 === 0 ? -1.5 : 1.5}deg)` }
                  : theme.layout === "disco"
                    ? {
                        borderColor:
                          index % 3 === 0
                            ? "#ff4fd8"
                            : index % 3 === 1
                              ? "#4fd8ff"
                              : "#ffe14f",
                      }
                    : undefined
              }
            >
              <div className="relative">
              <button
                type="button"
                className={
                  theme.layout === "ig" || theme.layout === "disco"
                    ? "block w-full aspect-square"
                    : theme.layout === "film"
                      ? "block w-full aspect-[4/3]"
                      : "block w-full"
                }
                onClick={() => openLightbox(item)}
              >
                {item.type === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.caption || "Event photo"}
                    className={
                      theme.layout === "mosaic"
                        ? "w-full h-auto object-cover"
                        : "h-full w-full object-cover"
                    }
                  />
                )}
              </button>
              {item.state === "pending_approval" ? (
                <span className="gallery-pending-badge">Awaiting approval · visible to you</span>
              ) : null}
              {item.isMine ? <span className="gallery-mine-badge">Yours</span> : null}
              </div>

              <div className="px-3 py-3 space-y-2">
                <div className="gallery-actions">
                  <button
                    type="button"
                    onClick={() => toggleLike(item)}
                    className="gallery-action"
                    style={{ color: item.likedByMe ? "#c45c4a" : "inherit" }}
                  >
                    <span className="gallery-action-icon">{item.likedByMe ? "♥" : "♡"}</span>
                    <span>{item.likeCount}</span>
                  </button>
                  {canCurate ? (
                    <button
                      type="button"
                      onClick={() => toggleHighlight(item)}
                      className="gallery-action"
                      style={{ color: item.isHighlight ? "#c98b5e" : "inherit" }}
                      title={item.isHighlight ? "Remove from highlights" : "Add to highlights"}
                    >
                      <span className="gallery-action-icon">{item.isHighlight ? "★" : "☆"}</span>
                    </button>
                  ) : item.isHighlight ? (
                    <span className="gallery-action">
                      <span className="gallery-action-icon">★</span>
                    </span>
                  ) : null}
                  {canCurate && item.state === "pending_approval" ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary px-3 py-1.5 text-sm"
                        onClick={() => setMediaState(item, "published")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost px-3 py-1.5 text-sm"
                        onClick={() => setMediaState(item, "rejected")}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {commentsEnabled ? (
                    <button
                      type="button"
                      onClick={() => toggleComments(item)}
                      className="gallery-action"
                    >
                      <span className="gallery-action-icon">💬</span>
                      <span>{item.commentCount}</span>
                    </button>
                  ) : null}
                  {item.canDownload ? (
                    <button type="button" onClick={() => downloadOne(item)} className="gallery-action">
                      <span className="gallery-action-icon">↓</span>
                    </button>
                  ) : null}
                  {item.canDelete ? (
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="gallery-action gallery-action-danger ml-auto"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <p className="text-sm opacity-80">
                  <span className="font-semibold">{item.uploader.displayName}</span>
                  {item.caption ? ` · ${item.caption}` : ""}
                </p>

                {openCommentsFor === item.id && commentsEnabled ? (
                  <div className="mt-2 space-y-2 border-t border-[var(--line)] pt-2">
                    <ul className="max-h-36 overflow-auto space-y-2 text-sm">
                      {(comments[item.id] || []).map((c) => (
                        <li key={c.id}>
                          <span className="font-semibold">{c.user.displayName}</span> {c.body}
                        </li>
                      ))}
                      {!(comments[item.id] || []).length ? (
                        <li className="opacity-60">No comments yet.</li>
                      ) : null}
                    </ul>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm"
                        placeholder="Add a comment…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendComment(item.id);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary px-3 py-2 text-sm"
                        onClick={() => sendComment(item.id)}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {lightbox ? (
        <div className="lightbox-shell" onClick={() => setLightbox(null)}>
          <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  className="lightbox-nav lightbox-nav-prev"
                  onClick={() => stepLightbox(-1)}
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="lightbox-nav lightbox-nav-next"
                  onClick={() => stepLightbox(1)}
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            ) : null}
            {lightbox.type === "video" ? (
              <video
                src={lightbox.originalUrl || lightbox.url}
                controls
                autoPlay
                className="lightbox-media"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.originalUrl || lightbox.url}
                alt={lightbox.caption || "Photo"}
                className="lightbox-media"
              />
            )}
            <div className="lightbox-meta">
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-display)] text-2xl text-white">
                  {lightbox.uploader.displayName}
                </p>
                {lightbox.caption ? (
                  <p className="mt-1 text-white/70">{lightbox.caption}</p>
                ) : null}
                {commentsEnabled ? (
                  <div className="mt-3 max-h-36 space-y-2 overflow-auto text-sm text-white/85">
                    {(comments[lightbox.id] || []).map((c) => (
                      <p key={c.id}>
                        <span className="font-semibold text-white">{c.user.displayName}</span>{" "}
                        {c.body}
                      </p>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <input
                        className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                        placeholder="Add a comment…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendComment(lightbox.id);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary px-3 py-2 text-sm"
                        onClick={() => sendComment(lightbox.id)}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="gallery-actions gallery-actions-lite">
                <button
                  type="button"
                  onClick={() => toggleLike(lightbox)}
                  className="gallery-action"
                  style={{ color: lightbox.likedByMe ? "#c45c4a" : "#fff" }}
                >
                  <span className="gallery-action-icon">{lightbox.likedByMe ? "♥" : "♡"}</span>
                  <span>{lightbox.likeCount}</span>
                </button>
                {lightbox.canDownload && lightbox.originalUrl ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => downloadOne(lightbox)}
                  >
                    Download
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost border-white/20 bg-white/10 text-white"
                  onClick={() => setLightbox(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
