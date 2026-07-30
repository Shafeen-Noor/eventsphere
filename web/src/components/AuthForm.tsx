"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { HOST_TYPES, type HostType } from "@/lib/plans";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const path = search.get("path");
  const nextParam = search.get("next");

  const isOnetime =
    path === "onetime" ||
    Boolean(nextParam?.includes("mode=onetime")) ||
    Boolean(nextParam?.includes("mode=instant"));
  const isSubscribe =
    path === "subscribe" || Boolean(nextParam?.includes("mode=subscription"));

  const defaultNext = isOnetime
    ? "/create?mode=onetime"
    : isSubscribe
      ? "/create?mode=subscription"
      : "/";
  const next = nextParam || defaultNext;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [hostType, setHostType] = useState<HostType>("individual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accounts exist for Pro paths only — Free never requires signup.
  const accountPlan = isSubscribe ? "pro" : "free";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        mode === "signup" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "signup"
              ? {
                  displayName,
                  email,
                  password,
                  organizationName: organizationName.trim() || null,
                  hostType,
                  plan: accountPlan,
                }
              : { email, password },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not continue");

      if (mode === "signup" && data.needsVerification) {
        const params = new URLSearchParams();
        params.set("next", next.startsWith("/") ? next : "/");
        if (data.demoCode) params.set("code", data.demoCode);
        router.push(`/verify?${params.toString()}`);
        router.refresh();
        return;
      }

      if (mode === "login" && data.user && !data.user.emailVerified) {
        router.push(
          `/verify?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}`,
        );
        router.refresh();
        return;
      }

      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const title =
    mode === "signup"
      ? isOnetime
        ? "Account for one Pro event"
        : isSubscribe
          ? "Subscribe to Pro"
          : "Create your host account"
      : "Welcome back";

  const subtitle =
    mode === "signup"
      ? isOnetime
        ? "Verify once, then create a single Pro event from $9 (sized to your guest list). Free events never need an account."
        : isSubscribe
          ? "Monthly Pro for hosts who run more than one event. Free galleries stay account-free."
          : "Accounts unlock Pro. Free events start without signup."
      : "Sign in to manage your Pro events.";

  return (
    <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 max-w-lg w-full fade-up">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--navy)]">
          {title}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{subtitle}</p>
      </div>

      {mode === "signup" && (isOnetime || isSubscribe) ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--muted)]">
          {isOnetime ? (
            <>
              <p className="font-semibold text-[var(--navy)]">One Pro event — from $9</p>
              <p className="mt-1">Pick guests + storage at checkout. Payment simulated until Stripe.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-[var(--navy)]">Pro subscription — $29/mo</p>
              <p className="mt-1">Create multiple Pro events each month after verify.</p>
            </>
          )}
        </div>
      ) : null}

      {mode === "signup" ? (
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={40}
            placeholder="Alex Rivera"
            autoComplete="name"
          />
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="email">{mode === "signup" ? "Work email" : "Email"}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={120}
          placeholder="you@email.com"
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "signup" ? 8 : 1}
          maxLength={72}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>

      {mode === "signup" ? (
        <>
          <div className="field">
            <label htmlFor="org">Organization (optional)</label>
            <input
              id="org"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              maxLength={80}
              placeholder="North Studio"
              autoComplete="organization"
            />
          </div>

          <div className="field">
            <label htmlFor="hostType">Who are you?</label>
            <select
              id="hostType"
              value={hostType}
              onChange={(e) => setHostType(e.target.value as HostType)}
            >
              {HOST_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading
          ? mode === "signup"
            ? "Creating…"
            : "Signing in…"
          : mode === "signup"
            ? "Continue to verify"
            : "Sign in"}
      </button>

      {mode === "signup" ? (
        <p className="text-center text-sm text-[var(--muted)]">
          Just need a small gallery?{" "}
          <Link href="/create?mode=free" className="text-[var(--navy)] underline">
            Start free — no account
          </Link>
        </p>
      ) : null}

      <p className="text-sm text-[var(--muted)] text-center">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="text-[var(--navy)] underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need Pro?{" "}
            <Link
              href={`/signup?path=subscribe&next=${encodeURIComponent(next)}`}
              className="text-[var(--navy)] underline"
            >
              Subscribe
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
