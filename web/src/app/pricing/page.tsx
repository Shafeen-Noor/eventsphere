import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const ROWS: { feature: string; free: string; pro: string; professional: string }[] = [
  { feature: "Account required", free: "Never", pro: "Yes", professional: "Yes" },
  { feature: "Guests", free: "10", pro: "150", professional: "1,000+" },
  { feature: "Photos / media", free: "100", pro: "2,000", professional: "20,000" },
  { feature: "Event life", free: "24 hours", pro: "Up to 7 days", professional: "Up to 30 days" },
  { feature: "Upload window", free: "Same as event", pro: "Separate control", professional: "Separate control" },
  { feature: "QR + link invite", free: "Yes", pro: "Yes", professional: "Yes" },
  { feature: "Guest sees", free: "Own photos", pro: "Configurable", professional: "Configurable" },
  { feature: "Photo approval", free: "—", pro: "Yes", professional: "Yes + co-hosts" },
  { feature: "Custom invite card", free: "—", pro: "Yes", professional: "White-label" },
  { feature: "Maps link", free: "—", pro: "Yes", professional: "Yes" },
  { feature: "RSVP + plus-ones", free: "—", pro: "Yes", professional: "Yes" },
  { feature: "Highlights publish", free: "—", pro: "Yes", professional: "Yes" },
  { feature: "Videos", free: "—", pro: "Yes", professional: "Yes" },
  { feature: "Contact on join", free: "—", pro: "Email / WhatsApp", professional: "CRM export" },
  { feature: "Branding", free: "EventSphere mark", pro: "Clean", professional: "Your brand" },
  { feature: "Multi-client workspaces", free: "—", pro: "—", professional: "Coming soon" },
  { feature: "Analytics & SLA", free: "—", pro: "—", professional: "Coming soon" },
];

export default function PricingPage() {
  return (
    <main>
      <SiteHeader
        right={
          <div className="flex items-center gap-3">
            <Link href="/create?mode=free" className="text-sm font-semibold text-[var(--muted)]">
              Start free
            </Link>
            <Link
              href="/signup?path=subscribe&next=/create?mode=subscription"
              className="btn btn-primary"
            >
              Subscribe
            </Link>
          </div>
        }
      />

      <section className="container py-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Pricing
        </p>
        <h1 className="section-title mt-3 max-w-3xl text-4xl sm:text-5xl">
          Features by tier — clear, separated, no surprises
        </h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)] leading-relaxed">
          Free never asks for an account. Pro is either one paid event or a monthly subscription.
          Professional is coming soon for agencies and venues.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <article className="tier-card">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Free
            </p>
            <h2 className="section-title mt-2 text-3xl">No account</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight">$0</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              One small gallery for tonight. Guests join by name.
            </p>
            <ul className="mt-6 flex-1">
              <li>10 guests · 100 photos · 24h</li>
              <li>QR + link invite</li>
              <li>Per-guest photo caps</li>
              <li>Guests see their own uploads</li>
            </ul>
            <Link href="/create?mode=free" className="btn btn-ghost mt-8 w-full">
              Start free event
            </Link>
          </article>

          <article className="tier-card featured">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Pro
            </p>
            <h2 className="section-title mt-2 text-3xl">Full host controls</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              $49 <span className="text-lg font-semibold text-[var(--muted)]">once</span>
            </p>
            <p className="text-sm text-[var(--muted)]">or $29 / month · account required</p>
            <ul className="mt-6 flex-1">
              <li>150 guests · 2,000 media · 7 days</li>
              <li>Approval, visibility, custom invite</li>
              <li>RSVP, maps, highlights, videos</li>
              <li>Email / WhatsApp contacts on join</li>
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

          <article className="tier-card">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Professional
            </p>
            <h2 className="section-title mt-2 text-3xl">Agency</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight">
              $99<span className="text-lg text-[var(--muted)]">/mo</span>
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">Coming soon</p>
            <ul className="mt-6 flex-1">
              <li>White-label galleries</li>
              <li>Multi-client dashboard</li>
              <li>Higher caps, moderation, analytics</li>
            </ul>
            <Link href="/professional" className="btn btn-ghost mt-8 w-full">
              Coming soon details
            </Link>
          </article>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-white py-16">
        <div className="container">
          <h2 className="section-title text-3xl sm:text-4xl">Full feature comparison</h2>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            Side-by-side so you can pick Free, one Pro event, Pro subscription, or wait for
            Professional.
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--line)]">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[var(--navy)] text-white">
                  <th className="px-4 py-3 font-semibold">Feature</th>
                  <th className="px-4 py-3 font-semibold">Free</th>
                  <th className="px-4 py-3 font-semibold">Pro</th>
                  <th className="px-4 py-3 font-semibold">Professional</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? "bg-white" : "bg-[var(--bg)]"}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--navy)]">{row.feature}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{row.free}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{row.pro}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{row.professional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="section-title text-3xl">Which path should I take?</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "Dinner with friends",
              d: "Start Free. No password. Share the QR at the table.",
              href: "/create?mode=free",
              cta: "Create free event",
            },
            {
              t: "One wedding or birthday",
              d: "Pay once for Pro controls — approval, custom card, longer window.",
              href: "/signup?path=onetime&next=/create?mode=onetime",
              cta: "One Pro event",
            },
            {
              t: "I host every month",
              d: "Subscribe. Create as many Pro events as you need this month.",
              href: "/signup?path=subscribe&next=/create?mode=subscription",
              cta: "Subscribe to Pro",
            },
          ].map((item) => (
            <div key={item.t} className="panel p-6">
              <h3 className="section-title text-2xl">{item.t}</h3>
              <p className="mt-3 text-[var(--muted)] leading-relaxed">{item.d}</p>
              <Link href={item.href} className="btn btn-ghost mt-6">
                {item.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-white py-8">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <p>© {new Date().getFullYear()} EventSphere</p>
          <Link href="/">Home</Link>
        </div>
      </footer>
    </main>
  );
}
