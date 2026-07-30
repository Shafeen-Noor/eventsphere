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
  description,
}: {
  atmosphere: string;
  title?: string;
  hostName?: string;
  whenLabel?: string | null;
  locationName?: string;
  inviteCopy?: string;
  description?: string;
}) {
  const theme = getAtmosphere(atmosphere);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--navy)]">Live invitation</p>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          {theme.label} · updates as you type
        </p>
      </div>
      <AnimatedInvite
        size="compact"
        atmosphere={atmosphere}
        title={title}
        hostName={hostName}
        whenLabel={whenLabel}
        locationName={locationName}
        inviteCopy={inviteCopy}
        description={description}
        livePreview
      />
      <p className="text-xs text-[var(--muted)]">
        Guests open a full-screen envelope into this card. Change any field — the preview
        follows.
      </p>
    </div>
  );
}
