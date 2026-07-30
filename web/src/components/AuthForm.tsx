"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PlanPicker } from "@/components/PlanPicker";
import { HOST_TYPES, type HostType, type PlanId } from "@/lib/plans";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const instantPath = next.includes("mode=instant");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [hostType, setHostType] = useState<HostType>("individual");
  const [plan, setPlan] = useState<PlanId>("free");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                  plan: instantPath ? "free" : plan,
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
        router.push(`/verify?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}`);
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

  return (
    <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 max-w-lg w-full fade-up">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--navy)]">
          {mode === "signup"
            ? instantPath
              ? "Quick account for your event"
              : "Who’s hosting?"
            : "Welcome back"}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          {mode === "signup"
            ? instantPath
              ? "Create a host account, then pick a one-time event plan on the next screen."
              : "Password + org details, then pick Free or Pro. Professional is coming soon."
            : "Sign in to see and manage only your events."}
        </p>
      </div>

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
            <label htmlFor="org">Organization</label>
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

          {!instantPath ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                Subscription plan
              </p>
              <PlanPicker mode="subscription" value={plan} onChange={setPlan} />
            </div>
          ) : null}
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
            New here?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="text-[var(--navy)] underline"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
