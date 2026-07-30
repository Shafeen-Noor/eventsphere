"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getHighlightFilterCss,
  getHighlightTemplate,
  HIGHLIGHT_FILTERS,
  HIGHLIGHT_MAX,
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
  initialTemplate = "ig8",
  initialFilter = "none",
  published,
  onPublished,
  wallOnly = false,
}: {
  slug: string;
  shots: Shot[];
  canEdit: boolean;
  initialTemplate?: string;
  initialFilter?: string;
  published: boolean;
  onPublished?: (v: boolean) => void;
  /** Guest view: just the collage wall, no studio chrome */
  wallOnly?: boolean;
}) {
  const [shots, setShots] = useState<Shot[]>(seedShots);
  const [template, setTemplate] = useState<HighlightTemplateId>(
    (initialTemplate as HighlightTemplateId) || "ig8",
  );
  const [filter, setFilter] = useState<HighlightFilterId>(
    (initialFilter as HighlightFilterId) || "none",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    setShots(seedShots);
  }, [seedShots]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/events/${slug}/media?filter=${canEdit && !wallOnly ? "all" : "highlights"}&sort=newest`,
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
  }, [slug, canEdit, published, wallOnly]);

  const starred = useMemo(() => {
    const list = canEdit && !wallOnly ? shots.filter((s) => s.isHighlight) : shots;
    return list.slice(0, HIGHLIGHT_MAX);
  }, [shots, canEdit, wallOnly]);

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
      setMessage("Could not save collage");
      return;
    }
    if (typeof nextPublish === "boolean") {
      onPublished?.(nextPublish);
      if (nextPublish) {
        setCelebrate(true);
        window.setTimeout(() => setCelebrate(false), 3200);
      }
    }
    setMessage(nextPublish ? "Highlight collage published" : "Collage saved");
  }

  if (!starred.length && !canEdit) return null;
  if (wallOnly && !starred.length) return null;

  const collage = (
    <div className={`hl-collage-frame ${celebrate ? "hl-celebrate" : ""}`}>
      {celebrate ? (
        <div className="hl-publish-toast" role="status">
          Highlight published by the host
        </div>
      ) : null}
      {!starred.length ? (
        <p className="py-10 text-center text-[var(--muted)]">
          Star up to {HIGHLIGHT_MAX} photos below to build the collage.
        </p>
      ) : (
        <div className={tpl.className} style={{ filter: filterCss }}>
          {starred.map((shot, i) => (
            <div
              key={shot.id}
              className={`hl-cell ${i === 0 ? "hl-hero" : ""} hl-slot-${i + 1}`}
            >
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
  );

  if (wallOnly) {
    return (
      <div className="hl-wall panel overflow-hidden p-0">
        <div className="border-b border-[var(--line)] bg-[var(--navy)] px-5 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
            Highlight wall
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            Tonight’s collage
          </h3>
        </div>
        <div className="p-4">{collage}</div>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden p-0">
      <div className="border-b border-[var(--line)] bg-[var(--navy)] px-5 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
          Highlight collage
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
          {canEdit ? "Build the wall" : "Event highlights"}
        </h3>
        <p className="mt-1 text-sm text-white/70">
          {canEdit
            ? `Pick 1–${HIGHLIGHT_MAX} photos (★), choose a layout + look, then publish to the top of the gallery.`
            : "A curated collage of the night."}
        </p>
      </div>

      {canEdit ? (
        <div className="grid gap-4 border-b border-[var(--line)] p-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Collage layouts
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
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {t.blurb} · best with {t.idealCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Looks
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
            <p className="mt-3 text-sm text-[var(--muted)]">
              Selected for collage:{" "}
              <strong>
                {starred.length}/{HIGHLIGHT_MAX}
              </strong>
            </p>
          </div>
        </div>
      ) : null}

      <div className="p-4">{collage}</div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] p-4">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={saving}
            onClick={() => saveStyle()}
          >
            Save collage
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || !starred.length}
            onClick={() => saveStyle(!published)}
          >
            {published ? "Unpublish wall" : "Publish highlight wall"}
          </button>
          {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
