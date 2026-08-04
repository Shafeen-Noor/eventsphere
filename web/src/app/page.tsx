import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthControls } from "@/components/AuthControls";
import { EventList } from "@/components/EventList";
import { SiteHeader } from "@/components/SiteHeader";
import { UpgradeProButton } from "@/components/UpgradeProButton";
import { MarketingHome } from "@/components/MarketingHome";
import {
  getCurrentUser,
  isAccountUser,
  isEmailVerified,
  publicUserDto,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEventExpired } from "@/lib/events";
import { normalizePlanId, planLabel } from "@/lib/plans";

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

  const continueSlug = memberships[0]?.event.slug ?? null;
  const planId = user ? normalizePlanId(user.plan) : "free";
  const isPaidHost =
    hasAccount && (planId === "premium" || planId === "enterprise" || planId === "essential");

  // Logged-in account: personal workspace
  if (hasAccount && user) {
    return (
      <main className="es-site">
        <SiteHeader
          marketing={false}
          right={<AuthControls user={publicUser} />}
        />

        <section className="container py-10 sm:py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                Your workspace
              </p>
              <h1 className="section-title mt-2 text-3xl sm:text-4xl">
                Hi, {user.displayName}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {[planLabel(user.plan), user.organizationName, user.email]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isPaidHost ? <UpgradeProButton plan="premium" label="Upgrade to Premium" /> : null}
              <Link href="/create" className="btn btn-ghost">
                + New event
              </Link>
            </div>
          </div>

          {!isPaidHost ? (
            <div className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--accent-soft)] px-5 py-4">
              <p className="font-semibold text-[var(--navy)]">You’re on Free</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Create unlimited free events, or upgrade your account to Essential / Premium for
                higher caps and host tools across events.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <UpgradeProButton plan="premium" />
                <Link href="/pricing" className="btn btn-ghost">
                  Compare plans
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="section-title text-2xl">My events</h2>
          </div>

          {events.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 p-10 text-center">
              <h3 className="section-title text-2xl">No events yet</h3>
              <p className="max-w-md text-sm text-[var(--muted)]">
                Start a free gallery in under a minute — no payment required.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Link href="/create" className="btn btn-primary">
                  Create event
                </Link>
                <UpgradeProButton plan="premium" label="Upgrade to Premium" className="btn btn-ghost" />
              </div>
            </div>
          ) : (
            <EventList events={events} />
          )}
        </section>
      </main>
    );
  }

  // Marketing for anonymous + guest cookie users (continueSlug when they have an event)
  return (
    <main>
      <MarketingHome
        continueSlug={continueSlug}
        header={
          <SiteHeader
            variant="hero"
            right={
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--fg)]">
                  Sign in
                </Link>
                <Link href="/create" className="btn btn-primary">
                  Create Your Event
                </Link>
              </div>
            }
          />
        }
      />
    </main>
  );
}
