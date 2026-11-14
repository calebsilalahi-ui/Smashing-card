"use client";
import { Flame } from "lucide-react";

import type { CSSProperties, ReactNode, Ref } from "react";
import { AnimatePresence, motion, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { STAMPS_FOR_REWARD } from "@/lib/moka";
import { FlameStampSVG } from "./FlameStampSVG";

export interface VipCard3DProps {
  fullName: string;
  memberCode: string;
  /** Stamps currently displayed (may exceed 10). */
  stamps: number;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  /** Extra uniform scale on the card body (stamp "press"). */
  press?: MotionValue<number>;
  onRedeemClick?: () => void;
  /** Rendered absolutely over the back face (stamp impact layer). */
  overlay?: ReactNode;
  /** Optional handle to the wrapper element. */
  rootRef?: Ref<HTMLDivElement>;
  className?: string;
}

const THICK = 11; // card thickness in px
const HALF = THICK / 2;
const SLICES = 9;
const RADIUS = "5.2cqw";
const SMALL = "max(12px, 3.5cqw)"; // never below 12px

// Anisotropic noise: low frequency along x, high along y -> horizontal brushing streaks.
const BRUSH_NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.008 0.85' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.3 -0.5'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const faceBase: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: RADIUS,
  overflow: "hidden",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  background:
    "linear-gradient(158deg, var(--color-ti-hi) 0%, var(--color-ti) 42%, var(--color-ti-lo) 100%)",
};

const CAPS: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: SMALL,
  fontWeight: 500,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
};

/** Brushed grain, chamfer and the moving specular bands. Everything here is static except the two bands (transform only). */
function Metal({ bandX, bandX2, bandRot }: { bandX: MotionValue<string>; bandX2: MotionValue<string>; bandRot: MotionValue<number> }) {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, rgba(0,0,0,0) 1px 2px, rgba(0,0,0,0.06) 2px 3px, rgba(0,0,0,0) 3px 5px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: BRUSH_NOISE,
          backgroundSize: "256px 256px",
          opacity: 0.16,
          pointerEvents: "none",
        }}
      />
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          left: "-60%",
          width: "220%",
          top: "-25%",
          height: "150%",
          x: bandX2,
          rotate: bandRot,
          pointerEvents: "none",
          background:
            "linear-gradient(104deg, transparent 22%, rgba(255,255,255,0.045) 38%, rgba(255,255,255,0.085) 50%, rgba(255,255,255,0.045) 62%, transparent 78%)",
          willChange: "transform",
        }}
      />
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          left: "-60%",
          width: "220%",
          top: "-25%",
          height: "150%",
          x: bandX,
          rotate: bandRot,
          pointerEvents: "none",
          background:
            "linear-gradient(104deg, transparent 43%, rgba(255,255,255,0.07) 47%, rgba(255,255,255,0.26) 50%, rgba(255,255,255,0.07) 53%, transparent 57%)",
          willChange: "transform",
        }}
      />
      {/* chamfer: bright upper-left bevel, dark lower-right, hairline lip */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: RADIUS,
          pointerEvents: "none",
          boxShadow:
            "inset 1px 1.5px 0 0 rgba(255,255,255,0.32), inset -1px -1.5px 0 0 rgba(0,0,0,0.55), inset 0 0 0 2.5px rgba(255,255,255,0.045), inset 0 0 0 3.5px rgba(0,0,0,0.35)",
        }}
      />
    </>
  );
}

function Edge() {
  const mid = Math.floor(SLICES / 2);
  return (
    <>
      {Array.from({ length: SLICES }, (_, i) => {
        const z = -HALF + 1 + (i * (THICK - 2)) / (SLICES - 1);
        const flame = i === mid;
        return (
          <div
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: RADIUS,
              pointerEvents: "none",
              background: i % 2 === 0 ? "#55555a" : "#26262a",
              boxShadow: flame
                ? "inset 0 0 0 1.5px var(--color-flame)"
                : "inset 0 0 0 1px rgba(255,255,255,0.18)",
              transform: `translateZ(${z.toFixed(2)}px)`,
            }}
          />
        );
      })}
    </>
  );
}

function ContactlessMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" style={{ opacity: 0.55 }}>
      <path d="M8 6.5c2.2 3.4 2.2 7.6 0 11" stroke="#a8a19a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 4c3.2 4.7 3.2 11.3 0 16" stroke="#a8a19a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16 1.8c4.2 6 4.2 14.4 0 20.4" stroke="#a8a19a" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Front({
  fullName,
  memberCode,
  bandX,
  bandX2,
  bandRot,
}: {
  fullName: string;
  memberCode: string;
  bandX: MotionValue<string>;
  bandX2: MotionValue<string>;
  bandRot: MotionValue<number>;
}) {
  return (
    <div style={{ ...faceBase, transform: `translateZ(${HALF}px)` }}>
      <Metal bandX={bandX} bandX2={bandX2} bandRot={bandRot} />

      <div
        style={{
          position: "absolute",
          inset: "8cqw 8cqw 8.5cqw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ ...CAPS, color: "var(--color-fg-2)" }}>VIP LOYALTY CARD</div>
          <ContactlessMark />
        </div>

        {/* enamel inlay: cream plaque set into a recessed well */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "72%",
              padding: "1.4cqw",
              borderRadius: "5.4cqw",
              background: "linear-gradient(180deg, #0c0c0d, #1b1b1e)",
              boxShadow:
                "inset 0 0.7cqw 1.4cqw rgba(0,0,0,0.85), inset 0 0 0 1px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.14)",
            }}
          >
            <div
              style={{
                borderRadius: "4.2cqw",
                background: "linear-gradient(165deg, #ece2d6, #E4D8CA 55%, #d6c9b9)",
                padding: "5cqw 4.5cqw",
                boxShadow:
                  "inset 0 0.5cqw 1cqw rgba(60,40,20,0.35), inset 0 -0.3cqw 0.4cqw rgba(255,255,255,0.55), inset 0 0 0 1px rgba(70,50,30,0.25)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/smashing-logo-mark.png"
                alt="Smashing Burger"
                width={600}
                height={343}
                draggable={false}
                style={{ width: "100%", height: "auto", display: "block", userSelect: "none" }}
              />
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: "5.4cqw",
              lineHeight: 1.15,
              letterSpacing: "-0.005em",
              color: "var(--color-fg)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {fullName}
          </div>
          <div
            style={{
              marginTop: "1.6cqw",
              fontFamily: "var(--font-mono)",
              fontSize: SMALL,
              letterSpacing: "0.16em",
              color: "var(--color-fg-2)",
            }}
          >
            #{memberCode}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Number that rolls when its value changes. Slightly delayed so it lands after the impact. */
function Roll({ value, reduce }: { value: number; reduce: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "bottom", lineHeight: 1.2 }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={reduce ? { opacity: 0 } : { y: "70%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-70%", opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: 0.12 }}
          style={{ display: "inline-block" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Back({
  stamps,
  onRedeemClick,
  overlay,
  reduce,
  bandX,
  bandX2,
  bandRot,
}: {
  stamps: number;
  onRedeemClick?: () => void;
  overlay?: ReactNode;
  reduce: boolean;
  bandX: MotionValue<string>;
  bandX2: MotionValue<string>;
  bandRot: MotionValue<number>;
}) {
  const unlocked = stamps >= STAMPS_FOR_REWARD;
  const shown = Math.min(stamps, STAMPS_FOR_REWARD);
  const remaining = Math.max(0, STAMPS_FOR_REWARD - stamps);

  const copy = unlocked ? (
    <>
      <Flame
        aria-hidden
        style={{ display: "inline", width: "1.2em", height: "1.2em", verticalAlign: "-0.22em", marginRight: "0.35em", color: "var(--color-flame)" }}
      />
      REWARD UNLOCKED: 1 FREE HELENA BURGER! TAP TO REDEEM AT COUNTER
    </>
  ) : (
    `FREE HELENA BURGER IN ${remaining} MORE ${remaining === 1 ? "STAMP" : "STAMPS"} — ON YOUR NEXT ORDER!`
  );

  const stripBody = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "3.2cqw" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/helena-burger.png"
          alt=""
          width={420}
          height={552}
          draggable={false}
          style={{
            width: "12.5cqw",
            height: "12.5cqw",
            borderRadius: "50%",
            objectFit: "cover",
            flex: "none",
            opacity: unlocked ? 1 : 0.78,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.18), 0 1cqw 2cqw rgba(0,0,0,0.5)",
          }}
        />
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: SMALL,
            lineHeight: 1.35,
            letterSpacing: "0.05em",
            color: unlocked ? "var(--color-fg)" : "var(--color-fg-2)",
            textAlign: "left",
          }}
        >
          {copy}
        </div>
      </div>
      <div
        aria-hidden
        style={{ marginTop: "3cqw", height: 2, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            background: "var(--color-flame)",
            transformOrigin: "left center",
            transform: `scaleX(${shown / STAMPS_FOR_REWARD})`,
            transition: "transform 0.5s cubic-bezier(0.23,1,0.32,1) 0.15s",
          }}
        />
      </div>
    </>
  );

  const stripBox: CSSProperties = { position: "relative", display: "block", width: "100%", padding: "3.2cqw 3.6cqw", borderRadius: "4cqw" };

  return (
    <div style={{ ...faceBase, transform: `rotateY(180deg) translateZ(${HALF}px)` }}>
      <Metal bandX={bandX} bandX2={bandX2} bandRot={bandRot} />

      <div
        style={{
          position: "absolute",
          inset: "8cqw 7cqw 7.5cqw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ ...CAPS, color: "var(--color-fg-2)" }}>STAMP CARD</div>
          <div style={{ display: "flex", alignItems: "center", gap: "2cqw" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "5.2cqw",
                lineHeight: 1.2,
                color: unlocked ? "var(--color-flame)" : "var(--color-fg)",
                letterSpacing: "0.02em",
              }}
            >
              <span className="sr-only">{shown} of {STAMPS_FOR_REWARD} stamps</span>
              <span aria-hidden style={{ display: "inline-flex" }}>
                <Roll value={shown} reduce={reduce} />/{STAMPS_FOR_REWARD}
              </span>
            </div>
          </div>
        </div>

        <div
          role="group"
          aria-label={`${shown} of ${STAMPS_FOR_REWARD} stamps`}
          style={{ flex: 1, display: "flex", flexDirection: "row", justifyContent: "center", gap: "16cqw", margin: "4cqw 0" }}
        >
          {SLOT_ROWS.map((row) => (
          <div key={row[0]} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {row.map((i) => {
            const earned = i < shown;
            return (
              <div
                key={i}
                data-slot={i}
                style={{
                  position: "relative",
                  width: "17cqw",
                  aspectRatio: "1 / 1",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "radial-gradient(circle at 50% 35%, #101012, #0a0a0b 80%)",
                  boxShadow:
                    "inset 0 0.6cqw 1.2cqw rgba(0,0,0,0.9), inset 0 0 0 1px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.13), 0 0 0 0.9cqw rgba(255,255,255,0.025)",
                  fontFamily: "var(--font-mono)",
                  fontSize: SMALL,
                  color: "var(--color-fg-3)",
                }}
              >
                {earned ? (
                  <motion.div
                    initial={reduce ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    style={{ position: "absolute", inset: "7%", filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,0.6))" }}
                  >
                    <FlameStampSVG className="h-full w-full" />
                  </motion.div>
                ) : (
                  i + 1
                )}
              </div>
            );
          })}
          </div>
          ))}
        </div>

        {/* reward strip */}
        <div style={{ position: "relative" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "4cqw",
              background: "rgba(0,0,0,0.3)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 0.5cqw 1cqw rgba(0,0,0,0.5)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "4cqw",
              background: "rgba(245,71,37,0.1)",
              boxShadow: "inset 0 0 0 1px var(--color-flame)",
              opacity: unlocked ? 1 : 0,
              transition: "opacity 0.6s cubic-bezier(0.23,1,0.32,1) 0.2s",
            }}
          />
          {unlocked && (
            <>
              <motion.div
                aria-hidden
                initial={reduce ? { opacity: 0.4 } : { opacity: 0, scale: 0.85 }}
                animate={reduce ? { opacity: 0.4 } : { opacity: [0, 0.95, 0.4], scale: [0.85, 1.12, 1] }}
                transition={{ duration: 1, delay: 0.2, times: [0, 0.4, 1], ease: "easeOut" }}
                style={{
                  position: "absolute",
                  inset: "-3cqw",
                  borderRadius: "7cqw",
                  pointerEvents: "none",
                  background: "radial-gradient(closest-side, rgba(245,71,37,0.5), rgba(245,71,37,0.16) 65%, transparent)",
                }}
              />
              {!reduce && (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.1, 0.4, 0.1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                  style={{
                    position: "absolute",
                    inset: "-2cqw",
                    borderRadius: "6cqw",
                    pointerEvents: "none",
                    background: "radial-gradient(closest-side, rgba(245,71,37,0.35), transparent)",
                  }}
                />
              )}
            </>
          )}
          {unlocked ? (
            <button
              type="button"
              data-no-flip
              onClick={(e) => {
                e.stopPropagation();
                onRedeemClick?.();
              }}
              style={{ ...stripBox, cursor: "pointer", background: "none", border: 0, font: "inherit", color: "inherit" }}
            >
              {stripBody}
            </button>
          ) : (
            <div style={stripBox}>{stripBody}</div>
          )}
        </div>
      </div>

      {overlay}
    </div>
  );
}

/** Two vertical columns of five stamps: 1–5 on the left, 6–10 on the right. */
const SLOT_ROWS: number[][] = [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]];

export function VipCard3D({
  fullName,
  memberCode,
  stamps,
  rotateX,
  rotateY,
  press,
  onRedeemClick,
  overlay,
  rootRef,
  className,
}: VipCard3DProps) {
  const reduce = !!useReducedMotion();

  // Specular bands follow the angle between the card and the viewer. `d` is the tilt away from the
  // nearest face-on pose, so the highlight also sweeps across the metal during a flip.
  const d = useTransform(rotateY, (v) => v - 180 * Math.round(v / 180));
  const frontX = useTransform(d, (v) => `${(-v * 0.9).toFixed(2)}%`);
  const frontX2 = useTransform(d, (v) => `${(-v * 0.45).toFixed(2)}%`);
  const backX = useTransform(d, (v) => `${(v * 0.9).toFixed(2)}%`);
  const backX2 = useTransform(d, (v) => `${(v * 0.45).toFixed(2)}%`);
  const bandRot = useTransform(rotateX, (v) => v * 1.2);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: "relative",
        width: "min(84vw, 340px)",
        aspectRatio: "1 / 1.586",
        containerType: "inline-size",
        perspective: "1100px",
      }}
    >
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          rotateX,
          rotateY,
          scale: press,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <Edge />
        <Front fullName={fullName} memberCode={memberCode} bandX={frontX} bandX2={frontX2} bandRot={bandRot} />
        <Back
          stamps={stamps}
          onRedeemClick={onRedeemClick}
          overlay={overlay}
          reduce={reduce}
          bandX={backX}
          bandX2={backX2}
          bandRot={bandRot}
        />
      </motion.div>
    </div>
  );
}
