"use client";

import { useState } from "react";

export function DemoLeadForm({
  planInterest = "enterprise",
  submitLabel = "Book a Demo",
}: {
  planInterest?: string;
  submitLabel?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          message,
          planInterest,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not submit");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="panel p-6">
        <h3 className="section-title text-2xl">Thanks — we’ll be in touch</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your demo request is in. We’ll email {email} shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4 p-6">
      <div>
        <h3 className="section-title text-2xl">Book a Demo</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tell us about your team — we’ll show white-label hubs and API access.
        </p>
      </div>
      <div className="field">
        <label htmlFor="demo-name">Name</label>
        <input
          id="demo-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
        />
      </div>
      <div className="field">
        <label htmlFor="demo-email">Work email</label>
        <input
          id="demo-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
        />
      </div>
      <div className="field">
        <label htmlFor="demo-company">Company</label>
        <input
          id="demo-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={160}
        />
      </div>
      <div className="field">
        <label htmlFor="demo-message">What are you hosting?</label>
        <textarea
          id="demo-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
        />
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
