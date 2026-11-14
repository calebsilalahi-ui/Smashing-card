"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { STAMPS_FOR_REWARD } from "@/lib/moka";
import { sfx } from "@/lib/sound-fx";
import { FlameStampSVG } from "./FlameStampSVG";

export interface StampImpactSequenceProps {
  /** Committed count before the sequence. */
  from: number;
  /** Number of stamps to apply. */
  earned: number;
  reduced: boolean;
  /** Fired at the moment of contact with the running count (from + stamped so far). */
  onSlam: (runningCount: number) => void;
  /** Fired at contact so the stage can press the card. */
  onPress: () => void;
  onComplete: () => void;
}

interface Item {
  key: number;
  x: number;
  y: number;
  size: number;
  rot: number;
  /** anticipation ring visible */
  ring: boolean;
  /** disc has been released */
  dropped: boolean;
  /** contact has happened (flash, ripples, sparks, sweep mounted) */
  contact: boolean;
  /** contact effects are finished and can unmount */
  spent: boolean;
}

/*
 * Per-stamp timeline (ms, relative to the stamp's start; stamps start GAP apart):
 *    0  anticipation: target ring brightens (ANTICIPATE)
 *  120  release: disc drops from 1.8x with a slight counter-rotation
 *  300  CONTACT: slot fills, clack + haptic, localized flash (60ms), ink ripple, card press, embers
 *  340  light sweep crosses the metal (560ms)
 *  420  counter rolls (delay set inside the counter)
 *  650  next stamp
 */
const GAP = 650;
const ANTICIPATE = 120;
const FALL = 180;
const CONTACT = ANTICIPATE + FALL;
const SETTLE = 480;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SPARKS = [
  [-1, -0.9, 3], [0.9, -1, 2.5], [-1.5, 0.1, 2], [1.6, -0.2, 3], [-0.7, -1.5, 2], [0.5, -1.4, 2.5], [1.1, 0.8, 2],
] as const;

