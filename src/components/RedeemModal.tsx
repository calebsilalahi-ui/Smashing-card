"use client";

import { Delete, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { LiveCounterTicket } from "@/components/LiveCounterTicket";
import { redeemReward } from "@/lib/api-client";
import { DEMO_STAFF_PIN, demoRedeem } from "@/lib/demo";
import { sfx } from "@/lib/sound-fx";
import type { Member, RedeemSuccess } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  demo: boolean;
  member: Member;
  onRedeemed: (res: RedeemSuccess) => void;
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function RedeemModal({ open, onClose, demo, member, onRedeemed }: Props) {
  const reduce = useReducedMotion();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [success, setSuccess] = useState<RedeemSuccess | null>(null);

  // Reset on open.
  useEffect(() => {
    if (!open) return;
    setPin("");
    setError(null);
    setBusy(false);
    setSuccess(null);
    const lu = member.pinLockedUntil ? Date.parse(member.pinLockedUntil) : NaN;
    setLockedUntil(Number.isFinite(lu) && lu > Date.now() ? lu : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const locked = lockedUntil !== null && lockedUntil > now;

  useEffect(() => {
    if (!open || lockedUntil === null) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) {
        setLockedUntil(null);
        setError(null);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, lockedUntil]);

  const submit = useCallback(
    async (code: string) => {
      setBusy(true);
      setError(null);
      const res = demo ? demoRedeem(code) : await redeemReward(code);
      setBusy(false);
      if (res.ok) {
        sfx.chime();
        setSuccess(res);
        onRedeemed(res);
        return;
      }
      sfx.error();
      setPin("");
      if (res.code === "locked") {
        const lu = res.lockedUntil ? Date.parse(res.lockedUntil) : Date.now() + 15 * 60_000;
        setNow(Date.now());
        setLockedUntil(lu);
        setError(null);
      } else if (res.code === "invalid_pin") {
        setShake((n) => n + 1);
        const left = res.attemptsRemaining;
        setError(typeof left === "number" ? `Wrong PIN — ${left} ${left === 1 ? "attempt" : "attempts"} left` : "Wrong PIN");
      } else if (res.code === "insufficient_stamps") {
        setError("Not enough stamps yet — you need 10 stamps to redeem.");
      } else {
        setError(res.message);
      }
    },
    [demo, onRedeemed],
  );

  function press(d: string) {
    if (busy || locked) return;
    sfx.click();
    setError(null);
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) void submit(next);
  }

  if (!open) return null;

  if (success) {
    return (
      <LiveCounterTicket
        fullName={success.fullName}
        memberCode={success.memberCode}
        redeemedAt={success.redeemedAt}
        onClose={onClose}
      />
    );
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const keyCls =
    "h-14 rounded-2xl border border-cream/15 bg-espresso-soft/70 font-display text-2xl text-cream transition active:scale-95 active:bg-flame/40 disabled:opacity-40";

  return (
    <AnimatePresence>
      <motion.div
        key="redeem"
        role="dialog"
        aria-modal="true"
        aria-label="Counter verification"
        className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-espresso-deep"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="checker-strip shrink-0" aria-hidden />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center px-4 pb-6 pt-4 text-center">
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 self-end place-items-center rounded-full text-cream/80 hover:bg-cream/10">
            <X size={20} aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/helena-burger.png" alt="Helena Burger" className="h-28 w-28 rounded-2xl object-cover shadow-lg" />
          <h2 className="mt-3 font-display text-xl text-gold">COUNTER VERIFICATION</h2>
          <p className="mt-1 text-sm text-cream/80">Show this screen to the cashier</p>
          <p className="text-xs text-cream/60">Cashier enters the 4-digit Staff PIN to release your free Helena Burger.</p>

          <motion.div
            key={shake}
            className="mt-5 flex gap-3"
            animate={shake && !reduce ? { x: [0, -12, 12, -8, 8, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            role="status"
            aria-label={`PIN, ${pin.length} of 4 digits entered`}
          >
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-4 w-4 rounded-full border-2 ${i < pin.length ? "border-flame bg-flame" : "border-cream/40"}`}
              />
            ))}
          </motion.div>

          <div className="mt-2 min-h-[2.5rem] text-sm" role="alert">
            {locked && lockedUntil !== null ? (
              <p className="font-semibold text-flame">
                Too many wrong PINs. Try again in {fmtCountdown(lockedUntil - now)}
              </p>
            ) : (
              error && <p className="font-semibold text-flame">{error}</p>
            )}
            {busy && <p className="text-cream/70">Checking…</p>}
          </div>

          <div className="mt-2 grid w-full grid-cols-3 gap-2.5">
            {keys.map((k) => (
              <button key={k} type="button" data-testid={`pin-key-${k}`} disabled={busy || locked} onClick={() => press(k)} className={keyCls}>
                {k}
              </button>
            ))}
            <button type="button" aria-label="Clear" disabled={busy || locked} onClick={() => setPin("")} className={`${keyCls} !text-sm`}>
              CLEAR
            </button>
            <button type="button" data-testid="pin-key-0" disabled={busy || locked} onClick={() => press("0")} className={keyCls}>
              0
            </button>
            <button
              type="button"
              aria-label="Backspace"
              disabled={busy || locked}
              onClick={() => setPin((p) => p.slice(0, -1))}
              className={`${keyCls} grid place-items-center`}
            >
              <Delete size={22} aria-hidden />
            </button>
          </div>

          {demo && <p className="mt-4 text-xs text-cream/70">Demo Staff PIN: {DEMO_STAFF_PIN}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
