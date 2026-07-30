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

  const isProSub = hasAccount && user?.plan === "pro";

  return (
    <main>
      <div className="hero-block">
        <SiteHeader
          variant="hero"
          right={
            hasAccount ? (
              <AuthControls user={publicUser} />
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-semibold text-white/80 hover:text-white">
                  Sign in
                </Link>
                <Link
                  href="/signup?path=subscribe&next=/create?mode=subscription"
                  className="btn btn-primary"
                >
                  Subscribe to Pro
                </Link>
              </div>
            )
          }
        />

        <section className="container grid gap-10 pb-16 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:pb-20 lg:pt-16">
          <div className="fade-up max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/90">
              Shared event galleries
            </p>
            <h1 className="section-title mt-4 text-5xl text-white sm:text-6xl lg:text-7xl">
              EventSphere
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              Guests scan a QR, upload from the browser, and every memory lands in one private
              gallery — no app installs, no AirDrop chaos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/create?mode=free" className="btn btn-primary">
                Start a free event
              </Link>
              <Link
                href="/signup?path=onetime&next=/create?mode=onetime"
                className="btn btn-ghost border-white/20 bg-white/10 text-white hover:bg-white/15"
              >
                Run one Pro event
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Free needs no account. Pro is one paid event or a monthly subscription.
            </p>
          </div>

          <div className="fade-up rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100/80">
              Built for the room
            </p>
            <ul className="mt-5 space-y-4 text-slate-200">
              <li>QR + link invite — guests join with a name</li>
              <li>Timed upload windows so the night doesn’t spill forever</li>
              <li>Host approval, private albums, and curated highlights on Pro</li>
              <li>Same link from invite → live → published recap</li>
            </ul>
          </div>
        </section>
      </div>

      {hasAccount ? (
        <section id="my-events" className="container py-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="section-title text-3xl">My events</h2>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--navy)]">
                  {planLabel(user?.plan)} plan
                </span>
              </div>
              {user ? (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {[user.organizationName, user.email].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
            <Link
              href={isProSub ? "/create?mode=subscription" : "/create?mode=onetime"}
              className="text-sm font-semibold text-[var(--accent)]"
            >
              + New event
            </Link>
          </div>
          {events.length === 0 ? (
            <div className="panel flex flex-col items-center gap-3 p-10 text-center">
              <h3 className="section-title text-2xl">No events yet</h3>
              <p className="max-w-md text-sm text-[var(--muted)]">
                {isProSub
                  ? "Your subscription is ready. Create your first shared gallery."
                  : "Create a one-time Pro event, or subscribe to run multiple events this month."}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Link href="/create?mode=onetime" className="btn btn-primary">
                  One Pro event
                </Link>
                {!isProSub ? (
                  <Link
                    href="/signup?path=subscribe&next=/create?mode=subscription"
                    className="btn btn-ghost"
                  >
                    Subscribe to Pro
                  </Link>
                ) : (
                  <Link href="/create?mode=subscription" className="btn btn-ghost">
                    Create event
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <EventList events={events} />
          )}
        </section>
      ) : null}

      <section id="how-it-works" className="container py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          How it works
        </p>
        <h2 className="section-title mt-3 max-w-2xl text-4xl sm:text-5xl">
          From invite to highlights in one link
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              t: "Create the event",
              d: "Free takes seconds with no signup. Pro unlocks approval, custom cards, and longer windows.",
            },
            {
              n: "02",
              t: "Guests scan & upload",
              d: "Browser camera or library — no app. Caps and upload windows keep the gallery under control.",
            },
            {
              n: "03",
              t: "You curate & publish",
              d: "Approve photos, build highlights, and send everyone back to the same QR when the night is ready.",
            },
          ].map((step) => (
            <div key={step.n} className="panel p-6">
              <p className="text-sm font-bold text-[var(--accent)]">{step.n}</p>
              <h3 className="section-title mt-3 text-2xl">{step.t}</h3>
              <p className="mt-3 text-[var(--muted)] leading-relaxed">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-white py-16">
        <div className="container">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            Why hosts switch
          </p>
          <h2 className="section-title mt-3 max-w-2xl text-4xl">
            Designed for the dance floor, not another cloud folder
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              {
                t: "No guest friction",
                d: "QR opens a private invite. Guests type a name and start uploading — no App Store detour.",
              },
              {
                t: "Host stays in control",
                d: "Cap guests and photos, set how long uploads stay open, approve what goes public on Pro.",
              },
              {
                t: "One link for every chapter",
                d: "Invite card, live gallery, and published highlights all live on the same event URL.",
              },
              {
                t: "Built for real venues",
                d: "Weak Wi‑Fi happens. Offline queue and capture modes keep phones contributing when signal dips.",
              },
            ].map((item) => (
              <div key={item.t} className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6">
                <h3 className="section-title text-2xl">{item.t}</h3>
                <p className="mt-3 text-[var(--muted)] leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Made for
        </p>
        <h2 className="section-title mt-3 max-w-2xl text-4xl">
          Birthdays, weddings, trips, and private dinners
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              t: "Birthdays",
              d: "Put the QR on the cake table. Collect every phone’s angle without chasing AirDrops.",
            },
            {
              t: "Weddings",
              d: "Pro approval keeps the album tasteful. Publish highlights when you’re ready to share.",
            },
            {
              t: "Group trips",
              d: "One link for the weekend. Caps stop one guest from flooding the feed.",
            },
            {
              t: "Private dinners",
              d: "Free is enough for ten friends and a short night — no signup required.",
            },
          ].map((item) => (
            <div key={item.t} className="panel p-5">
              <h3 className="section-title text-xl">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="container py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Pricing
        </p>
        <h2 className="section-title mt-3 max-w-2xl text-4xl sm:text-5xl">
          Three tiers, clearly separated
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--muted)]">
          Free is account-free. Pro is either a single paid event or a monthly subscription.
          Professional is for agencies — coming soon.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <article className="tier-card">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Free</p>
            <h3 className="section-title mt-2 text-3xl">Start free</h3>
            <p className="mt-2 text-4xl font-bold tracking-tight">$0</p>
            <p className="mt-2 text-sm text-[var(--muted)]">No account · one event · 24 hours</p>
            <ul className="mt-6 flex-1">
              <li>Up to 10 guests</li>
              <li>Up to 100 photos</li>
              <li>Host sets photos per guest</li>
              <li>QR + link invite</li>
              <li>Guests see their own photos</li>
              <li>No password, no dashboard</li>
            </ul>
            <Link href="/create?mode=free" className="btn btn-ghost mt-8 w-full">
              Start a free event
            </Link>
          </article>

          <article className="tier-card featured">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Pro</p>
            <h3 className="section-title mt-2 text-3xl">Pro</h3>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              $49 <span className="text-lg font-semibold text-[var(--muted)]">once</span>
            </p>
            <p className="text-sm text-[var(--muted)]">or $29 / month for multiple events</p>
            <ul className="mt-6 flex-1">
              <li>Up to 150 guests · 2,000 media</li>
              <li>Event life up to 7 days</li>
              <li>Separate guest upload window</li>
              <li>Approval queue & guest visibility</li>
              <li>Custom invite card, emoji, Maps link</li>
              <li>Email / WhatsApp on join · highlights publish</li>
              <li>RSVP, themes, live wall, videos</li>
            </ul>
            <div className="mt-8 grid gap-2">
              <Link
                href="/signup?path=onetime&next=/create?mode=onetime"
                className="btn btn-primary w-full"
              >
                One Pro event — $49
              </Link>
              <Link
                href="/signup?path=subscribe&next=/create?mode=subscription"
                className="btn btn-ghost w-full"
              >
                Subscribe — $29/mo
              </Link>
            </div>
          </article>

          <article className="tier-card opacity-95">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Professional
            </p>
            <h3 className="section-title mt-2 text-3xl">Agency</h3>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              $99<span className="text-lg text-[var(--muted)]">/mo</span>
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">Coming soon</p>
            <ul className="mt-6 flex-1">
              <li>White-label branding</li>
              <li>Multi-client dashboard</li>
              <li>Higher caps & SLAs</li>
              <li>Moderation team tools</li>
              <li>Analytics & exports</li>
            </ul>
            <Link href="/professional" className="btn btn-ghost mt-8 w-full">
              View coming soon
            </Link>
          </article>
        </div>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Want the full matrix?{" "}
          <Link href="/pricing" className="font-semibold text-[var(--accent)]">
            Open the pricing comparison →
          </Link>
        </p>
      </section>

      <section className="border-y border-[var(--line)] bg-white py-16">
        <div className="container max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">FAQ</p>
          <h2 className="section-title mt-3 text-3xl sm:text-4xl">Straight answers</h2>
          <div className="mt-8 space-y-4">
            {[
              {
                q: "Does Free ever require an account?",
                a: "No. Free events are created with a host name only. Guests also join with a name — no passwords.",
              },
              {
                q: "What’s the difference between $49 once and $29/mo?",
                a: "$49 unlocks Pro controls for a single event. $29/mo is a subscription for hosts who create multiple Pro events.",
              },
              {
                q: "Do guests need to install an app?",
                a: "No. The invite opens in the browser. Camera or photo library — then upload.",
              },
              {
                q: "When does Professional launch?",
                a: "It’s listed as coming soon for agencies and venues that need white-label and multi-client tools. Use Pro today.",
              },
            ].map((item) => (
              <div key={item.q} className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5">
                <h3 className="font-semibold text-[var(--navy)]">{item.q}</h3>
                <p className="mt-2 text-[var(--muted)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--navy)] py-16 text-white">
        <div className="container flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="section-title text-3xl sm:text-4xl">Ready for tonight’s event?</h2>
            <p className="mt-3 max-w-xl text-slate-300">
              Launch a free gallery in under a minute, or unlock Pro controls for the celebration
              that needs curation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/create?mode=free" className="btn btn-primary">
              Start free
            </Link>
            <Link
              href="/signup?path=onetime&next=/create?mode=onetime"
              className="btn btn-ghost border-white/20 bg-transparent text-white"
            >
              Go Pro once
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-white py-8">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>© {new Date().getFullYear()} EventSphere</p>
          <div className="flex gap-4">
            <Link href="/pricing">Pricing</Link>
            <Link href="/professional">Professional</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
