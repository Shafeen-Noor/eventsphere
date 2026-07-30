export function getAppUrl(req?: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv && !fromEnv.includes("localhost")) return fromEnv;

  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/$/, "");
  }

  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (host && !host.includes("localhost")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  if (fromEnv) return fromEnv;
  return "http://localhost:3000";
}
