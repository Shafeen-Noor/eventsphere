"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CameraCapture,
  ensureCameraNotifyPermission,
} from "@/components/CameraCapture";
import { resolveContentType } from "@/lib/contentType";
import {
  enqueueUpload,
  flushQueuedUploads,
  listQueued,
} from "@/lib/offlineQueue";

type ItemState = {
  name: string;
  status: "queued" | "uploading" | "processing" | "done" | "error" | "offline";
  message?: string;
};

type UploadMode = "both" | "camera" | "library";

async function sha256Hex(file: File) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function friendlyUploadError(err: unknown) {
  const msg = err instanceof Error ? err.message : "Upload failed";
  if (
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed")
  ) {
    return "Network issue — photo saved on this device and will sync when online.";
  }
  return msg;
}

function isLikelyOfflineError(err: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = err instanceof Error ? err.message : "";
  return (
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed")
  );
}

export function UploadPanel({
  slug,
  disabled,
  uploadMode = "both",
  onUploaded,
}: {
  slug: string;
  disabled?: boolean;
  uploadMode?: UploadMode;
  onUploaded: () => void;
}) {
  const [items, setItems] = useState<ItemState[]>([]);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [nudgeOpenCamera, setNudgeOpenCamera] = useState(false);
  const [pendingOffline, setPendingOffline] = useState(0);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraWasUsedRef = useRef(false);

  const showCamera = uploadMode === "both" || uploadMode === "camera";
  const showLibrary = uploadMode === "both" || uploadMode === "library";

  const summary = useMemo(() => {
    const done = items.filter((i) => i.status === "done").length;
    const err = items.filter((i) => i.status === "error").length;
    const offline = items.filter((i) => i.status === "offline").length;
    return { done, err, offline, total: items.length };
  }, [items]);

  useEffect(() => {
    function syncOnline() {
      setOnline(navigator.onLine);
    }
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    listQueued(slug).then((rows) => setPendingOffline(rows.length)).catch(() => {});
  }, [slug]);

  // Notification tap (or in-app nudge) opens camera only after an explicit guest action.
  useEffect(() => {
    function onOpen() {
      if (showCamera && !disabled) {
        setNudgeOpenCamera(false);
        setCameraOpen(true);
      }
    }
    window.addEventListener("eventsphere:open-camera", onOpen);
    return () => window.removeEventListener("eventsphere:open-camera", onOpen);
  }, [showCamera, disabled]);

  // After lock: camera is already closed — show a tap-to-open nudge (camera stays off).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (!cameraWasUsedRef.current || cameraOpen || disabled || !showCamera) return;
      setNudgeOpenCamera(true);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [cameraOpen, disabled, showCamera]);

  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  useEffect(() => {
    if (!online || disabled) return;
    let cancelled = false;
    (async () => {
      const result = await flushQueuedUploads(slug);
      if (cancelled) return;
      if (result.flushed > 0) {
        const left = await listQueued(slug);
        setPendingOffline(left.length);
        onUploadedRef.current();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [online, slug, disabled]);

  function patch(index: number, next: Partial<ItemState>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...next } : it)));
  }

  async function queueOffline(file: File, index: number, reason: string) {
    await enqueueUpload({
      slug,
      filename: file.name || `photo-${Date.now()}.jpg`,
      contentType: resolveContentType(file),
      caption,
      blob: file,
    });
    const left = await listQueued(slug);
    setPendingOffline(left.length);
    patch(index, {
      status: "offline",
      message: reason,
    });
  }

  async function uploadOne(file: File, index: number) {
    if (!navigator.onLine) {
      await queueOffline(file, index, "Saved offline — will sync when online");
      return;
    }

    patch(index, { status: "uploading" });
    const contentType = resolveContentType(file);
    const checksum = await sha256Hex(file);

    try {
      const initRes = await fetch(`/api/events/${slug}/media/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name || `upload-${Date.now()}.jpg`,
          contentType,
          byteSize: file.size,
          checksum,
          caption,
        }),
      });
      const initData = await initRes.json().catch(() => ({}));
      if (!initRes.ok) {
        throw new Error(initData?.error?.message || "Upload init failed");
      }

      let putRes: Response;
      try {
        putRes = await fetch(initData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });
      } catch (err) {
        throw new Error(friendlyUploadError(err));
      }

      if (!putRes.ok) {
        throw new Error(`Storage rejected upload (${putRes.status})`);
      }

      patch(index, { status: "processing" });
      const completeRes = await fetch(
        `/api/events/${slug}/media/${initData.mediaId}/complete`,
        { method: "POST" },
      );
      const completeData = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok) {
        throw new Error(completeData?.error?.message || "Could not finalize upload");
      }
      patch(index, { status: "done" });
    } catch (err) {
      if (isLikelyOfflineError(err)) {
        await queueOffline(
          file,
          index,
          "Saved on this device — will upload when connection returns",
        );
        return;
      }
      throw err;
    }
  }

  async function uploadFiles(files: File[]) {
    if (!files.length || disabled) return;
    setBusy(true);
    setItems(files.map((f) => ({ name: f.name || "photo.jpg", status: "queued" })));

    for (let i = 0; i < files.length; i++) {
      try {
        await uploadOne(files[i], i);
      } catch (err) {
        patch(i, {
          status: "error",
          message: friendlyUploadError(err),
        });
      }
    }

    setBusy(false);
    setCaption("");
    onUploaded();
  }

  function onPick(fileList: FileList | null) {
    if (!fileList?.length) return;
    uploadFiles(Array.from(fileList));
  }

  async function openCamera() {
    if (!showCamera) return;
    cameraWasUsedRef.current = true;
    setNudgeOpenCamera(false);
    // Permission for lock-screen “tap to take a photo” — camera still stays off until they tap.
    await ensureCameraNotifyPermission();
    setCameraOpen(true);
  }

  return (
    <div className="panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl">Upload memories</h3>
          <p className="text-sm text-[var(--muted)] mt-1">
            {uploadMode === "camera"
              ? "Camera only when you open it — it turns off when you lock your phone."
              : uploadMode === "library"
                ? "Pick photos from your library."
                : "Open Camera for a shot (it won’t stay on), or Choose files from your library."}
            {!online ? " You’re offline — photos will queue on this device." : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {showCamera ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={disabled || busy}
              onClick={() => void openCamera()}
            >
              Camera
            </button>
          ) : null}
          {showLibrary ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={disabled || busy}
              onClick={() => libraryRef.current?.click()}
            >
              {busy ? "Uploading…" : "Choose files"}
            </button>
          ) : null}
        </div>
      </div>

      {nudgeOpenCamera ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] p-4 pointer-events-none">
          <div className="panel pointer-events-auto mx-auto max-w-md p-4 flex items-center justify-between gap-3 shadow-lg">
            <p className="text-sm">Want to take a picture?</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost px-3 py-1.5 text-sm"
                onClick={() => setNudgeOpenCamera(false)}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="btn btn-primary px-3 py-1.5 text-sm"
                onClick={() => void openCamera()}
              >
                Open camera
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingOffline > 0 ? (
        <div className="rounded-xl border border-[var(--line)] bg-[rgba(105,142,162,0.12)] px-3 py-2 text-sm">
          {pendingOffline} photo{pendingOffline === 1 ? "" : "s"} waiting to sync
          {online ? "…" : " (waiting for internet)"}
          {online ? (
            <button
              type="button"
              className="ml-3 underline"
              onClick={async () => {
                await flushQueuedUploads(slug);
                const left = await listQueued(slug);
                setPendingOffline(left.length);
                onUploaded();
              }}
            >
              Sync now
            </button>
          ) : null}
        </div>
      ) : null}

      {showLibrary ? (
        <input
          ref={libraryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,image/*,video/*"
          multiple
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            onPick(e.target.files);
            e.target.value = "";
          }}
        />
      ) : null}

      <div className="field">
        <label htmlFor="caption">Caption for this batch (optional)</label>
        <input
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Golden hour at the fort"
          maxLength={500}
          disabled={busy}
        />
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--muted)]">
            {summary.done}/{summary.total} uploaded
            {summary.offline ? ` · ${summary.offline} saved offline` : ""}
            {summary.err ? ` · ${summary.err} failed` : ""}
          </p>
          <ul className="space-y-1 max-h-40 overflow-auto text-sm">
            {items.map((item, idx) => (
              <li
                key={`${item.name}-${idx}`}
                className="flex justify-between gap-3 border-b border-[var(--line)] py-1.5"
              >
                <span className="truncate">{item.name}</span>
                <span
                  className={
                    item.status === "error"
                      ? "text-[var(--danger)]"
                      : item.status === "done"
                        ? "text-[var(--ok)]"
                        : item.status === "offline"
                          ? "text-[var(--navy)]"
                          : "text-[var(--muted)]"
                  }
                >
                  {item.status === "error" || item.status === "offline"
                    ? item.message
                    : item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => uploadFiles([file])}
      />
    </div>
  );
}
