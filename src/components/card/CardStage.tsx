"use client";
import { RotateCw } from "lucide-react";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { sfx } from "@/lib/sound-fx";
import { StampImpactSequence } from "./StampImpactSequence";
import { VipCard3D } from "./VipCard3D";

export interface ImpactRequest {
  id: string;
  fromStamps: number;
  earned: number;
}

export interface CardStageProps {
  fullName: string;
  memberCode: string;
  stamps: number;
  flipped: boolean;
  onFlippedChange: (flipped: boolean) => void;
  impact?: ImpactRequest | null;
  onImpactComplete?: (id: string) => void;
  onRedeemClick?: () => void;
  preview?: boolean;
  className?: string;
}

interface Session {
  id: string;
  from: number;
  earned: number;
  running: boolean;
  count: number;
}

interface IOSDeviceOrientation {
  requestPermission?: () => Promise<"granted" | "denied">;
}

const IDLE_RESUME_MS = 2500;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function CardStage({
  fullName,
  memberCode,
  stamps,
  flipped,
  onFlippedChange,
  impact,
  onImpactComplete,
  onRedeemClick,
  preview,
  className,
}: CardStageProps) {
  const reduce = !!useReducedMotion();

  // ---- motion values -------------------------------------------------------
  const flip = useMotionValue(flipped ? 180 : 0);
  const rawTiltX = useMotionValue(0);
  const rawTiltY = useMotionValue(0);
  const tiltX = useSpring(rawTiltX, { stiffness: 140, damping: 18, mass: 0.6 });
  const tiltY = useSpring(rawTiltY, { stiffness: 140, damping: 18, mass: 0.6 });
  const idleX = useMotionValue(0);
  const idleY = useMotionValue(0);
  const idleWeight = useMotionValue(1);
  const shakeX = useMotionValue(0);
  const shakeY = useMotionValue(0);
  const rotateY = useTransform([flip, tiltY, idleY], ([f, t, i]: number[]) => f + t + i);
  const rotateX = useTransform([tiltX, idleX], ([t, i]: number[]) => t + i);

  const cardRootRef = useRef<HTMLDivElement>(null);
  const flippedRef = useRef(flipped);
  const cbRef = useRef({ onFlippedChange, onImpactComplete });
  useEffect(() => {
    flippedRef.current = flipped;
    cbRef.current = { onFlippedChange, onImpactComplete };
  });

  // ---- idle auto-rotation (pauses while interacting, resumes after ~2.5s) ---
  const resumeTimer = useRef<number | null>(null);
  const weightAnim = useRef<AnimationPlaybackControls | null>(null);
  const lastVars = useRef({ mx: 50, my: 50 });

  const interact = useCallback(() => {
    weightAnim.current?.stop();
    weightAnim.current = animate(idleWeight, 0, { duration: 0.35, ease: "easeOut" });
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      weightAnim.current?.stop();
      weightAnim.current = animate(idleWeight, 1, { duration: 1.4, ease: "easeInOut" });
    }, IDLE_RESUME_MS);
  }, [idleWeight]);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    []
  );

  useAnimationFrame((time) => {
    const w = reduce ? 0 : idleWeight.get();
    const t = time / 1000;
    const ampY = preview ? 30 : 11;
    const ampX = preview ? 7 : 4;
    idleY.set(Math.sin(t * (preview ? 0.55 : 0.7)) * ampY * w);
    idleX.set(Math.sin(t * 0.45 + 1) * ampX * w);

    const el = cardRootRef.current;
    if (!el) return;
    const mx = clamp(50 + (tiltY.get() + idleY.get()) * 2.2, 0, 100);
    const my = clamp(50 - (tiltX.get() + idleX.get()) * 3, 0, 100);
    if (Math.abs(mx - lastVars.current.mx) > 0.35 || Math.abs(my - lastVars.current.my) > 0.35) {
      lastVars.current = { mx, my };
      el.style.setProperty("--mx", mx.toFixed(1));
      el.style.setProperty("--my", my.toFixed(1));
    }
  });

  // ---- flipping (spring physics) -------------------------------------------
  const flipAnim = useRef<AnimationPlaybackControls | null>(null);
  const commanded = useRef(flipped);
  const resync = useRef<number | null>(null);

  const springTo = useCallback(
    (toFlipped: boolean, velocity = 0) => {
      commanded.current = toFlipped;
      const want = toFlipped ? 180 : 0;
      const cur = flip.get();
      const target = Math.round((cur - want) / 360) * 360 + want; // nearest equivalent angle
      flipAnim.current?.stop();
      flipAnim.current = reduce
        ? animate(flip, target, { duration: 0.25, ease: "easeOut" })
        : animate(flip, target, { type: "spring", stiffness: 170, damping: 15, mass: 0.9, velocity });
    },
    [flip, reduce]
  );

  useEffect(() => {
    if (commanded.current !== flipped) springTo(flipped);
  }, [flipped, springTo]);

  const requestFlip = useCallback(
    (next: boolean, velocity = 0) => {
      springTo(next, velocity);
      cbRef.current.onFlippedChange(next);
      if (resync.current) window.clearTimeout(resync.current);
      // If the parent did not accept the change, snap back to its truth.
      resync.current = window.setTimeout(() => {
        if (commanded.current !== flippedRef.current) springTo(flippedRef.current);
      }, 700);
    },
    [springTo]
  );

  useEffect(
    () => () => {
      if (resync.current) window.clearTimeout(resync.current);
    },
    []
  );

  // ---- gyroscope tilt on touch devices -------------------------------------
  const gyroOn = useRef(false);
  const gyroHandler = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const gyroBase = useRef<{ b: number; g: number } | null>(null);

  const startGyro = useCallback(() => {
    if (gyroOn.current || typeof window === "undefined") return;
    gyroOn.current = true;
    const handler = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (!gyroBase.current) gyroBase.current = { b: e.beta, g: e.gamma };
      // slowly drift the baseline so any comfortable hold angle feels neutral
      gyroBase.current.b += (e.beta - gyroBase.current.b) * 0.01;
      gyroBase.current.g += (e.gamma - gyroBase.current.g) * 0.01;
      rawTiltY.set(clamp(e.gamma - gyroBase.current.g, -35, 35) * 0.5);
      rawTiltX.set(clamp(e.beta - gyroBase.current.b, -35, 35) * -0.4);
    };
    gyroHandler.current = handler;
    window.addEventListener("deviceorientation", handler);
  }, [rawTiltX, rawTiltY]);

  useEffect(
    () => () => {
      if (gyroHandler.current) window.removeEventListener("deviceorientation", gyroHandler.current);
      gyroHandler.current = null;
      gyroOn.current = false;
    },
    []
  );

  const requestGyro = useCallback(() => {
    if (reduce || gyroOn.current || typeof window === "undefined") return;
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;
    if (typeof DeviceOrientationEvent === "undefined") return;
    const ios = DeviceOrientationEvent as unknown as IOSDeviceOrientation;
    if (typeof ios.requestPermission === "function") {
      ios
        .requestPermission()
        .then((r) => {
          if (r === "granted") startGyro();
        })
        .catch(() => undefined);
    } else {
      startGyro();
    }
  }, [reduce, startGyro]);

  useEffect(() => {
    // Android/others need no permission prompt.
    if (typeof window === "undefined" || reduce) return;
    if (!window.matchMedia?.("(pointer: coarse)").matches) return;
    if (typeof DeviceOrientationEvent === "undefined") return;
    const ios = DeviceOrientationEvent as unknown as IOSDeviceOrientation;
    if (typeof ios.requestPermission !== "function") startGyro();
  }, [reduce, startGyro]);

  // ---- pointer: tilt, tap, drag/flick --------------------------------------
  const stageRef = useRef<HTMLDivElement>(null);
  const press = useRef<{
    id: number;
    x: number;
    t: number;
    base: number;
    dragging: boolean;
    lastX: number;
    lastT: number;
    vx: number;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    sfx.unlock();
    requestGyro();
    interact();
    if ((e.target as HTMLElement).closest("[data-no-flip]")) return;
    flipAnim.current?.stop();
    press.current = {
      id: e.pointerId,
      x: e.clientX,
      t: performance.now(),
      base: flip.get(),
      dragging: false,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (e.pointerType === "mouse" && !p?.dragging && stageRef.current) {
      const r = stageRef.current.getBoundingClientRect();
      const nx = clamp((e.clientX - r.left) / r.width, 0, 1) - 0.5;
      const ny = clamp((e.clientY - r.top) / r.height, 0, 1) - 0.5;
      if (!reduce) {
        rawTiltY.set(nx * 22);
        rawTiltX.set(-ny * 18);
      }
      interact();
    }
    if (!p || p.id !== e.pointerId) return;
    const now = performance.now();
    const dx = e.clientX - p.x;
    if (!p.dragging && Math.abs(dx) > 8) {
      p.dragging = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (p.dragging) {
      const dt = Math.max(1, now - p.lastT);
      p.vx = 0.8 * p.vx + 0.2 * ((e.clientX - p.lastX) / dt);
      p.lastX = e.clientX;
      p.lastT = now;
      flip.set(p.base + dx * 0.6);
      interact();
    }
  };

  const finishPress = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    if (p.dragging) {
      const delta = flip.get() - p.base;
      const flick = Math.abs(p.vx) > 0.45 && Math.sign(p.vx) === Math.sign(delta || p.vx);
      const shouldFlip = !cancelled && (Math.abs(delta) > 50 || flick);
      const next = shouldFlip ? !flippedRef.current : flippedRef.current;
      if (shouldFlip) {
        // commit in the drag direction rather than the shortest path
        const dir = Math.sign(delta || p.vx) || 1;
        const want = next ? 180 : 0;
        const cur = flip.get();
        let target = Math.round((cur - want) / 360) * 360 + want;
        if (dir > 0 && target < cur) target += 360;
        if (dir < 0 && target > cur) target -= 360;
        commanded.current = next;
        flipAnim.current?.stop();
        flipAnim.current = reduce
          ? animate(flip, target, { duration: 0.25 })
          : animate(flip, target, { type: "spring", stiffness: 170, damping: 15, mass: 0.9, velocity: p.vx * 600 });
        cbRef.current.onFlippedChange(next);
        if (resync.current) window.clearTimeout(resync.current);
        resync.current = window.setTimeout(() => {
          if (commanded.current !== flippedRef.current) springTo(flippedRef.current);
        }, 700);
      } else {
        springTo(next, p.vx * 600);
      }
      return;
    }
    if (!cancelled && performance.now() - p.t < 500) {
      sfx.click();
      requestFlip(!flippedRef.current);
    } else {
      springTo(flippedRef.current);
    }
  };

  const onPointerLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && !press.current?.dragging) {
      rawTiltX.set(0);
      rawTiltY.set(0);
    }
  };

  // ---- stamp impact orchestration ------------------------------------------
  const [session, setSession] = useState<Session | null>(null);
  const [override, setOverride] = useState<number | null>(null);
  const impactRef = useRef(impact);
  useEffect(() => {
    impactRef.current = impact;
  });
  const impactId = impact?.id ?? null;
  const completedEmpty = useRef<string | null>(null);

  useEffect(() => {
    const req = impactRef.current;
    if (!impactId || !req) return;
    const earned = Math.max(0, Math.floor(req.earned));
    if (earned === 0) {
      if (completedEmpty.current !== impactId) {
        completedEmpty.current = impactId;
        cbRef.current.onImpactComplete?.(impactId);
      }
      return;
    }
    const from = Math.max(0, Math.floor(req.fromStamps));
    setOverride(null);
    setSession({ id: impactId, from, earned, running: false, count: from });
    interact();
    const wasFlipped = flippedRef.current;
    if (!wasFlipped) {
      requestFlip(true);
    }
    const wait = wasFlipped ? 150 : reduce ? 450 : 850;
    const timer = window.setTimeout(() => {
      setSession((s) => (s && s.id === impactId ? { ...s, running: true } : s));
    }, wait);
    return () => window.clearTimeout(timer);
  }, [impactId, interact, reduce, requestFlip]);

  const handleSlam = useCallback((count: number) => {
    setSession((s) => (s ? { ...s, count } : s));
  }, []);

  const handleShake = useCallback(() => {
    animate(shakeX, [0, -5, 4, -3, 1.5, 0], { duration: 0.18, ease: "easeOut" });
    animate(shakeY, [0, 3, -4, 2, -1, 0], { duration: 0.18, ease: "easeOut" });
  }, [shakeX, shakeY]);

  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  });
  const handleComplete = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    sessionRef.current = null;
    setOverride(s.from + s.earned);
    setSession(null);
    cbRef.current.onImpactComplete?.(s.id);
  }, []);

  // Hold the final count until the parent's committed balance catches up.
  useEffect(() => {
    if (override === null) return;
    const t = window.setTimeout(() => setOverride(null), 2500);
    return () => window.clearTimeout(t);
  }, [override]);
  useEffect(() => {
    setOverride((o) => (o !== null && stamps === o ? null : o));
  }, [stamps]);

  const displayed = session ? session.count : override !== null ? override : stamps;

  return (
    <div className={`flex flex-col items-center ${className ?? ""}`}>
      <motion.div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishPress(e, false)}
        onPointerCancel={(e) => finishPress(e, true)}
        onPointerLeave={onPointerLeave}
        style={{
          x: shakeX,
          y: shakeY,
          touchAction: "pan-y",
          padding: "22px 18px 30px",
          cursor: "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          position: "relative",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "12%",
            right: "12%",
            bottom: 14,
            height: 26,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(0,0,0,0.55), transparent)",
            filter: "blur(4px)",
          }}
        />
        <VipCard3D
          rootRef={cardRootRef}
          fullName={fullName}
          memberCode={memberCode}
          stamps={displayed}
          rotateX={rotateX}
          rotateY={rotateY}
          onRedeemClick={onRedeemClick}
          overlay={
            session?.running ? (
              <StampImpactSequence
                key={session.id}
                from={session.from}
                earned={session.earned}
                reduced={reduce}
                onSlam={handleSlam}
                onShake={handleShake}
                onComplete={handleComplete}
              />
            ) : null
          }
        />
      </motion.div>
      <button
        type="button"
        onClick={() => {
          sfx.unlock();
          interact();
          requestFlip(!flippedRef.current);
        }}
        aria-pressed={flipped}
        className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs font-semibold tracking-wide text-cream/75 transition hover:bg-cream/10 active:scale-95"
      >
        <RotateCw size={14} aria-hidden />
        {flipped ? "Show front" : "Show stamps"}
        <span className="text-cream/60" aria-hidden>· or swipe</span>
      </button>
    </div>
  );
}
