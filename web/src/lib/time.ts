/** Browser / device IANA timezone, e.g. "Europe/Madrid" */
export function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Popular zones for the picker (device zone is prepended at runtime). */
export const COMMON_TIME_ZONES = [
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "UTC",
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Offset of `timeZone` at instant `date`: zonedWall = utc + offset */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const hour = Number(parts.hour) % 24;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/**
 * Interpret `YYYY-MM-DDTHH:mm` as wall-clock time in `timeZone`,
 * return the absolute UTC Date (for DB storage).
 */
export function zonedLocalToUtc(localDatetime: string, timeZone: string): Date {
  const [datePart, timePart = "00:00"] = localDatetime.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  if (!y || !mo || !d) return new Date(NaN);

  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, 0);
  let offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let utc = Date.UTC(y, mo - 1, d, h, mi, 0) - offset;
  offset = getTimeZoneOffsetMs(new Date(utc), timeZone);
  utc = Date.UTC(y, mo - 1, d, h, mi, 0) - offset;
  return new Date(utc);
}

/** Format a UTC instant as `YYYY-MM-DDTHH:mm` in `timeZone` (for datetime-local). */
export function utcToZonedLocalInput(isoOrDate: string | Date | null, timeZone: string) {
  if (!isoOrDate) return "";
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return "";

  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const hour = pad(Number(parts.hour) % 24);
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

/** Guest-facing label in the viewer's local timezone. */
export function formatEventWhen(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const when = date.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;

  return tz ? `${when} (${tz})` : when;
}

export function formatInTimeZone(isoOrDate: string | Date, timeZone: string) {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function timeZoneOptions(preferred?: string) {
  const device = preferred || getDeviceTimeZone();
  return Array.from(new Set<string>([device, ...COMMON_TIME_ZONES]));
}
