import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Event not found</h1>
      <p className="mt-3 text-[var(--muted)]">That link may be wrong or the gallery was removed.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back home
      </Link>
    </main>
  );
}
