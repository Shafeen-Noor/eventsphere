"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatedInvite } from "@/components/AnimatedInvite";

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const { ref, visible } = useInView<HTMLElement>();
  return (
    <section
      id={id}
      ref={ref}
      className={`${className} bang-section ${visible ? "is-in" : ""}`}
    >
      {children}
    </section>
  );
}

function Polaroid({
  caption,
  tone,
  className,
}: {
  caption: string;
  tone: "a" | "b" | "c";
  className: string;
}) {
  return (
    <div className={`cp-polaroid cp-tone-${tone} ${className}`} aria-hidden>
      <div className="cp-polaroid-shot" />
      <span className="cp-polaroid-caption">{caption}</span>
    </div>
  );
}

export function MarketingHome({ header }: { header?: React.ReactNode }) {
  return (
    <div className="champagne-paper">
      <div className="hero-block hero-bang cp-hero">
        {header}
        <div className="container relative z-[1] pb-16 pt-6 text-center lg:pb-20 lg:pt-10">
          <div className="cp-hero-motifs" aria-hidden>
            <Polaroid caption="table 4" tone="a" className="cp-p1" />
            <Polaroid caption="first toast" tone="b" className="cp-p2" />
            <Polaroid caption="sparklers" tone="c" className="cp-p3" />
            <span className="cp-icon cp-cam">📷</span>
            <span className="cp-icon cp-pop">🎉</span>
            <span className="cp-icon cp-champ">🍾</span>
          </div>

          <div className="bang-hero-copy relative mx-auto max-w-2xl">
            <h1 className="section-title text-5xl text-[var(--fg)] sm:text-6xl lg:text-7xl">
              EventSphere
            </h1>
            <p className="mt-4 text-xl font-medium text-[var(--fg)] sm:text-2xl">
              The shared album for nights worth keeping.
            </p>
            <p className="mx-auto mt-4 max-w-md text-[var(--muted)] leading-relaxed">
              Guests add photos from a link. You keep one gallery — private, simple, and ready when
              the toast is over.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/create?mode=free" className="btn btn-primary">
                Create your event
              </Link>
              <Link href="/#how-it-works" className="btn btn-ghost">
                See how it works
              </Link>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">Free needs no account.</p>
          </div>

          <div className="bang-hero-invite cp-invite-stage relative mx-auto mt-12 max-w-md">
            <Polaroid caption="9:41 pm" tone="b" className="cp-p4" />
            <Polaroid caption="afters" tone="a" className="cp-p5" />
            <AnimatedInvite
              size="default"
              atmosphere="wedding"
              title="Tonight’s celebration"
              hostName="You"
              whenLabel="Saturday · 7:00 PM"
              inviteCopy="You’re invited — open to join the gallery."
              autoOpen
            />
          </div>
        </div>
      </div>

      <Reveal id="how-it-works" className="container py-20">
        <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--champagne)]">
          How it works
        </p>
        <h2 className="section-title mx-auto mt-3 max-w-xl text-center text-4xl sm:text-5xl">
          Built for hosts
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[var(--muted)]">
          Polaroids and poppers stay in the margins — the product stays clear.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              icon: "📷",
              t: "Capture",
              d: "Guests shoot in the browser. Everything lands in your private event gallery.",
            },
            {
              icon: "🍾",
              t: "Celebrate",
              d: "Pass a QR at the table. No chasing group chats for photos the next morning.",
            },
            {
              icon: "🖼️",
              t: "Keep",
              d: "Approve, highlight, and revisit the set when you’re ready.",
            },
          ].map((item, i) => (
            <div
              key={item.t}
              className="bang-card text-center"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="cp-feat-icon mx-auto">{item.icon}</div>
              <h3 className="section-title mt-4 text-2xl">{item.t}</h3>
              <p className="mt-2 text-[var(--muted)] leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal
        id="pricing"
        className="border-y border-[var(--line)] bg-[var(--bg-elevated)] py-20"
      >
        <div className="container">
          <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--champagne)]">
            Pricing
          </p>
          <h2 className="section-title mx-auto mt-3 max-w-xl text-center text-4xl">
            Simple plans
          </h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            <article className="tier-card bang-card">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Free
              </p>
              <h3 className="section-title mt-2 text-3xl">$0</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">No account · 24 hours</p>
              <ul className="mt-6 flex-1">
                <li>10 guests · 100 photos</li>
                <li>Animated QR invite</li>
                <li>Guests see their own photos</li>
              </ul>
              <Link href="/create?mode=free" className="btn btn-ghost mt-8 w-full">
                Start a free event
              </Link>
            </article>

            <article className="tier-card featured bang-card" style={{ transitionDelay: "100ms" }}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                Pro
              </p>
              <h3 className="section-title mt-2 text-3xl">From $9 once</h3>
              <p className="text-sm text-[var(--muted)]">or $29 / month</p>
              <ul className="mt-6 flex-1">
                <li>Pick size: 25 → 150 guests</li>
                <li>$9 · $15 · $25 · $39 by pack</li>
                <li>Approval, invite, highlight collage</li>
              </ul>
              <div className="mt-8 grid gap-2">
                <Link
                  href="/signup?path=onetime&next=/create?mode=onetime"
                  className="btn btn-primary w-full"
                >
                  One Pro event — from $9
                </Link>
                <Link
                  href="/signup?path=subscribe&next=/create?mode=subscription"
                  className="btn btn-ghost w-full"
                >
                  Subscribe — $29/mo
                </Link>
              </div>
            </article>

            <article className="tier-card bang-card" style={{ transitionDelay: "180ms" }}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                Professional
              </p>
              <h3 className="section-title mt-2 text-3xl">Soon</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">For agencies</p>
              <ul className="mt-6 flex-1">
                <li>White-label · multi-client</li>
                <li>Higher caps & SLAs</li>
              </ul>
              <Link href="/professional" className="btn btn-ghost mt-8 w-full">
                View coming soon
              </Link>
            </article>
          </div>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            <Link href="/pricing" className="font-semibold text-[var(--accent)]">
              Full feature comparison →
            </Link>
          </p>
        </div>
      </Reveal>

      <section className="container py-20">
        <div className="cp-cta-band bang-fade">
          <div>
            <h2 className="section-title text-3xl sm:text-4xl">Ready for tonight?</h2>
            <p className="mt-3 max-w-xl text-[var(--muted)]">
              Launch a free gallery in under a minute — or unlock Pro when the night needs curation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/create?mode=free" className="btn btn-primary">
              Start free
            </Link>
            <Link
              href="/signup?path=onetime&next=/create?mode=onetime"
              className="btn btn-ghost"
            >
              Go Pro once
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--bg-elevated)] py-8">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>© {new Date().getFullYear()} EventSphere</p>
          <div className="flex gap-4">
            <Link href="/pricing">Pricing</Link>
            <Link href="/professional">Professional</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
