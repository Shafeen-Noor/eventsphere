import Link from "next/link";
import { CreateEventForm } from "@/components/CreateEventForm";
import { SiteHeader } from "@/components/SiteHeader";
import { UpgradeProButton } from "@/components/UpgradeProButton";
import { getCurrentUser, isAccountUser, publicUserDto } from "@/lib/auth";
import { normalizePlanId } from "@/lib/plans";

type Props = { searchParams: Promise<{ mode?: string }> };

export default async function CreatePage({ searchParams }: Props) {
  const { mode: rawMode } = await searchParams;
  const user = await getCurrentUser();
  const mode = rawMode === "enterprise" ? "enterprise" : "free";

  // Enterprise activation path — subscribe then return here
  if (mode === "enterprise") {
    const hasAccount = Boolean(user && isAccountUser(user));
    const plan = user ? normalizePlanId(user.plan) : "free";
    return (
      <main className="es-site">
        <SiteHeader
          right={
            <Link href="/" className="text-sm font-semibold text-[var(--muted)]">
              Home
            </Link>
          }
        />
        <div className="container max-w-xl space-y-6 pb-20 pt-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Enterprise
            </p>
            <h1 className="section-title mt-2 text-4xl">Activate Enterprise</h1>
            <p className="mt-3 text-[var(--muted)]">
              White-label hubs, API access, and unlimited guests for teams who host every week.
            </p>
          </div>
          {plan === "enterprise" ? (
            <div className="panel space-y-3 p-6">
              <p className="font-semibold">Enterprise is active on your account.</p>
              <Link href="/create" className="btn btn-primary">
                Create an event
              </Link>
            </div>
          ) : hasAccount && user ? (
            <UpgradeProButton plan="enterprise" />
          ) : (
            <div className="panel space-y-3 p-6">
              <p className="text-sm text-[var(--muted)]">
                Sign in or create an account, then activate Enterprise.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/signup?next=${encodeURIComponent("/create?mode=enterprise")}`}
                  className="btn btn-primary"
                >
                  Create account
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent("/create?mode=enterprise")}`}
                  className="btn btn-ghost"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}
          <p className="text-sm text-[var(--muted)]">
            Prefer a walkthrough?{" "}
            <Link href="/enterprise" className="font-semibold text-[var(--accent)]">
              Book a demo →
            </Link>
          </p>
        </div>
      </main>
    );
  }

  // Free create is always open — no signup
  return (
    <main className="es-site">
      <SiteHeader
        right={
          <Link href="/" className="text-sm font-semibold text-[var(--muted)]">
            Home
          </Link>
        }
      />
      <div className="container pb-20 pt-4">
        <CreateEventForm
          host={
            user
              ? publicUserDto(user)
              : {
                  displayName: "",
                  email: null,
                  hasAccount: false,
                  organizationName: null,
                  plan: "free",
                }
          }
          mode="free"
        />
      </div>
    </main>
  );
}
