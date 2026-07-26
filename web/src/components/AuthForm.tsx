"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
              ? { displayName, email, password }
              : { email, password },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not continue");
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 max-w-md w-full fade-up">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--navy)]">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          {mode === "signup"
            ? "Hosts sign up so your events stay with you across phones and browsers. Guests can still join with just a name."
            : "Sign in to see and manage only your events."}
        </p>
      </div>

      {mode === "signup" ? (
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={40}
            placeholder="Alex"
            autoComplete="name"
          />
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="email">Email</label>
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

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading
          ? mode === "signup"
            ? "Creating…"
            : "Signing in…"
          : mode === "signup"
            ? "Create account"
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
