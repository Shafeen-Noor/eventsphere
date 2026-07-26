"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

function isMobileUa() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Ask once; used so we can nudge guests from the lock screen without keeping the camera live. */
export async function ensureCameraNotifyPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

function notifyTakePhoto() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification("EventSphere", {
      body: "Want to take a picture? Tap to open the camera.",
      tag: "eventsphere-take-photo",
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent("eventsphere:open-camera"));
      n.close();
    };
  } catch {
    // Best-effort — iOS Safari often blocks web notifications outside a PWA.
  }
}

export function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  // Camera is only live while this modal is open — never in the background.
  useEffect(() => {
    if (!open) {
      stopStream();
      setReady(false);
      return;
    }

    let cancelled = false;

    async function start() {
      setError(null);
      setReady(false);
      stopStream();

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera API unavailable in this browser. Use Choose files, or open the site on HTTPS / localhost.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError") {
          setError("Camera permission denied. Allow camera access and try again.");
        } else if (name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError("Could not open the camera. Try Choose files instead.");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facingMode]);

  // Lock / switch apps: kill the camera immediately and notify — do not auto-reopen.
  useEffect(() => {
    if (!open) return;

    function onHidden() {
      if (document.visibilityState !== "hidden") return;
      stopStream();
      setReady(false);
      notifyTakePhoto();
      onCloseRef.current();
    }

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
    };
  }, [open]);

  function handleClose() {
    stopStream();
    setReady(false);
    onClose();
  }

  async function snap() {
    const video = videoRef.current;
    if (!video || !ready) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setError("Could not capture photo.");
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    // Close immediately so the green camera indicator goes away.
    stopStream();
    setReady(false);
    onCapture(file);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3">
      <div className="panel w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--line)]">
          <h3 className="font-[family-name:var(--font-display)] text-xl">Camera</h3>
          <button type="button" className="btn btn-ghost px-3 py-1.5" onClick={handleClose}>
            Close
          </button>
        </div>

        <div className="relative bg-black aspect-[3/4] sm:aspect-video">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
          />
          {!ready && !error ? (
            <div className="absolute inset-0 grid place-items-center text-white/70">
              Starting camera…
            </div>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <p className="text-xs text-[var(--muted)]">
            {isMobileUa()
              ? "Camera turns off when you lock your phone. You’ll get a notification to open it again when you want another shot."
              : "Camera only runs while this window is open — it turns off as soon as you close it or switch away."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setFacingMode((m) => (m === "environment" ? "user" : "environment"))
              }
            >
              Flip camera
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              onClick={snap}
              disabled={!ready}
            >
              Take photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
