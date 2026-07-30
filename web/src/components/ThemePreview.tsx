"use client";

import { AnimatedInvite } from "@/components/AnimatedInvite";
import { getAtmosphere } from "@/lib/atmospheres";

export function ThemePreview({
  atmosphere,
  title,
  hostName,
  whenLabel,
  locationName,
  inviteCopy,
}: {
  atmosphere: string;
  title?: string;
  hostName?: string;
  whenLabel?: string | null;
  locationName?: string;
  inviteCopy?: string;
}) {
  const theme = getAtmosphere(atmosphere);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--navy)]">Live invitation</p>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          {theme.label} · tap to reopen
        </p>
      </div>
      <AnimatedInvite
        key={atmosphere}
        size="compact"
        atmosphere={atmosphere}
        title={title}
        hostName={hostName}
        whenLabel={whenLabel}
        locationName={locationName}
        inviteCopy={inviteCopy}
        autoOpen
      />
      <p className="text-xs text-[var(--muted)]">
        Guests get a full-screen envelope that opens into this card.
      </p>
    </div>
  );
}
