import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthControls } from "@/components/AuthControls";
import { EventList } from "@/components/EventList";
import { SiteHeader } from "@/components/SiteHeader";
import {
  getCurrentUser,
  isAccountUser,
  isEmailVerified,
  publicUserDto,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEventExpired } from "@/lib/events";
import { planLabel } from "@/lib/plans";

export default async function HomePage() {
  const user = await getCurrentUser();
  const publicUser = user ? publicUserDto(user) : null;
  const hasAccount = Boolean(user && isAccountUser(user));
  const verified = Boolean(user && isEmailVerified(user));

  if (hasAccount && user && !verified) {
    redirect("/verify?next=/");
  }

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

  const createHref = hasAccount ? "/create?mode=subscription" : "/signup?next=/create?mode=subscription";
  const instantHref = hasAccount
    ? "/create?mode=instant"
    : "/signup?next=/create?mode=instant";

  return (
    <main>
      <SiteHeader right={<AuthControls user={publicUser} />} />

      <section className="container grid gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="fade-up">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">Landing</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Event
            <br />
            Sphere
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
            Best memories belong to everyone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {hasAccount ? (
              <Link href={createHref} className="btn btn-ghost">
                + Create a new event
              </Link>
            ) : (
              <Link href="/signup?next=/" className="btn btn-ghost">
                Create account
              </Link>
            )}
            <Link href={instantHref} className="btn btn-primary">
              Create an instant event
            </Link>
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Account → empty event list · Instant → one-time fee
          </p>
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
              <li>Subscribe for an empty My events dashboard</li>
              <li>Or pay once for a single instant event</li>
              <li>Guests join with a link or QR — no account needed</li>
              <li>Gallery unlocks at your start time</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="my-events" className="container pb-20">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-3xl">My events</h2>
              {hasAccount ? (
                <span className="inline-flex items-center rounded-full bg-[rgba(105,142,162,0.16)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--navy)]">
                  {planLabel(user?.plan)} plan
                </span>
              ) : null}
            </div>
            {hasAccount && user ? (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {[user.organizationName, user.email].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <Link href={createHref} className="text-sm text-[var(--accent)]">
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
          <div className="panel flex flex-col items-center justify-center gap-3 border border-dashed border-[rgba(21,41,53,0.2)] bg-white/55 p-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[rgba(105,142,162,0.2)] font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
              ∅
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
              No events yet
            </h3>
            <p className="max-w-sm text-sm text-[var(--muted)]">
              Your list is empty. Create your first shared gallery for a wedding, party, or brand
              event.
            </p>
            <Link href={createHref} className="btn btn-primary mt-2">
              + Create a new event
            </Link>
            <p className="text-xs text-[var(--muted)]">
              Included in your subscription — no per-event checkout
            </p>
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
