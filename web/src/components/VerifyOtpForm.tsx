"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function VerifyOtpForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  const seededCode = search.get("code") || "";

  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState(seededCode);
  const [demoCode, setDemoCode] = useState<string | null>(seededCode || null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/verify-otp");
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        router.push(`/signup?next=${encodeURIComponent(next)}`);
        return;
      }
      if (data.verified) {
        router.push(next.startsWith("/") ? next : "/");
        router.refresh();
        return;
      }
      setEmail(data.user?.email ?? null);
      if (data.demoCode) setDemoCode(data.demoCode);
      if (data.hint) setHint(data.hint);
    })();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not verify");
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-otp", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not resend");
      if (data.demoCode) {
        setDemoCode(data.demoCode);
        setCode(data.demoCode);
      }
      if (data.hint) setHint(data.hint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 max-w-md w-full fade-up">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
          Security
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-[var(--navy)]">
          Verify OTP
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          {email ? `We sent a code to ${email}` : "Enter the 4-digit code for your account."}
        </p>
      </div>

      {demoCode ? (
        <div className="rounded-xl border border-[var(--line)] bg-[rgba(105,142,162,0.12)] px-4 py-3 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--navy)]">Demo code</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[0.35em] text-[var(--navy)]">
            {demoCode}
          </p>
          <p className="mt-2 text-xs">{hint || "Use this code to continue."}</p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="otp">4-digit code</label>
        <input
          id="otp"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          required
          placeholder="4821"
          autoComplete="one-time-code"
          className="tracking-[0.35em] text-center text-xl"
        />
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <button type="submit" className="btn btn-primary w-full" disabled={loading || code.length !== 4}>
        {loading ? "Verifying…" : "Enter dashboard"}
      </button>

      <button
        type="button"
        className="btn btn-ghost w-full"
        onClick={resend}
        disabled={resending}
      >
        {resending ? "Sending…" : "Resend code"}
      </button>
    </form>
  );
}
