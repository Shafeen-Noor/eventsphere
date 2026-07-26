"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinForm({
  slug,
  requiresPasscode,
}: {
  slug: string;
  requiresPasscode: boolean;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, passcode: passcode || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not join");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel p-6 sm:p-8 space-y-5 max-w-md w-full fade-up">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl">Join this event</h2>
        <p className="mt-2 text-[var(--muted)]">
          Enter your name to upload and browse the shared gallery.
        </p>
      </div>
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={40}
          placeholder="Riley"
        />
      </div>
      {requiresPasscode ? (
        <div className="field">
          <label htmlFor="pass">Passcode</label>
          <input
            id="pass"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
            maxLength={12}
          />
        </div>
      ) : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Joining…" : "Join event"}
      </button>
    </form>
  );
}
