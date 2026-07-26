import Link from "next/link";
import { notFound } from "next/navigation";
import { EventHub } from "@/components/EventHub";
import { InviteCard } from "@/components/InviteCard";
import { SiteHeader } from "@/components/SiteHeader";
import { WaitingRoom } from "@/components/WaitingRoom";
import { getAppUrl } from "@/lib/appUrl";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  hasEventStarted,
  isEventExpired,
  publicEventDto,
} from "@/lib/events";

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

  const dto = {
    ...publicEventDto(event),
    hostName: event.owner.displayName,
    mediaCount: event._count.media,
    memberCount: event._count.memberships,
  };

  const expired = isEventExpired(event.expiresAt);
  const started = hasEventStarted(event.startAt);
  const appUrl = getAppUrl();
  const isMember = membership && membership.status === "active";
  const isOrganizer =
    membership?.role === "organizer" || membership?.role === "co_organizer";

  // Guests wait in the invite lounge until start; hosts manage RSVPs/privileges early.
  const showWaitingRoom =
    isMember && !started && Boolean(event.startAt) && !isOrganizer;

  return (
    <main>
      <SiteHeader
        right={
          <Link href="/" className="hover:opacity-70">
            Home
          </Link>
        }
      />
      <div className="container">
        {!isMember ? (
          expired ? (
            <div className="panel p-8 text-[var(--muted)] my-8">
              This gallery has closed.
            </div>
          ) : (
            <InviteCard
              slug={slug}
              title={event.title}
              description={event.description}
              hostName={event.owner.displayName}
              locationName={event.locationName}
              startAt={event.startAt?.toISOString() ?? null}
              atmosphere={event.atmosphere}
              requiresPasscode={Boolean(event.passcodeHash)}
              rsvpEnabled={event.rsvpEnabled}
              allowPlusOnes={event.allowPlusOnes}
              maxPlusOnes={event.maxPlusOnes}
            />
          )
        ) : showWaitingRoom ? (
          <WaitingRoom
            slug={slug}
            title={event.title}
            hostName={event.owner.displayName}
            locationName={event.locationName}
            startAt={event.startAt!.toISOString()}
            atmosphere={event.atmosphere}
            rsvpStatus={rsvp?.status ?? null}
            plusOnes={rsvp?.plusOnes ?? 0}
            isOrganizer={false}
            appUrl={appUrl}
          />
        ) : (
          <EventHub
            event={dto}
            role={membership!.role}
            canUploadPrivilege={membership!.canUpload}
            canDownloadPrivilege={membership!.canDownload}
            initialRsvpStatus={rsvp?.status ?? null}
            initialPlusOnes={rsvp?.plusOnes ?? 0}
            appUrl={appUrl}
          />
        )}
      </div>
    </main>
  );
}