/** Absolute overlay over the card's back face. Slot geometry is read from `[data-slot]` siblings. */
export function StampImpactSequence({ from, earned, reduced, onSlam, onPress, onComplete }: StampImpactSequenceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Item[]>([]);

  const cb = useRef({ onSlam, onPress, onComplete });
  useEffect(() => {
    cb.current = { onSlam, onPress, onComplete };
  });

  useEffect(() => {
    const timers: number[] = [];
    let cancelled = false;
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };
    const patch = (key: number, p: Partial<Item>) =>
      setItems((list) => list.map((it) => (it.key === key ? { ...it, ...p } : it)));

    const slotRect = (index: number) => {
      const face = rootRef.current?.parentElement;
      const slot = face?.querySelector<HTMLElement>(`[data-slot="${Math.min(index, STAMPS_FOR_REWARD - 1)}"]`);
      if (!slot) return null;
      // offsetLeft/Top ignore 3D transforms, so this stays correct mid-tilt.
      let x = 0;
      let y = 0;
      let el: HTMLElement | null = slot;
      while (el && el !== face) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement | null;
      }
      return { x, y, w: slot.offsetWidth };
    };

    const total = Math.max(0, Math.floor(earned));
    const gap = reduced ? 220 : GAP;
    const anticipate = reduced ? 0 : ANTICIPATE;
    const contactAt = reduced ? 0 : CONTACT;

    for (let k = 0; k < total; k++) {
      const index = from + k;
      const running = index + 1;
      const key = k + 1;
      const rect = slotRect(index);
      const rot = (index % 2 === 0 ? -1 : 1) * (6 + (index % 3) * 2); // deterministic start tilt

      if (!reduced && rect) {
        later(() => {
          setItems((list) => [
            ...list,
            { key, x: rect.x, y: rect.y, size: rect.w, rot, ring: true, dropped: false, contact: false, spent: false },
          ]);
        }, k * gap);
        later(() => patch(key, { dropped: true }), k * gap + anticipate);
      }

      later(() => {
        // sound + haptic + data land on the same frame
        sfx.clack(index % STAMPS_FOR_REWARD);
        if (!reduced) sfx.sizzle(0.3);
        try {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(running === STAMPS_FOR_REWARD ? [12, 50, 24] : 12);
          }
        } catch {
          /* haptics are optional */
        }
        cb.current.onSlam(running);
        if (!reduced) {
          cb.current.onPress();
          patch(key, { ring: false, contact: true });
          later(() => patch(key, { spent: true }), 900);
        }
        if (running === STAMPS_FOR_REWARD || (from >= STAMPS_FOR_REWARD && k === total - 1)) {
          later(() => sfx.chime(), reduced ? 80 : 200);
        }
      }, k * gap + contactAt);
    }

    later(() => cb.current.onComplete(), Math.max(0, total - 1) * gap + contactAt + (reduced ? 350 : SETTLE));

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [from, earned, reduced]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: "5.2cqw" }}
    >
      {items.map((it) => {
        const cx = it.x + it.size / 2;
        const cy = it.y + it.size / 2;
        return (
          <div key={it.key}>
            {/* 1. anticipation: the slot ring glows */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={it.ring ? { opacity: 1, scale: 1.06 } : { opacity: 0, scale: 1.12 }}
              transition={{ duration: it.ring ? ANTICIPATE / 1000 : 0.12, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: it.x,
                top: it.y,
                width: it.size,
                height: it.size,
                borderRadius: "50%",
                border: "1.5px solid rgba(245,71,37,0.95)",
                boxShadow: "0 0 10px rgba(245,71,37,0.65), inset 0 0 8px rgba(245,71,37,0.35)",
              }}
            />

            {/* 2. slam: drops from depth, squashes on contact, springs back */}
            {it.dropped && (
              <motion.div
                initial={{ opacity: 0, scale: 1.8, rotate: it.rot }}
                animate={{ opacity: [0, 1, 1, 1], scale: [1.8, 1, 0.9, 1], rotate: [it.rot, 0, 0, 0] }}
                transition={{
                  duration: (FALL + 120) / 1000,
                  times: [0, FALL / (FALL + 120), (FALL + 40) / (FALL + 120), 1],
                  ease: ["easeIn", "easeOut", EASE_OUT],
                }}
                style={{
                  position: "absolute",
                  left: it.x + it.size * 0.07,
                  top: it.y + it.size * 0.07,
                  width: it.size * 0.86,
                  height: it.size * 0.86,
                  willChange: "transform, opacity",
                }}
              >
                <FlameStampSVG className="h-full w-full" />
              </motion.div>
            )}

            {it.contact && !it.spent && (
              <>
                {/* 3a. localized impact flash, ~60ms */}
                <motion.div
                  initial={{ opacity: 1, scale: 0.7 }}
                  animate={{ opacity: 0, scale: 1.15 }}
                  transition={{ duration: 0.06, ease: "linear" }}
                  style={{
                    position: "absolute",
                    left: cx - it.size,
                    top: cy - it.size,
                    width: it.size * 2,
                    height: it.size * 2,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(closest-side, rgba(255,240,215,0.95), rgba(255,140,70,0.55) 42%, transparent 72%)",
                  }}
                />
                {/* 3b. ink ripple rings */}
                {[0, 0.07].map((delay, n) => (
                  <motion.div
                    key={n}
                    initial={{ opacity: n === 0 ? 0.8 : 0.4, scale: 0.95 }}
                    animate={{ opacity: 0, scale: n === 0 ? 2.9 : 2.2 }}
                    transition={{ duration: n === 0 ? 0.6 : 0.5, delay, ease: EASE_OUT }}
                    style={{
                      position: "absolute",
                      left: it.x,
                      top: it.y,
                      width: it.size,
                      height: it.size,
                      borderRadius: "50%",
                      border: "1.5px solid rgba(245,120,80,0.9)",
                      willChange: "transform, opacity",
                    }}
                  />
                ))}
                {/* 3c. a few embers */}
                {SPARKS.map(([dx, dy, s], n) => (
                  <motion.span
                    key={n}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: dx * it.size, y: dy * it.size + it.size * 0.35, opacity: 0, scale: 0.3 }}
                    transition={{ duration: 0.45 + (n % 3) * 0.06, ease: "easeOut" }}
                    style={{
                      position: "absolute",
                      left: cx - s / 2,
                      top: cy - s / 2,
                      width: s,
                      height: s,
                      borderRadius: "50%",
                      background: n % 2 ? "#ff8a1f" : "#f54725",
                      willChange: "transform, opacity",
                    }}
                  />
                ))}
                {/* 4. light sweep across the metal, starts 40ms after contact */}
                <motion.div
                  initial={{ x: "-120%", opacity: 0, skewX: -18 }}
                  animate={{ x: "340%", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.56, delay: 0.04, ease: [0.4, 0, 0.2, 1], opacity: { times: [0, 0.2, 0.7, 1] } }}
                  style={{
                    position: "absolute",
                    top: "-10%",
                    bottom: "-10%",
                    left: 0,
                    width: "36%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.05) 70%, transparent)",
                    willChange: "transform, opacity",
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
