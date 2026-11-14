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
  const outer = expired ? "#d1d5db" : "#F2EEE9";
  const core = expired ? "#9ca3af" : "#F54725";
  // One tall flame flanked by two smaller ones; each breathes on its own slow, offset cycle.
  const tongues = [
    { x: 70, h: 52, delay: 0.5, o: 0.55 },
    { x: 100, h: 74, delay: 0, o: 0.95 },
    { x: 130, h: 46, delay: 1.1, o: 0.5 },
  ];
  return (
    <svg viewBox="0 0 200 90" className="h-20 w-full" aria-hidden preserveAspectRatio="xMidYMax meet">
      {tongues.map((t) => {
        const w = t.h * 0.34;
        const top = 90 - t.h;
        const d = `M${t.x - w} 90 C${t.x - w * 1.25} ${90 - t.h * 0.45} ${t.x - w * 0.2} ${90 - t.h * 0.55} ${t.x} ${top} C${t.x + w * 0.2} ${90 - t.h * 0.55} ${t.x + w * 1.25} ${90 - t.h * 0.45} ${t.x + w} 90 Z`;
        return (
          <g
            key={t.x}
            className={expired ? "" : "lt-flame"}
            style={{ animationDelay: `${t.delay}s`, transformOrigin: `${t.x}px 90px` }}
            opacity={t.o}
          >
            <path d={d} fill={outer} />
            <path
              d={`M${t.x - w * 0.45} 90 C${t.x - w * 0.5} ${90 - t.h * 0.25} ${t.x} ${90 - t.h * 0.3} ${t.x} ${90 - t.h * 0.5} C${t.x} ${90 - t.h * 0.3} ${t.x + w * 0.5} ${90 - t.h * 0.25} ${t.x + w * 0.45} 90 Z`}
              fill={core}
            />
          </g>
        );
      })}
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
      className={`fixed inset-0 z-[200] flex flex-col overflow-y-auto transition-colors duration-500 ${expired ? "bg-gray-600" : "bg-emerald-live"} text-white`}
    >
      <style>{`
        @keyframes lt-breathe { 0%,100% { transform: scale(1, 1); } 30% { transform: scale(.96, 1.07); } 65% { transform: scale(1.03, .96); } }
        .lt-flame { animation: lt-breathe 2.6s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
      `}</style>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] text-center">
        <p className="font-mono text-xs tracking-[0.2em] text-white">SMASHING BURGER · LIVE TICKET</p>

        {expired ? (
          <div className="mt-8" role="alert">
            <p className="font-display text-3xl leading-tight">TICKET EXPIRED</p>
            <p className="mt-2 text-sm text-white">This proof is no longer valid.</p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm font-medium text-white">Valid for</p>
            <p className="font-mono text-[5.5rem] font-medium tabular-nums leading-none tracking-tight" aria-live="off">
              {mm}:{ss}
            </p>
          </>
        )}

        <div className="mt-4 w-full">
          <Flames expired={expired} />
        </div>

        <div className="mt-2 w-full rounded-2xl bg-black/25 px-4 py-3">
          <p className="text-xs text-white">Live time</p>
          <p className="font-mono text-3xl tabular-nums">{wibClock.format(new Date(now))} WIB</p>
        </div>

        <div className="mt-3 w-full rounded-2xl bg-black/25 p-4">
          <p className="font-display text-xl leading-tight">{fullName}</p>
          <p className="font-mono text-sm text-white">#{memberCode}</p>
          <p className="mt-1 text-xs text-white">Redeemed {redeemedLabel}</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/20 p-2 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/helena-burger.png" alt="" className="h-14 w-14 rounded-lg object-cover" />
            <p className="font-display text-base leading-tight">1× FREE HELENA BURGER</p>
          </div>
        </div>

        <div className="mt-3 w-full rounded-2xl bg-white px-4 py-3.5 text-left text-ink">
          <p className="text-xs font-medium text-neutral-600">Staff instruction</p>
          <p className="mt-0.5 font-display text-lg leading-tight">RING UP: VIP LOYALTY — FREE HELENA BURGER</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`mt-5 h-12 w-full rounded-full px-4 text-[15px] font-semibold transition-transform duration-150 ease-out active:scale-[0.97] ${expired ? "bg-white text-gray-700" : "border border-white/40 bg-black/20 text-white"}`}
        >
          {expired ? "Close" : "Done"}
        </button>
      </div>
    </div>
  );
}
