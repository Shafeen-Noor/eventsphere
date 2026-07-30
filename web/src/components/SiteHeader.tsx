import Link from "next/link";

export function SiteHeader({
  right,
  variant = "default",
}: {
  right?: React.ReactNode;
  variant?: "default" | "hero";
}) {
  const onHero = variant === "hero";
  return (
    <header
      className={
        onHero
          ? "container flex flex-wrap items-center justify-between gap-4 py-5"
          : "site-nav"
      }
    >
      <div
        className={
          onHero
            ? "flex w-full flex-wrap items-center justify-between gap-4"
            : "container flex flex-wrap items-center justify-between gap-4 py-4"
        }
      >
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl tracking-tight"
            style={{ color: onHero ? "#f8fafc" : "var(--navy)" }}
          >
            EventSphere
          </Link>
          <nav
            className="hidden items-center gap-5 text-sm font-semibold md:flex"
            style={{ color: onHero ? "rgba(248,250,252,0.78)" : "var(--muted)" }}
          >
            <a href="/#how-it-works" className="hover:opacity-100 opacity-90">
              How it works
            </a>
            <Link href="/pricing" className="hover:opacity-100 opacity-90">
              Pricing
            </Link>
            <Link href="/professional" className="hover:opacity-100 opacity-90">
              Professional
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">{right}</div>
      </div>
    </header>
  );
}
