"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PLANS } from "@/lib/plans";

function useInView<T extends HTMLElement>(threshold = 0.12) {
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

export function MarketingHome({
  header,
  continueSlug,
}: {
  header?: React.ReactNode;
  continueSlug?: string | null;
}) {
  return (
    <div className="es-site champagne-paper">
      <div className="hero-block hero-bang es-brand-hero">
        {header}
        <div className="container relative z-[1] pb-16 pt-6 text-center lg:pb-24 lg:pt-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
            Shared event memory
          </p>
          <h1 className="es-brand-hero-title section-title mt-4 text-5xl text-[var(--fg)] sm:text-6xl lg:text-7xl">
            EventSphere
          </h1>
          <p className="mt-5 text-xl font-medium text-[var(--fg)] sm:text-2xl">
            One QR Code. Every Memory.
          </p>
          <p className="mx-auto mt-4 max-w-md text-[var(--muted)] leading-relaxed">
            Guests scan once, then upload, react, and revisit the night — all in one private hub.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/create" className="btn btn-primary">
              Create Your Event
            </Link>
            <Link href="/e/demo" className="btn btn-ghost">
              See Demo
            </Link>
            {continueSlug ? (
              <Link href={`/e/${continueSlug}`} className="btn btn-ghost">
                Continue event
              </Link>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Free events need no account.
          </p>
        </div>
      </div>

      <Reveal className="container py-14">
        <div className="grid gap-6 text-center sm:grid-cols-3">
          {[
            { n: "1 QR", d: "Share a single link or print code" },
            { n: "Live hub", d: "Gallery, feed, guestbook, and more" },
            { n: "Host tools", d: "Upgrade when the night needs more" },
          ].map((item) => (
            <div key={item.n}>
              <p className="section-title text-3xl">{item.n}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.d}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal id="how" className="container py-16">
        <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          How it works
        </p>
        <h2 className="section-title mx-auto mt-3 max-w-xl text-center text-4xl">
          Three steps to the shared album
        </h2>
        <ol className="how-steps mt-12">
          {[
            {
              t: "Create",
              d: "Pick an event type, name the night, and set the time — no signup for Free.",
            },
            {
              t: "Share",
              d: "Print the QR or copy the link. Guests join by name in seconds.",
            },
            {
              t: "Collect",
              d: "Photos, guestbook notes, polls, and the live feed land in one hub.",
            },
          ].map((step, i) => (
            <li key={step.t} style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="how-step-num">{i + 1}</span>
              <h3 className="section-title text-2xl">{step.t}</h3>
              <p className="mt-2 text-[var(--muted)] leading-relaxed">{step.d}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal className="border-y border-[var(--line)] bg-[var(--bg-elevated)] py-16">
        <div className="container">
          <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            Features
          </p>
          <h2 className="section-title mx-auto mt-3 max-w-xl text-center text-4xl">
            Built for the whole night
          </h2>
          <div className="feature-showcase mt-12">
            {[
              {
                t: "Live feed & guestbook",
                d: "Reactions, notes, and signatures as the room fills up.",
              },
              {
                t: "Slideshow & recap",
                d: "Run the TV wall, then keep an AI-assisted story after.",
              },
              {
                t: "Challenges & polls",
                d: "Prompt guests to capture moments you actually want.",
              },
              {
                t: "Host dashboard",
                d: "Limits, moderation, analytics, and one-tap upgrades.",
              },
            ].map((f) => (
              <article key={f.t}>
                <h3 className="section-title text-2xl">{f.t}</h3>
                <p className="mt-2 text-[var(--muted)] leading-relaxed">{f.d}</p>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal id="pricing" className="container py-16">
        <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          Soft pricing
        </p>
        <h2 className="section-title mx-auto mt-3 max-w-xl text-center text-4xl">
          Start free. Grow if you need to.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {(["free", "essential", "premium"] as const).map((id) => {
            const plan = PLANS[id];
            return (
              <article
                key={id}
                className={`tier-card bang-card ${id === "essential" ? "featured" : ""}`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {plan.label}
                </p>
                <h3 className="section-title mt-2 text-3xl">{plan.priceLabel}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{plan.blurb}</p>
                <Link
                  href={id === "free" ? "/create" : "/pricing"}
                  className={`btn mt-8 w-full ${id === "essential" ? "btn-primary" : "btn-ghost"}`}
                >
                  {id === "free" ? "Create free event" : "Compare plans"}
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link href="/pricing" className="font-semibold text-[var(--accent)]">
            Full comparison →
          </Link>
          {" · "}
          <Link href="/enterprise" className="font-semibold text-[var(--accent)]">
            Enterprise
          </Link>
        </p>
      </Reveal>

      <section className="container py-16">
        <div className="cp-cta-band bang-fade">
          <div>
            <h2 className="section-title text-3xl sm:text-4xl">Ready for tonight?</h2>
            <p className="mt-3 max-w-xl text-[var(--muted)]">
              Launch a free gallery in under a minute — upgrade the event when you need more room.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/create" className="btn btn-primary">
              Create Your Event
            </Link>
            <Link href="/e/demo" className="btn btn-ghost">
              See Demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--bg-elevated)] py-8">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>© {new Date().getFullYear()} EventSphere</p>
          <div className="flex gap-4">
            <Link href="/pricing">Pricing</Link>
            <Link href="/enterprise">Enterprise</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
