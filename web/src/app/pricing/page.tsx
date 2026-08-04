import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import {
  guestLimitLabel,
  mediaLimitLabel,
  PLANS,
  type PlanId,
} from "@/lib/plans";

const TIERS: PlanId[] = ["free", "essential", "premium"];

const ROWS: { feature: string; values: Record<"free" | "essential" | "premium", string> }[] = [
  {
    feature: "Account required",
    values: { free: "Never", essential: "For upgrades", premium: "For upgrades" },
  },
  {
    feature: "Guests",
    values: {
      free: guestLimitLabel(PLANS.free.maxGuests),
      essential: guestLimitLabel(PLANS.essential.maxGuests),
      premium: guestLimitLabel(PLANS.premium.maxGuests),
    },
  },
  {
    feature: "Media",
    values: {
      free: mediaLimitLabel(PLANS.free.maxMedia),
      essential: mediaLimitLabel(PLANS.essential.maxMedia),
      premium: mediaLimitLabel(PLANS.premium.maxMedia),
    },
  },
  {
    feature: "Retention",
    values: { free: "24 hours", essential: "7 days", premium: "30 days" },
  },
  {
    feature: "Guestbook + live feed",
    values: { free: "Yes", essential: "Yes", premium: "Yes" },
  },
  {
    feature: "Slideshow / zip download",
    values: { free: "—", essential: "Yes", premium: "Yes" },
  },
  {
    feature: "Challenges, polls, seating",
    values: { free: "—", essential: "Yes", premium: "Yes" },
  },
  {
    feature: "Voting, AI, faces",
    values: { free: "—", essential: "—", premium: "Yes" },
  },
  {
    feature: "Moderation + analytics",
    values: { free: "—", essential: "—", premium: "Yes" },
  },
  {
    feature: "EventSphere watermark",
    values: { free: "Yes", essential: "Yes", premium: "Removed" },
  },
];

export default function PricingPage() {
  return (
    <main className="es-site">
      <SiteHeader
        right={
          <div className="flex items-center gap-3">
            <Link href="/create" className="text-sm font-semibold text-[var(--muted)]">
              Start free
            </Link>
            <Link href="/enterprise" className="btn btn-primary">
              Enterprise
            </Link>
          </div>
        }
      />

      <section className="container py-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          Pricing
        </p>
        <h1 className="section-title mt-3 max-w-3xl text-4xl sm:text-5xl">
          Free, Essential, and Premium — clear tiers
        </h1>
        <p className="mt-4 max-w-2xl text-[var(--muted)] leading-relaxed">
          Create a free event with no account. Upgrade the event itself when you need more guests,
          slideshow, AI, or moderation.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {TIERS.map((id) => {
            const plan = PLANS[id];
            return (
              <article key={id} className={`tier-card ${id === "essential" ? "featured" : ""}`}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {plan.label}
                </p>
                <h2 className="section-title mt-2 text-3xl">{plan.priceLabel}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{plan.blurb}</p>
                <ul className="mt-6 flex-1">
                  <li>{guestLimitLabel(plan.maxGuests)}</li>
                  <li>{mediaLimitLabel(plan.maxMedia)}</li>
                  <li>
                    {plan.retentionHours >= 24
                      ? `${Math.round(plan.retentionHours / 24)} day retention`
                      : `${plan.retentionHours}h retention`}
                  </li>
                </ul>
                <Link
                  href={id === "free" ? "/create" : "/create"}
                  className={`btn mt-8 w-full ${id === "essential" ? "btn-primary" : "btn-ghost"}`}
                >
                  {id === "free" ? "Start free event" : "Create & upgrade later"}
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-white py-16">
        <div className="container">
          <h2 className="section-title text-3xl sm:text-4xl">Feature comparison</h2>
          <div className="upgrade-table mt-8 overflow-x-auto rounded-2xl border border-[var(--line)]">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Essential</th>
                  <th>Premium</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    <td>{row.values.free}</td>
                    <td>{row.values.essential}</td>
                    <td>{row.values.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-[var(--muted)]">
            Need white-label and API access?{" "}
            <Link href="/enterprise" className="font-semibold text-[var(--accent)]">
              See Enterprise →
            </Link>
          </p>
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
