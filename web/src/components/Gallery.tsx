"use client";

import JSZip from "jszip";
import { useCallback, useEffect, useState } from "react";
import { getAtmosphere } from "@/lib/atmospheres";

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
  const [filter, setFilter] = useState(eventClosed && highlightsPublished && !isOrganizer ? "highlights" : "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canDownload, setCanDownload] = useState(false);
  const [downloadBlockedReason, setDownloadBlockedReason] = useState<string | null>(null);
  const [canCurate, setCanCurate] = useState(false);
  const [published, setPublished] = useState(highlightsPublished);
  const [publishing, setPublishing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [zipping, setZipping] = useState(false);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/events/${slug}/media?filter=${filter}&sort=newest`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not load gallery");
      setMedia(data.media);
      setCanDownload(Boolean(data.canDownload));
      setDownloadBlockedReason(data.downloadBlockedReason || null);
      setCanCurate(Boolean(data.canCurateHighlights));
      setPublished(Boolean(data.highlightsPublished));
      setPendingCount(Number(data.pendingCount || 0));
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
    setMedia((prev) =>
      prev.map((m) =>
        m.id === item.id
          ? { ...m, likedByMe: data.liked, likeCount: data.likeCount }
          : m,
      ),
    );
  }

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
    setCommentText("");
  }

  async function remove(item: MediaItem) {
    if (!confirm("Delete this memory?")) return;
    const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setMedia((prev) => prev.filter((m) => m.id !== item.id));
  }

  async function toggleHighlight(item: MediaItem) {
    const res = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHighlight: !item.isHighlight }),
    });
    if (!res.ok) return;
    setMedia((prev) =>
      prev.map((m) =>
        m.id === item.id ? { ...m, isHighlight: !item.isHighlight } : m,
      ),
    );
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

  async function publishHighlights(next: boolean) {
    setPublishing(true);
    const res = await fetch(`/api/events/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlightsPublished: next }),
    });
    setPublishing(false);
    if (!res.ok) return;
    setPublished(next);
    onHighlightsPublished?.(next);
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
        <div className="rounded-2xl bg-[rgba(21,41,53,0.06)] px-4 py-6 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
            Event closed
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {isOrganizer
              ? "Host curates · then publishes highlights to guests"
              : published
                ? `Your highlights from this event`
                : "Waiting for the host to publish highlights"}
          </p>
        </div>
      ) : null}

      {canCurate ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-[var(--muted)]">
            Star photos to include them, then publish highlights for guests.
          </p>
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={publishing}
            onClick={() => publishHighlights(!published)}
          >
            {publishing
              ? "Saving…"
              : published
                ? "Unpublish highlights"
                : "Publish highlights"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", isOrganizer || !published ? "All" : "Highlights"],
            ...(isOrganizer
              ? [
                  ["pending", `Pending${pendingCount ? ` (${pendingCount})` : ""}`],
                  ["highlights", "Highlights"],
                  ["photos", "Photos"],
                  ["videos", "Videos"],
                  ["mine", "Mine"],
                ]
              : !eventClosed
                ? [
                    ["photos", "Photos"],
                    ["videos", "Videos"],
                    ["mine", "Mine"],
                  ]
                : [["highlights", "Highlights"]]),
          ].map(([id, label]) => (
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
              <button
                type="button"
                className={
                  theme.layout === "ig" || theme.layout === "disco"
                    ? "block w-full aspect-square"
                    : theme.layout === "film"
                      ? "block w-full aspect-[4/3]"
                      : "block w-full"
                }
                onClick={() => setLightbox(item)}
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

              <div className="px-2 py-2 space-y-1">
                <div className="flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => toggleLike(item)}
                    className="inline-flex items-center gap-1 font-medium"
                    style={{ color: item.likedByMe ? "#c45c4a" : "inherit" }}
                  >
                    {item.likedByMe ? "♥" : "♡"} {item.likeCount}
                  </button>
                  {canCurate ? (
                    <button
                      type="button"
                      onClick={() => toggleHighlight(item)}
                      className="inline-flex items-center gap-1 font-medium"
                      style={{ color: item.isHighlight ? "#c98b5e" : "inherit" }}
                      title={item.isHighlight ? "Remove from highlights" : "Add to highlights"}
                    >
                      {item.isHighlight ? "★" : "☆"}
                    </button>
                  ) : item.isHighlight ? (
                    <span className="text-[var(--muted)]">★</span>
                  ) : null}
                  {canCurate && item.state === "pending_approval" ? (
                    <>
                      <button
                        type="button"
                        className="font-medium text-[var(--ok)]"
                        onClick={() => setMediaState(item, "published")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="font-medium text-[var(--danger)]"
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
                      className="inline-flex items-center gap-1"
                    >
                      💬 {item.commentCount}
                    </button>
                  ) : null}
                  {item.canDownload ? (
                    <button type="button" onClick={() => downloadOne(item)}>
                      ↓
                    </button>
                  ) : null}
                  {item.canDelete ? (
                    <button type="button" onClick={() => remove(item)} className="ml-auto text-[var(--danger)]">
                      Delete
                    </button>
                  ) : null}
                </div>
                <p className="text-xs opacity-70">
                  <span className="font-semibold">{item.uploader.displayName}</span>
                  {item.caption ? ` · ${item.caption}` : ""}
                </p>

                {openCommentsFor === item.id && commentsEnabled ? (
                  <div className="mt-2 space-y-2 border-t border-[var(--line)] pt-2">
                    <ul className="max-h-28 overflow-auto space-y-1 text-xs">
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
                        className="flex-1 rounded-md border border-[var(--line)] bg-white/70 px-2 py-1 text-xs"
                        placeholder="Add a comment…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendComment(item.id);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary px-2 py-1 text-xs"
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
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {lightbox.type === "video" ? (
              <video
                src={lightbox.originalUrl || lightbox.url}
                controls
                className="max-h-[80vh] w-full bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.originalUrl || lightbox.url}
                alt={lightbox.caption || "Photo"}
                className="max-h-[80vh] w-full object-contain bg-black"
              />
            )}
            <div className="mt-3 flex gap-2 justify-end">
              {lightbox.canDownload && lightbox.originalUrl ? (
                <button type="button" className="btn btn-primary" onClick={() => downloadOne(lightbox)}>
                  Download
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost" onClick={() => setLightbox(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
