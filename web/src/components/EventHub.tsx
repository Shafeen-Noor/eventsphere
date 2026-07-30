"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AtmosphereShell } from "@/components/AtmosphereShell";
import { Countdown } from "@/components/Countdown";
import { Gallery } from "@/components/Gallery";
import { MembersPanel } from "@/components/MembersPanel";
import { RsvpPanel } from "@/components/RsvpPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SharePanel } from "@/components/SharePanel";
import { UploadPanel } from "@/components/UploadPanel";
import { WaitingRoom } from "@/components/WaitingRoom";
import { getAtmosphere } from "@/lib/atmospheres";
import { formatEventWhen } from "@/lib/time";

type EventDto = {
  slug: string;
  title: string;
  description: string;
  hostName: string;
  expiresAt: string;
  startAt: string | null;
  state: string;
  mediaCount: number;
  memberCount: number;
  useCase: string;
  locationName: string;
  inviteCopy?: string;
  mapsUrl?: string;
  rsvpEnabled: boolean;
  commentsEnabled: boolean;
  uploadsEnabled: boolean;
  requireRsvpToUpload: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  uploadMode: string;
  useGuestPrivileges: boolean;
  hasStarted: boolean;
  atmosphere: string;
  downloadPolicy: string;
  downloadsEnabled: boolean;
  downloadOpensAt: string | null;
  highlightsPublished: boolean;
};

type Tab = "gallery" | "people" | "rsvp" | "settings";

