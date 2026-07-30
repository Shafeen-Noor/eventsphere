import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/CreateEventForm";
import { SiteHeader } from "@/components/SiteHeader";
import {
  getCurrentUser,
  isAccountUser,
  isEmailVerified,
  publicUserDto,
} from "@/lib/auth";

type Props = { searchParams: Promise<{ mode?: string }> };

export default async function CreatePage({ searchParams }: Props) {
  const { mode: rawMode } = await searchParams;
  const mode =
    rawMode === "free"
      ? "free"
      : rawMode === "onetime" || rawMode === "instant"
        ? "onetime"
        : "subscription";

  const user = await getCurrentUser();
  const hasAccount = Boolean(user && isAccountUser(user));

  // Free: no account required
  if (mode === "free") {
    return (
      <main>
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
                    id: "",
                    displayName: "",
                    email: null,
                    hasAccount: false,
                    organizationName: null,
                    hostType: null,
                    plan: "free",
                    emailVerified: false,
                  }
            }
            mode="free"
          />
        </div>
      </main>
    );
  }

  // Pro paths require verified account
  const next = `/create?mode=${mode}`;
  if (!hasAccount || !user) {
    const path = mode === "onetime" ? "onetime" : "subscribe";
    redirect(`/signup?path=${path}&next=${encodeURIComponent(next)}`);
  }
  if (!isEmailVerified(user)) {
    redirect(`/verify?next=${encodeURIComponent(next)}`);
  }

  // Subscription create requires Pro plan
  if (mode === "subscription" && user.plan !== "pro") {
    redirect("/signup?path=subscribe&next=/create?mode=subscription");
  }

  return (
    <main>
      <SiteHeader
        right={
          <Link href="/" className="text-sm font-semibold text-[var(--muted)]">
            Home
          </Link>
        }
      />
      <div className="container pb-20 pt-4">
        <CreateEventForm host={publicUserDto(user)} mode={mode} />
      </div>
    </main>
  );
}
