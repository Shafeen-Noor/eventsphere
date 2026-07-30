import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { VerifyOtpForm } from "@/components/VerifyOtpForm";
import { getCurrentUser, isAccountUser, isEmailVerified } from "@/lib/auth";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const dest = next?.startsWith("/") ? next : "/";
  const user = await getCurrentUser();

  if (!user || !isAccountUser(user)) {
    redirect(`/signup?next=${encodeURIComponent(dest)}`);
  }
  if (isEmailVerified(user)) {
    redirect(dest);
  }

  return (
    <main>
      <SiteHeader right={<Link href="/">Home</Link>} />
      <div className="container flex justify-center pb-20 pt-6">
        <Suspense fallback={<div className="panel p-8">Loading…</div>}>
          <VerifyOtpForm />
        </Suspense>
      </div>
    </main>
  );
}
