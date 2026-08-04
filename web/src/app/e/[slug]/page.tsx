import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { EventHub } from "@/components/EventHub";
import { InviteCard } from "@/components/InviteCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getAppUrl } from "@/lib/appUrl";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEventExpired, publicEventDto } from "@/lib/events";
import { getPlan } from "@/lib/plans";

type Props = { params: Promise<{ slug: string }> };

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      owner: { select: { displayName: true } },
      _count: { select: { media: true, memberships: true } },
    },
  });
  if (!event) notFound();

  const user = await getCurrentUser();
  const membership = user
    ? await prisma.membership.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: user.id } },
      })
    : null;

  const rsvp = user
    ? await prisma.rsvp.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: user.id } },
      })
    : null;

  const plan = getPlan(event.planTier);
  const dto = {
    ...publicEventDto(event),
    hostName: event.owner.displayName,
    mediaCount: event._count.media,
    memberCount: event._count.memberships,
    eventType: event.eventType,
    disposableCamera: event.disposableCamera,
    hideUntilEventEnd: event.hideUntilEventEnd,
    whiteLabel: event.whiteLabel,
    features: plan.features,
  };

  const expired = isEventExpired(event.expiresAt);

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  const appUrl = getAppUrl(
    host
      ? new Request(`${proto}://${host}/`, {
          headers: { host, "x-forwarded-host": host, "x-forwarded-proto": proto },
        })
      : undefined,
  );
  const isMember = membership && membership.status === "active";

  // Essential+ (coverPhoto) and Premium+ (password/analytics) collect guest contacts.
  const collectContacts =
    plan.features.coverPhoto ||
    plan.features.password ||
    plan.features.analytics;

  return (
    <main className={!isMember && !expired ? "guest-invite-main-wrap" : "es-site"}>
      {isMember || expired ? (
        <SiteHeader
          marketing={false}
          right={
            <Link href="/" className="hover:opacity-70">
              Home
            </Link>
          }
        />
      ) : null}
      {!isMember ? (
        expired ? (
          <div className="container">
            <div className="panel my-8 p-8 text-[var(--muted)]">This gallery has closed.</div>
          </div>
        ) : (
          <InviteCard
            slug={slug}
            title={event.title}
            description={event.description}
            hostName={event.owner.displayName}
            locationName={event.locationName}
            mapsUrl={event.mapsUrl}
            inviteCopy={event.inviteCopy}
            startAt={event.startAt?.toISOString() ?? null}
            endAt={event.endAt?.toISOString() ?? null}
            expiresAt={event.expiresAt.toISOString()}
            atmosphere={event.atmosphere}
            requiresPasscode={Boolean(event.passcodeHash)}
            rsvpEnabled={event.rsvpEnabled}
            allowPlusOnes={event.allowPlusOnes}
            maxPlusOnes={event.maxPlusOnes}
            collectContacts={collectContacts}
            planTier={event.planTier}
            features={plan.features}
          />
        )
      ) : (
        <div className="container">
          <EventHub
            event={dto}
            role={membership!.role}
            canUploadPrivilege={membership!.canUpload}
            canDownloadPrivilege={membership!.canDownload}
            initialRsvpStatus={rsvp?.status ?? null}
            initialPlusOnes={rsvp?.plusOnes ?? 0}
            appUrl={appUrl}
          />
        </div>
      )}
    </main>
  );
}
