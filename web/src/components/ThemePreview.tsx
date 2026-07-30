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
        atmosphere={atmosphere}
        title={title}
        hostName={hostName}
        whenLabel={whenLabel}
        locationName={locationName}
        inviteCopy={inviteCopy}
        autoOpen
        compact
      />
      <p className="text-xs text-[var(--muted)]">
        Guests open an animated envelope — the card slides out with this atmosphere.
      </p>
    </div>
  );
}
