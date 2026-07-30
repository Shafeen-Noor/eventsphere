"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { PrintableInvite } from "@/components/PrintableInvite";

export function SharePanel({
  slug,
  appUrl,
  title = "EventSphere event",
  hostName = "Host",
  whenLabel,
  locationName = "",
  inviteCopy = "",
  atmosphere = "wedding",
}: {
  slug: string;
  /** Absolute origin from server/env — avoids hydration mismatch */
  appUrl: string;
  title?: string;
  hostName?: string;
  whenLabel?: string | null;
  locationName?: string;
  inviteCopy?: string;
  atmosphere?: string;
}) {
  const [copied, setCopied] = useState(false);
  const base = appUrl.replace(/\/$/, "");
  const joinUrl = `${base}/e/${slug}`;

  async function copy() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function printInvite() {
    document.body.classList.add("printing-invite");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-invite"), 400);
  }

  return (
    <div className="panel p-5 share-panel-screen">
      <h3 className="font-[family-name:var(--font-display)] text-xl mb-1">
        Invitation to share
      </h3>
      <p className="text-sm text-[var(--muted)] mb-4">
        One card with QR + link — copy it, print it, or show it on a screen.
      </p>
      <div className="flex flex-col sm:flex-row gap-5 items-center">
        <div className="rounded-2xl bg-white p-3">
          <QRCodeSVG value={joinUrl} size={148} />
        </div>
        <div className="flex-1 w-full space-y-3">
          <code className="block break-all rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm">
            {joinUrl}
          </code>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={copy}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={printInvite}>
              Print invitation
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          Print preview
        </p>
        <PrintableInvite
          slug={slug}
          appUrl={appUrl}
          title={title}
          hostName={hostName}
          whenLabel={whenLabel}
          locationName={locationName}
          inviteCopy={inviteCopy}
          atmosphere={atmosphere}
        />
      </div>
    </div>
  );
}
