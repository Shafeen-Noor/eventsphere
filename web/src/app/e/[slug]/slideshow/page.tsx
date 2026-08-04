"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Slide = {
  id: string;
  url: string;
  type: string;
  caption: string;
  uploader?: { displayName: string };
};

export default function SlideshowPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const res = await fetch(`/api/events/${slug}/media?filter=all&sort=newest`);
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || "Could not load slideshow");
      return;
    }
    setSlides(
      (data.media || []).filter(
        (m: Slide) => m.type !== "video" || Boolean(m.url),
      ),
    );
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % Math.max(slides.length, 1));
      if (e.key === "ArrowLeft") {
        setIndex((i) => (i - 1 + Math.max(slides.length, 1)) % Math.max(slides.length, 1));
      }
      if (e.key === "f" || e.key === "F") {
        void document.documentElement.requestFullscreen?.();
      }
      if (e.key === "Escape" && document.fullscreenElement) {
        void document.exitFullscreen?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  const current = slides[index];

  return (
    <div className="slideshow-root">
      {error ? <p className="slideshow-empty">{error}</p> : null}
      {!error && !current ? (
        <p className="slideshow-empty">Waiting for photos…</p>
      ) : null}
      {current ? (
        <>
          {current.type === "video" ? (
            <video key={current.id} src={current.url} autoPlay muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={current.id} src={current.url} alt={current.caption || "Memory"} />
          )}
          <div className="slideshow-meta">
            <p>{current.uploader?.displayName || "Guest"}</p>
            {current.caption ? <p>{current.caption}</p> : null}
            <p>
              {index + 1} / {slides.length}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
