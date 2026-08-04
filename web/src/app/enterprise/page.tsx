import Link from "next/link";
import { DemoLeadForm } from "@/components/DemoLeadForm";
import { SiteHeader } from "@/components/SiteHeader";
import { PLANS } from "@/lib/plans";

const FEATURES = [
  {
    t: "White-label hubs",
    d: "Remove EventSphere branding and present galleries under your brand.",
  },
  {
    t: "API access",
    d: "Provision events, pull media, and sync guest activity into your stack.",
  },
  {
    t: "Unlimited scale",
    d: "Unlimited guests and media with long retention for recurring programs.",
  },
  {
    t: "Premium toolkit",
    d: "AI recap, faces, moderation, analytics, multi-host, and password gates included.",
  },
];

export default function EnterprisePage() {
  const plan = PLANS.enterprise;
  return (
    <main className="es-site">
      <SiteHeader
        right={
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm font-semibold text-[var(--muted)]">
              Pricing
            </Link>
            <Link href="/create?mode=enterprise" className="btn btn-primary">
              Activate
            </Link>
          </div>
        }
      />

      <section className="hero-block">
        <div className="container grid gap-10 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-start lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Enterprise · {plan.priceLabel}
            </p>
            <h1 className="section-title mt-4 max-w-2xl text-5xl sm:text-6xl">
              EventSphere for venues, agencies, and platforms
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
              {plan.blurb}. Book a demo and we’ll map hubs, branding, and API workflows to your
              team.
            </p>
            <div className="feature-showcase mt-10">
              {FEATURES.map((f) => (
                <article key={f.t}>
                  <h3 className="section-title text-2xl">{f.t}</h3>
                  <p className="mt-2 text-[var(--muted)] leading-relaxed">{f.d}</p>
                </article>
              ))}
            </div>
          </div>
          <DemoLeadForm planInterest="enterprise" submitLabel="Book a Demo" />
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--bg-elevated)] py-8">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>© {new Date().getFullYear()} EventSphere</p>
          <Link href="/create">Start a free event</Link>
        </div>
      </footer>
    </main>
  );
}
