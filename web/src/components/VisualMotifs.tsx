"use client";

/** Decorative motif field — Neon Reception + Polaroid + Editorial Lens */
export function VisualMotifs({
  variant = "hero",
}: {
  variant?: "hero" | "section" | "invite";
}) {
  return (
    <div className={`motif-field motif-${variant}`} aria-hidden>
      <span className="motif motif-popper" style={{ left: "6%", top: "18%" }}>
        🎊
      </span>
      <span className="motif motif-popper" style={{ right: "10%", top: "12%", animationDelay: "0.6s" }}>
        🎉
      </span>
      <span className="motif motif-camera" style={{ left: "14%", bottom: "22%", animationDelay: "1.1s" }}>
        📷
      </span>
      <span className="motif motif-camera" style={{ right: "16%", bottom: "28%", animationDelay: "1.8s" }}>
        📸
      </span>
      <span className="motif motif-polaroid" style={{ left: "22%", top: "42%", animationDelay: "0.3s" }}>
        ▢
      </span>
      <span className="motif motif-polaroid motif-polaroid-tilt" style={{ right: "24%", top: "38%", animationDelay: "1.4s" }}>
        ▢
      </span>
      <span className="motif motif-aperture" style={{ left: "48%", top: "14%" }} />
      <span className="motif motif-spark" style={{ left: "72%", top: "55%", animationDelay: "0.9s" }}>
        ✦
      </span>
      <span className="motif motif-spark" style={{ left: "8%", top: "60%", animationDelay: "1.5s" }}>
        ✦
      </span>
      <div className="motif-reel">
        <div className="motif-reel-track">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="motif-reel-frame" />
          ))}
        </div>
      </div>
      <div className="motif-sprocket motif-sprocket-l" />
      <div className="motif-sprocket motif-sprocket-r" />
    </div>
  );
}
