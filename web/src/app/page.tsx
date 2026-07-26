import Link from "next/link";
import { AuthControls } from "@/components/AuthControls";
import { EventList } from "@/components/EventList";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser, isAccountUser, publicUserDto } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEventExpired } from "@/lib/events";

export default async function HomePage() {
  const user = await getCurrentUser();
  const publicUser = user ? publicUserDto(user) : null;
  const hasAccount = Boolean(user && isAccountUser(user));

  const memberships = user
    ? await prisma.membership.findMany({
        where: { userId: user.id, status: "active" },
        include: {
          event: { include: { _count: { select: { media: true, memberships: true } } } },
        },
        orderBy: { joinedAt: "desc" },
        take: 24,
      })
    : [];

  const events = memberships.map(({ event, role }) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    role,
    expired: isEventExpired(event.expiresAt),
    memberCount: event._count.memberships,
    mediaCount: event._count.media,
    isOwner: event.ownerId === user!.id,
  }));

  return (
    <main>
      <SiteHeader right={<AuthControls user={publicUser} />} />

      <section className="container grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="fade-up">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">EventSphere</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Every event.
            <br />
            One digital home.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
            Hosts create an account. Guests join with a link or QR — no signup required.
            Each person only sees the events they’ve joined.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={hasAccount ? "/create" : "/signup?next=/create"}
              className="btn btn-primary"
            >
              {hasAccount ? "Create event" : "Create account & event"}
            </Link>
            <a href="#my-events" className="btn btn-ghost">
              My events
            </a>
          </div>
        </div>

        <div className="panel relative min-h-[320px] overflow-hidden p-6 fade-up">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "linear-gradient(145deg, rgba(226,163,90,0.2), transparent 45%), url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 40 40%22%3E%3Cg fill=%22%23f2efe6%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M0 40 L40 0 H20 L0 20z M40 40 V20 L20 40z%22/%3E%3C/g%3E%3C/svg%3E')",
            }}
          />
          <div className="relative space-y-4">
            <p className="font-[family-name:var(--font-display)] text-2xl">How access works</p>
            <ul className="space-y-3 text-[var(--muted)]">
              <li>Your account only lists events you host or joined</li>
              <li>Invite link / QR keeps galleries private</li>
              <li>Guests RSVP with a name — no account needed</li>
              <li>Sign in on any device to manage your events</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="my-events" className="container pb-20">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-3xl">My events</h2>
          <Link
            href={hasAccount ? "/create" : "/signup?next=/create"}
            className="text-sm text-[var(--accent)]"
          >
            + New event
          </Link>
        </div>

        {!user ? (
          <div className="panel p-8 text-[var(--muted)] space-y-3">
            <p>Sign in to see events on this account, or join an invite link to get started.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link href="/signup?next=/" className="btn btn-primary">
                Create account
              </Link>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="panel p-8 text-[var(--muted)] space-y-3">
            <p>No events yet.</p>
            {!hasAccount ? (
              <p className="text-sm">
                Create an account to host events you can reopen on any device.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {!hasAccount ? (
              <div className="panel p-4 text-sm text-[var(--muted)]">
                You’re browsing as a guest on this device.{" "}
                <Link href="/signup?next=/" className="text-[var(--navy)] underline">
                  Create an account
                </Link>{" "}
                to keep these events if you switch phones.
              </div>
            ) : null}
            <EventList events={events} />
          </div>
        )}
      </section>
    </main>
  );
}
