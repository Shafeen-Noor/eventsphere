"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AtmosphereShell } from "@/components/AtmosphereShell";
import { SharePanel } from "@/components/SharePanel";
import { getAtmosphere } from "@/lib/atmospheres";

function formatCountdown(ms: number) {
  if (ms <= 0) return { label: "Starting now…", done: true };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`, `${m}m`, `${s}s`);
  return { label: parts.join(" "), done: false };
}

type Props = {
  slug: string;
  title: string;
  hostName: string;
  locationName: string;
  startAt: string;
  atmosphere: string;
  rsvpStatus: string | null;
  plusOnes: number;
  isOrganizer: boolean;
  appUrl: string;
  onLive?: () => void;
};

export function WaitingRoom({
  slug,
  title,
  hostName,
  locationName,
  startAt,
  atmosphere,
  rsvpStatus,
  plusOnes,
  isOrganizer,
  appUrl,
  onLive,
}: Props) {
  const router = useRouter();
  const theme = getAtmosphere(atmosphere);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = new Date(startAt).getTime() - now;
  const countdown = formatCountdown(remaining);

  useEffect(() => {
    if (remaining > 0) return;
    onLive?.();
    router.refresh();
  }, [remaining, onLive, router]);

  const whenLabel = useMemo(
    () =>
      new Date(startAt).toLocaleString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [startAt],
  );

  const going = rsvpStatus === "going";
  const maybe = rsvpStatus === "maybe";
  const declined = rsvpStatus === "declined";

  return (
    <div className="space-y-6 pb-16">
      <AtmosphereShell atmosphere={atmosphere}>
        <p className="text-sm uppercase tracking-[0.18em] opacity-70">
          {theme.label} · Before the event
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 opacity-75">
          Hosted by {hostName}
          {locationName ? ` · ${locationName}` : ""}
        </p>
        <p className="mt-1 opacity-70">{whenLabel}</p>
      </AtmosphereShell>

      <div
        className="panel relative overflow-hidden p-8 sm:p-10 text-center space-y-4 fade-up"
        style={{ boxShadow: "0 20px 50px rgba(21,41,53,0.12)" }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
          style={{ background: "linear-gradient(90deg, #698ea2, #e4a576)" }}
        />

        {going || isOrganizer ? (
          <>
            <p className="text-sm uppercase tracking-[0.16em] text-[var(--muted)]">
              You’re on the list
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--navy)]">
              We look forward to seeing you
              {plusOnes > 0 ? ` (+${plusOnes})` : ""}
            </h2>
            <p className="text-[var(--muted)] max-w-md mx-auto">
              The shared gallery and photo uploads unlock when the event begins —
              hang tight for the countdown.
            </p>
          </>
        ) : maybe ? (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
              Fingers crossed
            </h2>
            <p className="text-[var(--muted)]">
              You marked Maybe. Update your RSVP anytime before the event starts.
            </p>
          </>
        ) : declined ? (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
              We’ll miss you
            </h2>
            <p className="text-[var(--muted)]">
              If plans change, you can update your RSVP before the event begins.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
              You’re in
            </h2>
            <p className="text-[var(--muted)]">
              Waiting for the event to start before the gallery opens.
            </p>
          </>
        )}

        <div className="pt-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)] mb-2">
            Starts in
          </p>
          <p className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-[var(--navy)] tabular-nums">
            {countdown.label}
          </p>
        </div>
      </div>

      {isOrganizer ? (
        <SharePanel slug={slug} appUrl={appUrl} />
      ) : null}
    </div>
  );
}
