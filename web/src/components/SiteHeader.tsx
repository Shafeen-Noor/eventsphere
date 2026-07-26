import Link from "next/link";

export function SiteHeader({
  right,
}: {
  right?: React.ReactNode;
}) {
  return (
    <header className="container flex items-center justify-between py-6">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--navy)]"
      >
        EventSphere
      </Link>
      <div className="flex items-center gap-3 text-sm text-[var(--muted)]">{right}</div>
    </header>
  );
}
