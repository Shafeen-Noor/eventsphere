"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NeonReceptionHero } from "@/components/NeonReceptionHero";
import { VisualMotifs } from "@/components/VisualMotifs";

function useInView<T extends HTMLElement>(threshold = 0.2) {
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

function BangSection({
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

export function MarketingHome({ header }: { header?: React.ReactNode }) {
  return (
    <>
      <div className="hero-block hero-bang neon-reception-hero">
        <div className="hero-orbit" aria-hidden />
        <div className="hero-orbit hero-orbit-2" aria-hidden />
        {header}
        <div className="container relative z-[1] grid gap-10 pb-28 pt-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:pb-32 lg:pt-8">
          <div className="bang-hero-copy">
            <h1 className="section-title text-5xl text-[var(--hero-accent)] sm:text-6xl lg:text-7xl">
              EventSphere
            </h1>
            <p className="neon-hero-tagline mt-5 max-w-lg text-2xl leading-snug sm:text-3xl">
              Every moment, together.
              <br />
              All your photos, <span className="neon-magenta">in one place.</span>
            </p>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[rgba(232,201,106,0.72)]">
              Collect, relive, and celebrate every moment with the people who made it unforgettable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/create?mode=free" className="btn bang-cta neon-cta-gold">
                Create your event
              </Link>
              <Link href="/#how-it-works" className="btn neon-cta-magenta">
                See how it works
              </Link>
            </div>
          </div>

          <div className="bang-hero-invite relative min-h-[340px] lg:min-h-[460px]">
            <NeonReceptionHero />
          </div>
        </div>
      </div>

      <BangSection id="how-it-works" className="picnic-band container py-20">
        <VisualMotifs variant="section" />
        <div className="relative z-[1]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cobalt)]">
            How it works
          </p>
          <h2 className="section-title mt-3 max-w-2xl text-4xl sm:text-5xl">
            Envelope → flash → film strip
          </h2>
          <div className="cobalt-rule" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Open the invite",
                d: "A neon-gala envelope opens into your polaroid-ready event card.",
                icon: "✉️",
              },
              {
                n: "02",
                t: "Fill the reel",
                d: "Guests shoot from the browser — cameras, poppers, and caps keep it lively.",
                icon: "📷",
              },
              {
                n: "03",
                t: "Publish the cut",
                d: "Editorial templates + filters turn the night into a highlight strip.",
                icon: "🎞️",
              },
            ].map((step, i) => (
              <div
                key={step.n}
                className="panel bang-card p-6"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <p className="text-3xl" aria-hidden>
                  {step.icon}
                </p>
                <p className="mt-3 text-sm font-bold text-[var(--accent)]">{step.n}</p>
                <h3 className="section-title mt-2 text-2xl">{step.t}</h3>
                <p className="mt-3 text-[var(--muted)] leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </BangSection>

      <BangSection className="border-y border-[var(--line)] bg-[var(--bg-elevated)] py-20 relative overflow-hidden">
        <VisualMotifs variant="section" />
        <div className="container relative z-[1]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--spark)]">
            Why it hits
          </p>
          <h2 className="section-title mt-3 max-w-2xl text-4xl">
            Gala energy, picnic warmth, editorial polish
          </h2>
          <div className="cobalt-rule" />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              {
                t: "Cinematic invites",
                d: "Champagne-gold seals and full-screen envelopes — not a plain link page.",
              },
              {
                t: "Polaroid presence",
                d: "Photo tiles, film sprockets, and tumbling frames make the gallery feel real.",
              },
              {
                t: "Lens-grade control",
                d: "Caps, approval, and highlight studio — host like a photo editor.",
              },
              {
                t: "Party motion",
                d: "Poppers, shutter flashes, and rolling reels keep the page alive.",
              },
            ].map((item, i) => (
              <div
                key={item.t}
                className="bang-card rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <h3 className="section-title text-2xl">{item.t}</h3>
                <p className="mt-3 text-[var(--muted)] leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </BangSection>

      <BangSection id="pricing" className="container py-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Pricing
        </p>
        <h2 className="section-title mt-3 max-w-2xl text-4xl sm:text-5xl">
          Three tiers, clearly separated
        </h2>
        <div className="cobalt-rule" />
        <p className="mt-4 max-w-2xl text-[var(--muted)]">
          Free is account-free. Pro is one paid event or a monthly subscription. Professional is
          coming soon for agencies.
        </p>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <article className="tier-card bang-card">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Free</p>
            <h3 className="section-title mt-2 text-3xl">Start free</h3>
            <p className="mt-2 text-4xl font-bold tracking-tight">$0</p>
            <p className="mt-2 text-sm text-[var(--muted)]">No account · 24 hours</p>
            <ul className="mt-6 flex-1">
              <li>10 guests · 100 photos</li>
              <li>Cinematic QR invite</li>
              <li>Guests see their own photos</li>
            </ul>
            <Link href="/create?mode=free" className="btn btn-ghost mt-8 w-full">
              Start a free event
            </Link>
          </article>

          <article className="tier-card featured bang-card" style={{ transitionDelay: "100ms" }}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Pro</p>
            <h3 className="section-title mt-2 text-3xl">Pro</h3>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              $49 <span className="text-lg font-semibold text-[var(--muted)]">once</span>
            </p>
            <p className="text-sm text-[var(--muted)]">or $29 / month</p>
            <ul className="mt-6 flex-1">
              <li>150 guests · 2,000 media · 7 days</li>
              <li>Approval, custom invite, maps</li>
              <li>Highlights studio · filters · templates</li>
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

          <article className="tier-card bang-card" style={{ transitionDelay: "180ms" }}>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Professional
            </p>
            <h3 className="section-title mt-2 text-3xl">Agency</h3>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              $99<span className="text-lg text-[var(--muted)]">/mo</span>
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">Coming soon</p>
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
      </BangSection>

      <section className="border-t border-[var(--line)] bg-[var(--navy)] py-20 text-white overflow-hidden relative">
        <VisualMotifs variant="hero" />
        <div className="container relative z-[1] flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="section-title text-3xl sm:text-5xl">Ready for tonight?</h2>
            <p className="mt-3 max-w-xl text-white/65">
              Launch a free gallery in under a minute — or unlock Pro for the celebration that needs
              curation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/create?mode=free" className="btn btn-primary bang-cta">
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
    </>
  );
}
