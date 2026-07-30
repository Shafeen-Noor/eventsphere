"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AtmosphereShell } from "@/components/AtmosphereShell";
import { SharePanel } from "@/components/SharePanel";
import { getAtmosphere } from "@/lib/atmospheres";
import { formatEventWhen } from "@/lib/time";

function formatCountdown(ms: number) {
  if (ms <= 0) return { label: "Opening now", done: true, parts: [] as string[] };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`, `${m}m`, `${s}s`);
  return { label: parts.join(" "), done: false, parts: [d, h, m, s] as number[] };
}

type Props = {
  slug: string;
  title: string;
  hostName: string;
  locationName: string;
  inviteCopy?: string;
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
  inviteCopy = "",
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

  const whenLabel = useMemo(() => formatEventWhen(startAt), [startAt]);
  const going = rsvpStatus === "going";
  const maybe = rsvpStatus === "maybe";
  const declined = rsvpStatus === "declined";

  return (
    <div className="space-y-6 pb-16">
      <AtmosphereShell atmosphere={atmosphere}>
        <p className="text-sm uppercase tracking-[0.18em] opacity-70">
          {theme.label} · Doors closed
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

      <div className="event-moment event-moment-begin fade-up">
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">
          {countdown.done ? "Gallery unlocking" : "Countdown to open"}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {countdown.done ? (
            <div className="countdown-block min-w-[12rem]">
              <p className="countdown-value">Now</p>
              <p className="countdown-label">live</p>
            </div>
          ) : (
            [
              [String(countdown.parts[0] || 0), "days"],
              [String(countdown.parts[1]).padStart(2, "0"), "hrs"],
              [String(countdown.parts[2]).padStart(2, "0"), "min"],
              [String(countdown.parts[3]).padStart(2, "0"), "sec"],
            ].map(([value, label]) => (
              <div key={label} className="countdown-block">
                <p className="countdown-value">{value}</p>
                <p className="countdown-label">{label}</p>
              </div>
            ))
          )}
        </div>
        <h2 className="mt-8 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
          {countdown.done
            ? "Welcome in"
            : going || isOrganizer
              ? "You’re on the list"
              : "The gallery opens when the event begins"}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm opacity-80">
          {declined
            ? "You marked can’t make it — you can still change your RSVP."
            : maybe
              ? "You’re a maybe. Confirm Going to unlock uploads when doors open."
              : "When the clock hits zero, the shared album unlocks — camera, library, likes, and comments."}
        </p>
      </div>

      {isOrganizer ? (
        <SharePanel
          slug={slug}
          appUrl={appUrl}
          title={title}
          hostName={hostName}
          locationName={locationName}
          inviteCopy={inviteCopy}
          atmosphere={atmosphere}
          whenLabel={formatEventWhen(startAt)}
        />
      ) : null}
    </div>
  );
}
