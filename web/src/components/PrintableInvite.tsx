"use client";

import { QRCodeSVG } from "qrcode.react";
import { getAtmosphere } from "@/lib/atmospheres";

export function PrintableInvite({
  slug,
  appUrl,
  title,
  hostName,
  whenLabel,
  locationName,
  inviteCopy,
  atmosphere = "wedding",
}: {
  slug: string;
  appUrl: string;
  title: string;
  hostName: string;
  whenLabel?: string | null;
  locationName?: string;
  inviteCopy?: string;
  atmosphere?: string;
}) {
  const theme = getAtmosphere(atmosphere);
  const joinUrl = `${appUrl.replace(/\/$/, "")}/e/${slug}`;

  return (
    <div className="print-invite-sheet" id="print-invite-sheet">
      <div
        className="print-invite-card"
        style={{
          background: theme.bg,
          color: theme.fg,
          borderColor: theme.accent,
        }}
      >
        <p className="print-invite-kicker" style={{ color: theme.accent }}>
          You’re invited · {theme.label}
        </p>
        <p className="print-invite-motif" aria-hidden>
          {theme.motif}
        </p>
        <h2 className="print-invite-title">{title || "EventSphere event"}</h2>
        <p className="print-invite-meta">
          Hosted by {hostName || "Host"}
          {locationName ? ` · ${locationName}` : ""}
        </p>
        {whenLabel ? <p className="print-invite-when">{whenLabel}</p> : null}
        {inviteCopy ? <p className="print-invite-copy">{inviteCopy}</p> : null}
        <div className="print-invite-qr">
          <div className="print-invite-qr-box">
            <QRCodeSVG value={joinUrl} size={168} />
          </div>
          <div className="print-invite-link-block">
            <p className="print-invite-scan">Scan to join the gallery</p>
            <p className="print-invite-url">{joinUrl}</p>
            <p className="print-invite-hint">No app required · open on your phone</p>
          </div>
        </div>
      </div>
    </div>
  );
}
