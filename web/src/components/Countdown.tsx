"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number) {
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h >= 48) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h left`;
  }
  return `${h}h ${m}m ${s}s left`;
}

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const tick = () => {
      setLabel(formatRemaining(new Date(expiresAt).getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expired = label === "Expired";

  return (
    <span
      className="inline-flex rounded-full px-3 py-1 text-sm"
      style={{
        background: expired ? "rgba(196,92,74,0.15)" : "rgba(105,142,162,0.18)",
        color: expired ? "var(--danger)" : "var(--navy)",
      }}
    >
      {label || "…"}
    </span>
  );
}
