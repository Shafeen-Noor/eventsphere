"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthControls({
  user,
}: {
  user: {
    displayName: string;
    email: string | null;
    hasAccount: boolean;
  } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setBusy(false);
    router.refresh();
    router.push("/");
  }

  if (user?.hasAccount) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline truncate max-w-[140px]">
          Hi, {user.displayName}
        </span>
        <button
          type="button"
          className="hover:text-[var(--fg)] disabled:opacity-50"
          disabled={busy}
          onClick={() => void signOut()}
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline truncate max-w-[120px]">{user.displayName}</span>
        <Link href="/signup?next=/" className="btn btn-primary px-3 py-1.5 text-sm">
          Save account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login" className="hover:text-[var(--fg)]">
        Sign in
      </Link>
      <Link href="/signup" className="btn btn-primary px-3 py-1.5 text-sm">
        Create account
      </Link>
    </div>
  );
}
