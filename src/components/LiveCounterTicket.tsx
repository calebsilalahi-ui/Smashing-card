"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  fullName: string;
  memberCode: string;
  redeemedAt: string;
  onClose: () => void;
}

const TICKET_SECONDS = 180;

const wibClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const wibStamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function Flames({ expired }: { expired: boolean }) {
  const c1 = expired ? "#9ca3af" : "#F54725";
  const c2 = expired ? "#d1d5db" : "#FF7A00";
  const c3 = expired ? "#e5e7eb" : "#F9A65A";
  return (
    <svg viewBox="0 0 200 90" className="h-20 w-full" aria-hidden preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="lt-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.6" stopColor={c2} />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
      </defs>
      {[20, 55, 100, 145, 180].map((x, i) => (
        <path
          key={x}
          className={expired ? "" : "lt-flame"}
          style={{ animationDelay: `${i * 0.18}s`, transformOrigin: `${x}px 90px` }}
          d={`M${x - 18} 90 C${x - 22} 55 ${x - 4} 45 ${x} 8 C${x + 6} 40 ${x + 24} 55 ${x + 18} 90 Z`}
          fill="url(#lt-flame)"
          opacity={0.92}
        />
      ))}
    </svg>
  );
}

export function LiveCounterTicket({ fullName, memberCode, redeemedAt, onClose }: Props) {
  const endRef = useRef<number>(0);
  if (endRef.current === 0) endRef.current = Date.now() + TICKET_SECONDS * 1000;
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.ceil((endRef.current - now) / 1000));
  const expired = remaining <= 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const redeemedDate = new Date(redeemedAt);
  const redeemedLabel = Number.isNaN(redeemedDate.getTime()) ? redeemedAt : `${wibStamp.format(redeemedDate)} WIB`;

  return (
    <div
      data-testid="live-ticket"
      role="dialog"
      aria-modal="true"
      aria-label="Live redemption ticket"
      className={`fixed inset-0 z-[100] flex flex-col overflow-y-auto transition-colors duration-500 ${expired ? "bg-gray-600" : "bg-emerald-live"} text-white`}
    >
      <style>{`
        @keyframes lt-flicker { 0%,100% { transform: scaleY(1) scaleX(1); } 25% { transform: scaleY(1.12) scaleX(.94); } 50% { transform: scaleY(.92) scaleX(1.06); } 75% { transform: scaleY(1.08) scaleX(.97); } }
        @keyframes lt-march { from { background-position: 0 0, 10px 10px; } to { background-position: 80px 0, 90px 10px; } }
        .lt-flame { animation: lt-flicker 0.9s ease-in-out infinite; }
        .lt-march { animation: lt-march 2.4s linear infinite; }
      `}</style>

      <div className={`checker-strip lt-march shrink-0 ${expired ? "opacity-30" : ""}`} aria-hidden />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pb-6 pt-4 text-center">
        <p className="font-display text-xs tracking-[0.25em] text-white/80">SMASHING BURGER · LIVE TICKET</p>

        {expired ? (
          <div className="mt-6" role="alert">
            <p className="font-display text-3xl leading-tight">TICKET EXPIRED</p>
            <p className="mt-2 text-sm text-white/85">This proof is no longer valid.</p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/80">Valid for</p>
            <p className="font-display text-7xl tabular-nums leading-none" aria-live="off">
              {mm}:{ss}
            </p>
          </>
        )}

        <div className="mt-3 w-full">
          <Flames expired={expired} />
        </div>

        <div className="mt-1 w-full rounded-2xl bg-black/25 px-4 py-3">
          <p className="text-[11px] uppercase tracking-widest text-white/70">Live time</p>
          <p className="font-display text-3xl tabular-nums">{wibClock.format(new Date(now))} WIB</p>
        </div>

        <div className="mt-3 w-full rounded-2xl bg-white/10 p-4">
          <p className="font-display text-xl leading-tight">{fullName}</p>
          <p className="text-sm text-white/85">#{memberCode}</p>
          <p className="mt-1 text-xs text-white/75">Redeemed {redeemedLabel}</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/20 p-2 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/helena-burger.png" alt="" className="h-14 w-14 rounded-lg object-cover" />
            <p className="font-display text-base leading-tight">1× FREE HELENA BURGER</p>
          </div>
        </div>

        <div className="mt-3 w-full rounded-2xl border-4 border-white bg-white px-3 py-3 text-espresso-deep">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Staff instruction</p>
          <p className="font-display text-lg leading-tight">RING UP: VIP LOYALTY — FREE HELENA BURGER</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${expired ? "bg-white text-gray-700" : "border border-white/40 bg-black/20 text-white"}`}
        >
          {expired ? "Close" : "Done"}
        </button>
      </div>

      <div className={`checker-strip lt-march shrink-0 ${expired ? "opacity-30" : ""}`} aria-hidden />
    </div>
  );
}
