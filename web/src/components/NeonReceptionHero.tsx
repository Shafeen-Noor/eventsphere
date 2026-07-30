"use client";

/** Pure Neon Reception hero stage — champagne burst, seals, poppers, reel, sparkles */
export function NeonReceptionHero() {
  return (
    <div className="neon-hero-stage" aria-hidden>
      <div className="neon-sparkle-field">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="neon-sparkle"
            style={{
              left: `${4 + ((i * 37) % 92)}%`,
              top: `${6 + ((i * 53) % 88)}%`,
              animationDelay: `${(i % 10) * 0.28}s`,
              ["--spark-hue" as string]: i % 3 === 0 ? "#e11d8a" : "#e8c96a",
            }}
          />
        ))}
      </div>

      <div className="neon-ribbon neon-ribbon-a" />
      <div className="neon-ribbon neon-ribbon-b" />

      <span className="neon-popper" style={{ left: "8%", top: "22%" }}>
        🎊
      </span>
      <span className="neon-popper" style={{ right: "18%", top: "8%", animationDelay: "0.7s" }}>
        🎉
      </span>
      <span className="neon-popper" style={{ left: "42%", bottom: "38%", animationDelay: "1.4s" }}>
        ✨
      </span>

      <div className="neon-champagne">
        <div className="neon-champagne-burst" />
        <div className="neon-champagne-bottle">
          <svg viewBox="0 0 64 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M28 8c0-3 2-6 4-6s4 3 4 6v18c8 6 12 16 12 28v78c0 10-6 18-16 18h-4c-10 0-16-8-16-18V54c0-12 4-22 12-28V8z"
              fill="url(#goldBottle)"
              opacity="0.95"
            />
            <rect x="26" y="0" width="12" height="10" rx="2" fill="#e8c96a" />
            <path d="M24 54h16v8H24z" fill="#c9a227" opacity="0.85" />
            <defs>
              <linearGradient id="goldBottle" x1="20" y1="0" x2="48" y2="160" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f5e6a8" />
                <stop offset="0.45" stopColor="#c9a227" />
                <stop offset="1" stopColor="#8a7018" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="neon-champagne-spray">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="neon-spray-dot" style={{ ["--i" as string]: i }} />
          ))}
        </div>
      </div>

      <div className="neon-seal neon-seal-lg">
        <span className="neon-seal-glow" />
        <div className="neon-seal-face">
          <span className="neon-seal-icon">♛</span>
          <span className="neon-seal-script">You&apos;re Invited</span>
        </div>
      </div>

      <div className="neon-seal neon-seal-sm">
        <span className="neon-seal-glow" />
        <div className="neon-seal-face">
          <span className="neon-seal-icon">♥</span>
          <span className="neon-seal-script neon-seal-script-sm">Memories Shared</span>
        </div>
      </div>

      <div className="neon-reel">
        <div className="neon-reel-track">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className={`neon-reel-frame neon-frame-${(i % 4) + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
