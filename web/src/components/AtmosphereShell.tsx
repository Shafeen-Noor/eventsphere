"use client";

import type { ReactNode } from "react";
import { getAtmosphere, isDarkAtmosphere, type AtmosphereId } from "@/lib/atmospheres";

export function AtmosphereShell({
  atmosphere,
  children,
}: {
  atmosphere: string;
  children: ReactNode;
}) {
  const theme = getAtmosphere(atmosphere);
  const dark = isDarkAtmosphere(atmosphere as AtmosphereId);

  return (
    <div
      className="atmosphere panel overflow-hidden"
      style={{
        background: theme.bg,
        color: dark ? "#f7f1ea" : "#152935",
        borderColor: dark ? "rgba(255,255,255,0.12)" : "rgba(21,41,53,0.12)",
      }}
    >
      <div className="atmosphere-layer" aria-hidden>
        {theme.id === "bday" ? <BdayDecor /> : null}
        {theme.id === "wedding" ? <WeddingDecor /> : null}
        {theme.id === "trip" ? <TripDecor /> : null}
        {theme.id === "dinner" ? <DinnerDecor /> : null}
        {theme.id === "party" ? <PartyDecor /> : null}
      </div>
      <div className="atmosphere-content p-4 sm:p-6 space-y-6">{children}</div>
    </div>
  );
}

function BdayDecor() {
  return (
    <>
      <span className="floaty text-4xl" style={{ left: "6%", top: "10%" }}>🎈</span>
      <span className="floaty text-3xl" style={{ left: "78%", top: "18%", animationDelay: "1s" }}>🎉</span>
      <span className="floaty text-3xl" style={{ left: "20%", top: "70%", animationDelay: "2s" }}>🎂</span>
      <span className="floaty text-2xl" style={{ left: "88%", top: "62%", animationDelay: "0.5s" }}>✨</span>
      <span className="floaty text-2xl" style={{ left: "45%", top: "8%", animationDelay: "1.6s" }}>🎊</span>
    </>
  );
}

function WeddingDecor() {
  return (
    <>
      <span className="floaty text-3xl" style={{ left: "8%", top: "12%", opacity: 0.35 }}>🌸</span>
      <span className="floaty text-4xl" style={{ right: "10%", top: "16%", opacity: 0.35, animationDelay: "1.2s" }}>🤍</span>
      <span className="floaty text-3xl" style={{ left: "70%", top: "68%", opacity: 0.3, animationDelay: "2s" }}>🌿</span>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(228,165,118,0.25), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.8), transparent 40%)",
        }}
      />
    </>
  );
}

function TripDecor() {
  return (
    <>
      <span className="floaty text-3xl" style={{ left: "8%", top: "14%" }}>✈️</span>
      <span className="floaty text-3xl" style={{ left: "82%", top: "20%", animationDelay: "1s" }}>🗺️</span>
      <span className="floaty text-2xl" style={{ left: "18%", top: "72%", animationDelay: "1.8s" }}>📷</span>
      <span className="floaty text-2xl" style={{ left: "70%", top: "66%", animationDelay: "0.4s" }}>🧳</span>
      <div
        className="absolute top-8 left-[-20%] text-5xl opacity-20"
        style={{ animation: "drift 18s linear infinite" }}
      >
        ✈️
      </div>
    </>
  );
}

function DinnerDecor() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(500px 220px at 50% 0%, rgba(228,165,118,0.18), transparent 60%)",
        }}
      />
      <span className="floaty text-3xl" style={{ left: "10%", top: "16%", opacity: 0.4 }}>🕯️</span>
      <span className="floaty text-3xl" style={{ right: "12%", top: "22%", opacity: 0.35, animationDelay: "1.4s" }}>🍷</span>
      <span className="floaty text-2xl" style={{ left: "48%", top: "70%", opacity: 0.3, animationDelay: "0.8s" }}>🍽️</span>
    </>
  );
}

function PartyDecor() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(255,0,128,0.25), transparent 30%), radial-gradient(circle at 80% 20%, rgba(0,200,255,0.2), transparent 28%), radial-gradient(circle at 50% 80%, rgba(255,220,0,0.15), transparent 35%)",
        }}
      />
      <span className="floaty text-4xl" style={{ left: "8%", top: "12%" }}>🪩</span>
      <span
        className="floaty text-3xl"
        style={{ right: "12%", top: "18%", animation: "sparkle 2.4s ease-in-out infinite" }}
      >
        ✨
      </span>
      <span className="floaty text-3xl" style={{ left: "70%", top: "68%", animationDelay: "1s" }}>🎧</span>
      <span className="floaty text-2xl" style={{ left: "24%", top: "74%", animationDelay: "1.6s" }}>🕺</span>
    </>
  );
}
