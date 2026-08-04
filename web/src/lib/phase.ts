export type EventPhase = "countdown" | "live" | "archive";

type PhaseEvent = {
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  expiresAt?: Date | string | null;
  state?: string | null;
};

function toMs(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const ms = (value instanceof Date ? value : new Date(value)).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * countdown — before startAt (when set)
 * live — started and not yet ended/expired
 * archive — ended, expired, or explicitly archived
 */
export function getEventPhase(event: PhaseEvent, now = Date.now()): EventPhase {
  const state = (event.state || "").toLowerCase();
  if (
    state === "ended" ||
    state === "expired" ||
    state === "archived" ||
    state === "archive"
  ) {
    return "archive";
  }

  const expiresAt = toMs(event.expiresAt);
  if (expiresAt != null && expiresAt <= now) return "archive";

  const endAt = toMs(event.endAt);
  if (endAt != null && endAt <= now) return "archive";

  const startAt = toMs(event.startAt);
  if (startAt != null && startAt > now) return "countdown";

  return "live";
}

export function phaseLabel(phase: EventPhase): string {
  switch (phase) {
    case "countdown":
      return "Countdown";
    case "live":
      return "Live";
    case "archive":
      return "Archive";
    default:
      return "Live";
  }
}