export function EventHub({
  event,
  role,
  canUploadPrivilege,
  canDownloadPrivilege,
  initialRsvpStatus,
  initialPlusOnes,
  appUrl,
}: {
  event: EventDto;
  role: string;
  canUploadPrivilege: boolean;
  canDownloadPrivilege: boolean;
  initialRsvpStatus: string | null;
  initialPlusOnes: number;
  appUrl: string;
}) {
  const router = useRouter();
  const theme = getAtmosphere(event.atmosphere);
  const [refreshKey, setRefreshKey] = useState(0);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(initialRsvpStatus);
  const [uploadsEnabled, setUploadsEnabled] = useState(event.uploadsEnabled);
  const [togglingUploads, setTogglingUploads] = useState(false);
  const [live, setLive] = useState(event.hasStarted);
  const [highlightsPublished, setHighlightsPublished] = useState(
    event.highlightsPublished,
  );

  useEffect(() => setUploadsEnabled(event.uploadsEnabled), [event.uploadsEnabled]);
  useEffect(() => setRsvpStatus(initialRsvpStatus), [initialRsvpStatus]);
  useEffect(() => setLive(event.hasStarted), [event.hasStarted]);

  useEffect(() => {
    if (!event.startAt || live) return;
    const ms = new Date(event.startAt).getTime() - Date.now();
    if (ms <= 0) {
      setLive(true);
      return;
    }
    const id = setTimeout(() => {
      setLive(true);
      router.refresh();
    }, ms + 250);
    return () => clearTimeout(id);
  }, [event.startAt, live, router]);

  const expired = event.state === "expired" || event.state === "ended";
  const isOrganizer = role === "organizer" || role === "co_organizer";
  const needsGoingRsvp =
    !isOrganizer &&
    event.rsvpEnabled &&
    event.requireRsvpToUpload &&
    rsvpStatus !== "going";

  const privilegeBlocksUpload =
    !isOrganizer && event.useGuestPrivileges && !canUploadPrivilege;

  const canUpload =
    live &&
    !expired &&
    (isOrganizer || (uploadsEnabled && !needsGoingRsvp && !privilegeBlocksUpload));

  const [tab, setTab] = useState<Tab>(
    !live && isOrganizer ? "people" : needsGoingRsvp ? "rsvp" : "gallery",
  );

  const uploadBlockReason = useMemo(() => {
    if (!live) return "Photo uploads unlock when the event starts.";
    if (expired) return "This event is closed — uploads are off.";
    if (isOrganizer) return null;
    if (!uploadsEnabled) return "The host hasn’t opened photo uploads yet.";
    if (needsGoingRsvp) return "RSVP as Going to unlock photo uploads.";
    if (privilegeBlocksUpload) {
      return "The host hasn’t given you permission to upload photos.";
    }
    return null;
  }, [
    live,
    expired,
    isOrganizer,
    uploadsEnabled,
    needsGoingRsvp,
    privilegeBlocksUpload,
  ]);

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "gallery", label: expired ? "Highlights" : "Gallery", show: live || isOrganizer || expired },
    { id: "people", label: "People", show: true },
    { id: "rsvp", label: "RSVP", show: event.rsvpEnabled },
    { id: "settings", label: "Settings", show: isOrganizer },
  ];

  async function toggleUploads(next: boolean) {
    setTogglingUploads(true);
    const res = await fetch(`/api/events/${event.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadsEnabled: next }),
    });
    setTogglingUploads(false);
    if (!res.ok) return;
    setUploadsEnabled(next);
    router.refresh();
  }

  // Host pre-event lounge: share RSVP link + manage privileges; no guest gallery yet.
  if (!live && isOrganizer && event.startAt) {
    return (
      <div className="space-y-6 pb-16">
        <WaitingRoom
          slug={event.slug}
          title={event.title}
          hostName={event.hostName}
          locationName={event.locationName}
          inviteCopy={event.inviteCopy || ""}
          startAt={event.startAt}
          atmosphere={event.atmosphere}
          rsvpStatus={rsvpStatus}
          plusOnes={initialPlusOnes}
          isOrganizer
          appUrl={appUrl}
          onLive={() => setLive(true)}
        />

        <div className="flex flex-wrap gap-2">
          {tabs
            .filter((t) => t.show && t.id !== "gallery")
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn btn-ghost px-4 py-2 text-sm"
                style={{
                  background: tab === t.id ? "var(--accent-soft)" : undefined,
                  borderColor: tab === t.id ? "var(--accent)" : undefined,
                }}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
        </div>

        {tab === "people" ? (
          <MembersPanel slug={event.slug} isOrganizer={isOrganizer} />
        ) : null}
        {tab === "rsvp" && event.rsvpEnabled ? (
          <RsvpPanel
            slug={event.slug}
            allowPlusOnes={event.allowPlusOnes}
            maxPlusOnes={event.maxPlusOnes}
            onSaved={(status) => {
              setRsvpStatus(status);
              router.refresh();
            }}
          />
        ) : null}
        {tab === "settings" ? (
          <SettingsPanel
            slug={event.slug}
            initial={{
              title: event.title,
              description: event.description,
              locationName: event.locationName,
              commentsEnabled: event.commentsEnabled,
              rsvpEnabled: event.rsvpEnabled,
              uploadsEnabled,
              requireRsvpToUpload: event.requireRsvpToUpload,
              allowPlusOnes: event.allowPlusOnes,
              maxPlusOnes: event.maxPlusOnes,
              uploadMode: event.uploadMode,
              startAt: event.startAt,
              atmosphere: event.atmosphere,
              downloadPolicy: event.downloadPolicy,
              downloadsEnabled: event.downloadsEnabled,
              downloadOpensAt: event.downloadOpensAt,
              useCase: event.useCase,
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <AtmosphereShell atmosphere={event.atmosphere}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] opacity-70">
              {theme.label} ·{" "}
              {event.useCase === "celebration" ? "Celebration" : "Friends"}
              {live ? " · Live" : ""}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl mt-2">
              {event.title}
            </h1>
            <p className="mt-2 opacity-75">
              Hosted by {event.hostName}
              {event.locationName ? ` · ${event.locationName}` : ""}
              {` · ${event.memberCount} people · ${event.mediaCount} photos`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Countdown expiresAt={event.expiresAt} />
            <span
              className="rounded-full px-3 py-1 text-xs uppercase tracking-wider"
              style={{
                background: uploadsEnabled
                  ? "rgba(105,142,162,0.2)"
                  : "rgba(196,92,74,0.18)",
              }}
            >
              Uploads {uploadsEnabled ? "open" : "closed"}
            </span>
          </div>
        </div>

        {event.description ? <p className="max-w-2xl opacity-90">{event.description}</p> : null}

        {isOrganizer ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={togglingUploads || uploadsEnabled}
              onClick={() => toggleUploads(true)}
            >
              Open guest uploads
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={togglingUploads || !uploadsEnabled}
              onClick={() => toggleUploads(false)}
            >
              Close guest uploads
            </button>
          </div>
        ) : null}
      </AtmosphereShell>

      <div className="flex flex-wrap gap-2">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              className="btn btn-ghost px-4 py-2 text-sm"
              style={{
                background: tab === t.id ? "var(--accent-soft)" : undefined,
                borderColor: tab === t.id ? "var(--accent)" : undefined,
              }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "gallery" ? (
        <>
          {isOrganizer ? (
            <SharePanel
              slug={event.slug}
              appUrl={appUrl}
              title={event.title}
              hostName={event.hostName}
              locationName={event.locationName}
              inviteCopy={event.inviteCopy || ""}
              atmosphere={event.atmosphere}
              whenLabel={
                event.startAt ? formatEventWhen(event.startAt) : null
              }
            />
          ) : null}
          {needsGoingRsvp ? (
            <RsvpPanel
              slug={event.slug}
              gateMode
              allowPlusOnes={event.allowPlusOnes}
              maxPlusOnes={event.maxPlusOnes}
              onSaved={(status) => {
                setRsvpStatus(status);
                if (status === "going") setTab("gallery");
                router.refresh();
              }}
            />
          ) : null}
          {uploadBlockReason && !needsGoingRsvp ? (
            <div className="panel p-5 text-sm text-[var(--muted)]">{uploadBlockReason}</div>
          ) : null}
          {canUpload ? (
            <UploadPanel
              slug={event.slug}
              disabled={false}
              uploadMode={event.uploadMode as "both" | "camera" | "library"}
              onUploaded={() => setRefreshKey((k) => k + 1)}
            />
          ) : null}
          {live || expired ? (
            <Gallery
              slug={event.slug}
              refreshKey={refreshKey}
              commentsEnabled={event.commentsEnabled}
              atmosphere={event.atmosphere}
              eventClosed={expired}
              isOrganizer={isOrganizer}
              highlightsPublished={highlightsPublished}
              onHighlightsPublished={setHighlightsPublished}
            />
          ) : (
            <div className="panel p-5 text-sm text-[var(--muted)]">
              Gallery opens when the event starts.
              {!canDownloadPrivilege && event.useGuestPrivileges
                ? " Download access is managed per guest by the host."
                : ""}
            </div>
          )}
        </>
      ) : null}

      {tab === "people" ? (
        <MembersPanel slug={event.slug} isOrganizer={isOrganizer} />
      ) : null}

      {tab === "rsvp" && event.rsvpEnabled ? (
        <RsvpPanel
          slug={event.slug}
          allowPlusOnes={event.allowPlusOnes}
          maxPlusOnes={event.maxPlusOnes}
          onSaved={(status) => {
            setRsvpStatus(status);
            router.refresh();
          }}
        />
      ) : null}

      {tab === "settings" && isOrganizer ? (
        <SettingsPanel
          slug={event.slug}
          initial={{
            title: event.title,
            description: event.description,
            locationName: event.locationName,
            commentsEnabled: event.commentsEnabled,
            rsvpEnabled: event.rsvpEnabled,
            uploadsEnabled,
            requireRsvpToUpload: event.requireRsvpToUpload,
            allowPlusOnes: event.allowPlusOnes,
            maxPlusOnes: event.maxPlusOnes,
            uploadMode: event.uploadMode,
            startAt: event.startAt,
            atmosphere: event.atmosphere,
            downloadPolicy: event.downloadPolicy,
            downloadsEnabled: event.downloadsEnabled,
            downloadOpensAt: event.downloadOpensAt,
            useCase: event.useCase,
          }}
        />
      ) : null}
    </div>
  );
}
