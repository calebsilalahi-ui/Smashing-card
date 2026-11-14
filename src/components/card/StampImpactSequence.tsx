"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STAMPS_FOR_REWARD } from "@/lib/moka";
import { sfx } from "@/lib/sound-fx";
import { FlameStampSVG } from "./FlameStampSVG";

export interface StampImpactSequenceProps {
  /** Committed count before the slam sequence. */
  from: number;
  /** Number of stamps to slam. */
  earned: number;
  reduced: boolean;
  /** Called at the moment of contact with the running count (from + slammed so far). */
  onSlam: (runningCount: number) => void;
  /** Called at contact so the stage can shake. */
  onShake: () => void;
  onComplete: () => void;
}

interface Drop {
  key: number;
  x: number;
  y: number;
  size: number;
  rot: number;
}
interface Spark {
  key: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
}

const SLAM_GAP = 550;
const FALL = 270;
const COLORS = ["#FF7A00", "#F54725", "#F9A65A", "#FF7A00", "#F54725"];

/** Absolute overlay mounted over the card's back face. Slot geometry is read from `[data-slot]` siblings. */
export function StampImpactSequence({ from, earned, reduced, onSlam, onShake, onComplete }: StampImpactSequenceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [flash, setFlash] = useState<0 | 1 | 2>(0);
  const [glow, setGlow] = useState(0);

  // Keep latest callbacks without restarting the timeline.
  const cb = useRef({ onSlam, onShake, onComplete });
  useEffect(() => {
    cb.current = { onSlam, onShake, onComplete };
  });

  useEffect(() => {
    const timers: number[] = [];
    let cancelled = false;
    let seq = 0;
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };

    const slotRect = (index: number) => {
      const face = rootRef.current?.parentElement;
      const slot = face?.querySelector<HTMLElement>(`[data-slot="${Math.min(index, STAMPS_FOR_REWARD - 1)}"]`);
      if (!slot) return null;
      // offsetLeft/Top are relative to the face (nearest positioned ancestor) and ignore 3D transforms.
      let x = 0;
      let y = 0;
      let el: HTMLElement | null = slot;
      while (el && el !== face) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement | null;
      }
      return { x, y, w: slot.offsetWidth, h: slot.offsetHeight };
    };

    const total = Math.max(0, Math.floor(earned));
    const gap = reduced ? 160 : SLAM_GAP;
    const fall = reduced ? 0 : FALL;

    for (let k = 0; k < total; k++) {
      const index = from + k;
      const running = from + k + 1;
      const rect = slotRect(index);
      const key = ++seq;
      const rot = (Math.random() - 0.5) * 16;

      later(() => {
        if (rect) {
          setDrops((d) => [...d, { key, x: rect.x, y: rect.y, size: rect.w, rot }]);
        }
      }, k * gap);

      later(() => {
        sfx.thud();
        if (!reduced) sfx.sizzle();
        cb.current.onSlam(running);
        if (!reduced) {
          cb.current.onShake();
          setFlash(1);
          later(() => setFlash(2), 50);
          later(() => setFlash(0), 100);
          if (rect) {
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            const burst: Spark[] = Array.from({ length: 16 }, (_, n) => {
              const a = (n / 16) * Math.PI * 2 + Math.random() * 0.4;
              const dist = rect.w * (0.7 + Math.random() * 1.1);
              return {
                key: key * 100 + n,
                x: cx,
                y: cy,
                dx: Math.cos(a) * dist,
                dy: Math.sin(a) * dist - rect.w * 0.2,
                size: 2 + Math.random() * 3.5,
                color: COLORS[n % COLORS.length],
                delay: Math.random() * 0.04,
              };
            });
            setSparks((s) => [...s, ...burst]);
            later(() => setSparks((s) => s.filter((p) => Math.floor(p.key / 100) !== key)), 1000);
          }
        }
        later(() => setDrops((d) => d.filter((x) => x.key !== key)), reduced ? 120 : 220);

        if (running === STAMPS_FOR_REWARD || (from >= STAMPS_FOR_REWARD && k === total - 1)) {
          later(() => {
            sfx.chime();
            if (!reduced) setGlow((g) => g + 1);
          }, reduced ? 80 : 160);
        }
      }, k * gap + fall);
    }

    later(() => cb.current.onComplete(), Math.max(0, total - 1) * gap + fall + (reduced ? 350 : 650));

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [from, earned, reduced]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none", transformStyle: "preserve-3d" }}
    >
      {drops.map((d) => (
        <motion.div
          key={d.key}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 2.2, z: 240, rotate: d.rot - 30 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, z: 0, rotate: d.rot }}
          transition={reduced ? { duration: 0.14 } : { duration: FALL / 1000, ease: [0.55, 0, 0.95, 0.5] }}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
            willChange: "transform, opacity",
          }}
        >
          <FlameStampSVG className="h-full w-full" />
        </motion.div>
      ))}

      {sparks.map((p) => (
        <motion.span
          key={p.key}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy + 14, opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.55 + p.delay * 4, ease: "easeOut", delay: p.delay }}
          style={{
            position: "absolute",
            left: p.x - p.size / 2,
            top: p.y - p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            transform: "translateZ(30px)",
            willChange: "transform, opacity",
          }}
        />
      ))}

      <AnimatePresence>
        {glow > 0 && (
          <motion.div
            key={glow}
            initial={{ opacity: 0.95, scale: 0.2 }}
            animate={{ opacity: 0, scale: 2.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "90%",
              aspectRatio: "1 / 1",
              marginLeft: "-45%",
              marginTop: "-45%",
              borderRadius: "50%",
              background:
                "radial-gradient(closest-side, rgba(255,236,190,0.95), rgba(249,166,90,0.6) 45%, rgba(245,71,37,0.25) 70%, transparent)",
              transform: "translateZ(40px)",
              willChange: "transform, opacity",
            }}
          />
        )}
      </AnimatePresence>

      {flash > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "5.2cqw",
            transform: "translateZ(60px)",
            background: flash === 1 ? "rgba(255,255,255,0.88)" : "rgba(14,6,4,0.78)",
          }}
        />
      )}
    </div>
  );
}
