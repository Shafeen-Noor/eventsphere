"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export function SharePanel({
  slug,
  appUrl,
}: {
  slug: string;
  /** Absolute origin from server/env — avoids hydration mismatch */
  appUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const base = appUrl.replace(/\/$/, "");
  const joinUrl = `${base}/e/${slug}`;

  async function copy() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="panel p-5">
      <h3 className="font-[family-name:var(--font-display)] text-xl mb-1">Share this event</h3>
      <p className="text-sm text-[var(--muted)] mb-4">
        Guests scan the QR or open the link — no app install required.
      </p>
      <div className="flex flex-col sm:flex-row gap-5 items-center">
        <div className="rounded-2xl bg-white p-3">
          <QRCodeSVG value={joinUrl} size={148} />
        </div>
        <div className="flex-1 w-full space-y-3">
          <code className="block break-all rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-sm">
            {joinUrl}
          </code>
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
