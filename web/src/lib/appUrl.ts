function normalizeUrl(value: string) {
  const withProto = value.startsWith("http") ? value : `https://${value}`;
  return withProto.replace(/\/$/, "");
}

/**
 * Public base URL for invite links / QR codes.
 * Prefer the production alias — never VERCEL_URL alone, because that is a
 * deployment-specific host and often hits Vercel Authentication for guests.
 */
export function getAppUrl(req?: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv && !fromEnv.includes("localhost")) return normalizeUrl(fromEnv);

  // Stable production domain (e.g. eventsphere-orcin.vercel.app)
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/\/$/, "");
  if (production) return normalizeUrl(production);

  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host && !host.includes("localhost")) {
      // Prefer alias host over raw deployment URL when both exist
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // Last resort: deployment URL (may be SSO-protected — set NEXT_PUBLIC_APP_URL)
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return normalizeUrl(vercel);

  if (fromEnv) return normalizeUrl(fromEnv);
  return "http://localhost:3000";
}
