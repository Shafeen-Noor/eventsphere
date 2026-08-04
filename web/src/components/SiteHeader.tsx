import Link from "next/link";

export function SiteHeader({
  right,
  variant = "default",
  marketing = true,
}: {
  right?: React.ReactNode;
  variant?: "default" | "hero";
  marketing?: boolean;
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
            style={{ color: onHero ? "var(--fg)" : "var(--navy)" }}
          >
            EventSphere
          </Link>
          {marketing ? (
            <nav
              className="hidden items-center gap-5 text-sm font-semibold md:flex"
              style={{ color: onHero ? "var(--muted)" : "var(--muted)" }}
            >
              <a href="/#how-it-works" className="hover:opacity-100 opacity-90">
                How it works
              </a>
              <Link href="/pricing" className="hover:opacity-100 opacity-90">
                Pricing
              </Link>
              <Link href="/enterprise" className="hover:opacity-100 opacity-90">
                Enterprise
              </Link>
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm">{right}</div>
      </div>
    </header>
  );
}
