"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getHighlightFilterCss,
  getHighlightTemplate,
  HIGHLIGHT_FILTERS,
  HIGHLIGHT_TEMPLATES,
  type HighlightFilterId,
  type HighlightTemplateId,
} from "@/lib/highlights";

type Shot = {
  id: string;
  url: string;
  type: string;
  isHighlight?: boolean;
};

export function HighlightsStudio({
  slug,
  shots: seedShots,
  canEdit,
  initialTemplate = "mosaic",
  initialFilter = "none",
  published,
  onPublished,
}: {
  slug: string;
  shots: Shot[];
  canEdit: boolean;
  initialTemplate?: string;
  initialFilter?: string;
  published: boolean;
  onPublished?: (v: boolean) => void;
}) {
  const [shots, setShots] = useState<Shot[]>(seedShots);
  const [template, setTemplate] = useState<HighlightTemplateId>(
    (initialTemplate as HighlightTemplateId) || "mosaic",
  );
  const [filter, setFilter] = useState<HighlightFilterId>(
    (initialFilter as HighlightFilterId) || "none",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setShots(seedShots);
  }, [seedShots]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/events/${slug}/media?filter=${canEdit ? "all" : "highlights"}&sort=newest`,
      );
      const data = await res.json();
      if (!cancelled && res.ok) {
        setShots(
          (data.media || []).map((m: Shot) => ({
            id: m.id,
            url: m.url,
            type: m.type,
            isHighlight: Boolean(m.isHighlight),
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, canEdit, published]);

  const starred = useMemo(
    () =>
      (canEdit ? shots.filter((s) => s.isHighlight) : shots).slice(0, 12),
    [shots, canEdit],
  );

  const tpl = getHighlightTemplate(template);
  const filterCss = getHighlightFilterCss(filter);

  async function saveStyle(nextPublish?: boolean) {
    setSaving(true);
    setMessage(null);
    const body: Record<string, unknown> = {
      highlightTemplate: template,
      highlightFilter: filter,
    };
    if (typeof nextPublish === "boolean") body.highlightsPublished = nextPublish;
    const res = await fetch(`/api/events/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Could not save studio settings");
      return;
    }
    if (typeof nextPublish === "boolean") onPublished?.(nextPublish);
    setMessage(nextPublish ? "Highlights published" : "Studio saved");
  }

  if (!starred.length && !canEdit) return null;

  return (
    <div className="panel overflow-hidden p-0">
      <div className="border-b border-[var(--line)] bg-[var(--navy)] px-5 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
          Highlights studio
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
          {canEdit ? "Craft the recap" : "Event highlights"}
        </h3>
        <p className="mt-1 text-sm text-white/70">
          {canEdit
            ? "Star photos in the gallery, pick a template + filter, then publish."
            : "A curated cut of the night."}
        </p>
      </div>

      {canEdit ? (
        <div className="grid gap-4 border-b border-[var(--line)] p-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Templates
            </p>
            <div className="flex flex-wrap gap-2">
              {HIGHLIGHT_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="rounded-xl border px-3 py-2 text-left text-sm"
                  style={{
                    borderColor: template === t.id ? "var(--accent)" : "var(--line)",
                    background: template === t.id ? "var(--accent-soft)" : "var(--bg-elevated)",
                  }}
                  onClick={() => setTemplate(t.id)}
                >
                  <span className="font-semibold">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">{t.blurb}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Filters
            </p>
            <div className="flex flex-wrap gap-2">
              {HIGHLIGHT_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-sm font-semibold"
                  style={{
                    borderColor: filter === f.id ? "var(--accent)" : "var(--line)",
                    background: filter === f.id ? "var(--accent)" : "var(--bg-elevated)",
                    color: filter === f.id ? "#fff" : "var(--fg)",
                  }}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="p-4">
        {!starred.length ? (
          <p className="py-10 text-center text-[var(--muted)]">
            Star photos in the gallery to build this collage.
          </p>
        ) : (
          <div className={tpl.className} style={{ filter: filterCss }}>
            {starred.map((shot, i) => (
              <div key={shot.id} className={`hl-cell ${i === 0 ? "hl-hero" : ""}`}>
                {shot.type === "video" ? (
                  <video src={shot.url} className="h-full w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] p-4">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={saving}
            onClick={() => saveStyle()}
          >
            Save style
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || !starred.length}
            onClick={() => saveStyle(!published)}
          >
            {published ? "Unpublish" : "Publish highlights"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
