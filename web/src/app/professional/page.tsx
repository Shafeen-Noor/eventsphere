import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function ProfessionalPage() {
  return (
    <main>
      <SiteHeader
        right={
          <div className="flex items-center gap-3">
            <Link href="/#pricing" className="text-sm font-semibold text-[var(--muted)]">
              Pricing
            </Link>
            <Link
              href="/signup?path=subscribe&next=/create?mode=subscription"
              className="btn btn-primary"
            >
              Start with Pro
            </Link>
          </div>
        }
      />

      <section className="hero-block">
        <div className="container py-20 lg:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/90">
            Professional · Coming soon
          </p>
          <h1 className="section-title mt-4 max-w-3xl text-5xl text-white sm:text-6xl">
            EventSphere for agencies, venues, and multi-client hosts
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            White-label galleries, client workspaces, and operational tooling for teams who run
            events every week — not just one celebration.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup?path=subscribe&next=/create?mode=subscription"
              className="btn btn-primary"
            >
              Use Pro today
            </Link>
            <Link href="/pricing" className="btn btn-ghost border-white/20 bg-white/10 text-white">
              Compare tiers
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="section-title text-3xl sm:text-4xl">What’s landing in Professional</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ["White-label", "Your logo, colors, and domain on client-facing galleries."],
            ["Multi-client dashboard", "Separate workspaces for planners, venues, and brands."],
            ["Higher caps", "Guest and media limits built for conferences and festivals."],
            ["Moderation tools", "Approval queues, co-hosts, and review workflows at scale."],
            ["Analytics", "Uploads, RSVPs, open rates, and publish engagement."],
            ["Priority support", "SLAs and onboarding for production teams."],
          ].map(([title, body]) => (
            <div key={title} className="panel p-6">
              <h3 className="section-title text-2xl">{title}</h3>
              <p className="mt-3 text-[var(--muted)] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-white py-14">
        <div className="container max-w-3xl text-center">
          <h2 className="section-title text-3xl">Need this now?</h2>
          <p className="mt-4 text-[var(--muted)]">
            Pro subscription already covers multi-event months with approval, custom invites, and
            curation. Professional adds agency packaging on top.
          </p>
          <Link
            href="/signup?path=subscribe&next=/create?mode=subscription"
            className="btn btn-primary mt-8"
          >
            Subscribe to Pro — $29/mo
          </Link>
        </div>
      </section>
    </main>
  );
}
