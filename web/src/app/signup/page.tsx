import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser, isAccountUser } from "@/lib/auth";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user && isAccountUser(user)) {
    redirect(next?.startsWith("/") ? next : "/");
  }

  return (
    <main>
      <SiteHeader right={<Link href="/">Home</Link>} />
      <div className="container flex justify-center pb-20 pt-6">
        <Suspense fallback={<div className="panel p-8">Loading…</div>}>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </main>
  );
}
