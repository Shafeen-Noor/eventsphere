"use client";

import { useEffect, useState } from "react";
import { getAtmosphere, isDarkAtmosphere } from "@/lib/atmospheres";

type Props = {
  atmosphere: string;
  title?: string;
  hostName?: string;
  whenLabel?: string | null;
  locationName?: string;
  inviteCopy?: string;
  description?: string;
  /** Auto-open the envelope after mount (create preview). */
  autoOpen?: boolean;
  /** Start already open (guest after first open). */
  initiallyOpen?: boolean;
  compact?: boolean;
  children?: React.ReactNode;
};

export function AnimatedInvite({
  atmosphere,
  title = "Your event name",
  hostName = "Host",
  whenLabel,
  locationName = "",
  inviteCopy = "",
  description = "",
  autoOpen = false,
  initiallyOpen = false,
  compact = false,
  children,
}: Props) {
  const theme = getAtmosphere(atmosphere);
  const dark = isDarkAtmosphere(atmosphere);
  const [open, setOpen] = useState(initiallyOpen);
  const [revealed, setRevealed] = useState(initiallyOpen);

  useEffect(() => {
    if (!autoOpen || initiallyOpen) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [autoOpen, initiallyOpen, atmosphere]);

  useEffect(() => {
    if (!open) {
      setRevealed(false);
      return;
    }
    const t = setTimeout(() => setRevealed(true), 520);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div className={`invite-stage ${compact ? "invite-stage-compact" : ""}`}>
      <button
        type="button"
        className={`invite-envelope ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          ["--invite-accent" as string]: theme.accent,
          ["--invite-fg" as string]: theme.fg,
        }}
      >
        <div
          className="invite-flap"
          style={{
            background: `linear-gradient(160deg, ${theme.accent}cc, ${theme.accent}88)`,
          }}
        />
        <div
          className="invite-pocket"
          style={{
            background: dark
              ? "linear-gradient(180deg, #2a2435, #1a1c22)"
              : "linear-gradient(180deg, #f7f1ea, #e8dfd4)",
          }}
        >
          <span className="invite-seal" aria-hidden>
            {theme.motif}
          </span>
          {!open ? (
            <p className="invite-hint" style={{ color: dark ? "#f7f1ea" : "#3b3228" }}>
              Tap to open invitation
            </p>
          ) : null}
        </div>

        <div
          className={`invite-card ${revealed ? "is-revealed" : ""}`}
          style={{
            background: theme.bg,
            color: theme.fg,
            boxShadow: `0 28px 60px ${theme.accent}44`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">
            You’re invited · {theme.label}
          </p>
          <p className="mt-3 text-4xl leading-none" aria-hidden>
            {theme.motif}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-[1.05]">
            {title.trim() || "Your event name"}
          </h2>
          <p className="mt-3 text-base opacity-80">
            Hosted by {hostName.trim() || "Host"}
            {locationName ? ` · ${locationName}` : ""}
          </p>
          {whenLabel ? (
            <p
              className="mt-4 inline-flex rounded-full px-4 py-2 text-sm"
              style={{
                background: dark ? "rgba(255,255,255,0.12)" : "rgba(28,27,25,0.08)",
              }}
            >
              {whenLabel}
            </p>
          ) : null}
          {inviteCopy ? <p className="mt-4 text-base opacity-90">{inviteCopy}</p> : null}
          {description ? <p className="mt-3 text-sm opacity-75">{description}</p> : null}
          {children}
        </div>
      </button>
    </div>
  );
}
