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
  autoOpen?: boolean;
  initiallyOpen?: boolean;
  /** compact = create preview, default = medium, hero = guest full-bleed */
  size?: "compact" | "default" | "hero";
  onOpened?: () => void;
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
  size = "default",
  onOpened,
  children,
}: Props) {
  const theme = getAtmosphere(atmosphere);
  const dark = isDarkAtmosphere(atmosphere);
  const [open, setOpen] = useState(initiallyOpen);
  const [revealed, setRevealed] = useState(initiallyOpen);
  const hero = size === "hero";

  useEffect(() => {
    if (!autoOpen || initiallyOpen) return;
    const t = setTimeout(() => setOpen(true), hero ? 900 : 600);
    return () => clearTimeout(t);
  }, [autoOpen, initiallyOpen, atmosphere, hero]);

  useEffect(() => {
    if (!open) {
      setRevealed(false);
      return;
    }
    const t = setTimeout(() => {
      setRevealed(true);
      onOpened?.();
    }, hero ? 700 : 520);
    return () => clearTimeout(t);
  }, [open, hero, onOpened]);

  return (
    <div
      className={`invite-stage invite-stage-${size}`}
      style={{
        ["--invite-accent" as string]: theme.accent,
        ["--invite-fg" as string]: theme.fg,
      }}
    >
      {hero ? (
        <div className="invite-hero-glow" style={{ background: theme.bg }} aria-hidden />
      ) : null}

      <button
        type="button"
        className={`invite-envelope ${open ? "is-open" : ""} ${hero ? "invite-envelope-hero" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div
          className="invite-flap"
          style={{
            background: `linear-gradient(160deg, ${theme.accent}dd, ${theme.accent}88)`,
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
              {hero ? "Tap to open your invitation" : "Tap to open invitation"}
            </p>
          ) : null}
        </div>

        <div
          className={`invite-card ${revealed ? "is-revealed" : ""} ${hero ? "invite-card-hero" : ""}`}
          style={{
            background: theme.bg,
            color: theme.fg,
            boxShadow: `0 40px 90px ${theme.accent}55`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="invite-kicker">You’re invited · {theme.label}</p>
          <p className="invite-motif" aria-hidden>
            {theme.motif}
          </p>
          <h2 className="invite-title">{title.trim() || "Your event name"}</h2>
          <p className="invite-meta">
            Hosted by {hostName.trim() || "Host"}
            {locationName ? ` · ${locationName}` : ""}
          </p>
          {whenLabel ? <p className="invite-when">{whenLabel}</p> : null}
          {inviteCopy ? <p className="invite-copy">{inviteCopy}</p> : null}
          {description ? <p className="invite-desc">{description}</p> : null}
          {children}
        </div>
      </button>

      {hero && !open ? (
        <p className="invite-pulse-hint bang-fade">An envelope is waiting for you</p>
      ) : null}
    </div>
  );
}
