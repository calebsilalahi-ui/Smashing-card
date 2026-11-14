"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { motion, useReducedMotion, type MotionValue } from "motion/react";
import { STAMPS_FOR_REWARD } from "@/lib/moka";
import { FlameStampSVG } from "./FlameStampSVG";

export interface VipCard3DProps {
  fullName: string;
  memberCode: string;
  /** Stamps currently displayed (may exceed 10). */
  stamps: number;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  onRedeemClick?: () => void;
  /** Rendered absolutely over the back face (stamp impact layer). */
  overlay?: ReactNode;
  /** Receives the wrapper element; CardStage writes --mx / --my (0-100) on it for foil + rim lighting. */
  rootRef?: Ref<HTMLDivElement>;
  className?: string;
}

const THICK = 11; // card thickness in px
const HALF = THICK / 2;
const SLICES = 9;
const RADIUS = "5.2cqw";
const CELL = "4.6cqw"; // one checker cell; strip = 2 rows

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 .86  0 0 0 0 .72  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const METAL_TEXT: CSSProperties = {
  backgroundImage:
    "linear-gradient(180deg,#fff7e6 0%,#F9A65A 38%,#a85a14 52%,#F9A65A 70%,#ffe3bd 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
};

const faceBase: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: RADIUS,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  transformStyle: "preserve-3d",
};

const charred: CSSProperties = {
  borderRadius: RADIUS,
  backgroundColor: "#2D1914",
  backgroundImage: [
    NOISE,
    "radial-gradient(120% 70% at 20% 0%, rgba(255,122,0,0.16), transparent 60%)",
    "radial-gradient(90% 60% at 90% 100%, rgba(245,71,37,0.14), transparent 65%)",
    "linear-gradient(160deg,#3a2019 0%,#2D1914 45%,#1d0f0b 100%)",
  ].join(","),
  boxShadow:
    "inset 0 0 0 1px rgba(249,166,90,0.55), inset 0 0 0 3px rgba(26,14,11,0.9), inset 0 1.5cqw 3cqw rgba(255,160,90,0.12)",
};

function CheckerStrip({ position }: { position: "top" | "bottom" }) {
  const top = position === "top";
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [top ? "top" : "bottom"]: 0,
        height: `calc(${CELL} * 2)`,
        borderRadius: top ? `${RADIUS} ${RADIUS} 0 0` : `0 0 ${RADIUS} ${RADIUS}`,
        backgroundColor: "#1a0e0b",
        backgroundImage: `repeating-conic-gradient(#F54725 0 25%, #1a0e0b 0 50%), linear-gradient(${top ? "180deg" : "0deg"}, rgba(255,226,184,0.35), transparent 40%)`,
        backgroundSize: `calc(${CELL} * 2) calc(${CELL} * 2), 100% 100%`,
        backgroundPosition: "0 0, 0 0",
        boxShadow: top ? "0 1px 0 rgba(249,166,90,0.6)" : "0 -1px 0 rgba(249,166,90,0.6)",
        transform: "translateZ(1px)",
      }}
    />
  );
}

function Sheen({ radius = RADIUS }: { radius?: string }) {
  // Rim light + glare that follow --mx/--my (set from tilt by CardStage).
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        pointerEvents: "none",
        background:
          "radial-gradient(circle at calc(var(--mx,50)*1%) calc(var(--my,50)*1%), rgba(255,236,210,0.2), transparent 45%), linear-gradient(calc(100deg + var(--mx,50)*0.6deg), transparent 35%, rgba(255,200,140,0.08) 50%, transparent 65%)",
        transform: "translateZ(14px)",
      }}
    />
  );
}

function Foil() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: RADIUS,
        pointerEvents: "none",
        opacity: 0.34,
        backgroundImage: [
          "repeating-conic-gradient(rgba(255,255,255,0.85) 0 25%, rgba(0,0,0,0.55) 0 50%)",
          "linear-gradient(115deg,#F54725 0%,#FF7A00 22%,#F9A65A 40%,#fff1d6 50%,#F9A65A 60%,#FF7A00 78%,#F54725 100%)",
        ].join(","),
        backgroundSize: "7cqw 7cqw, 320% 320%",
        backgroundPosition: "0 0, calc(var(--mx,50)*1%) calc(var(--my,50)*1%)",
        backgroundBlendMode: "soft-light, normal",
        WebkitMaskImage:
          "radial-gradient(circle at calc(var(--mx,50)*1%) calc(var(--my,50)*1%), #000 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.12) 100%)",
        maskImage:
          "radial-gradient(circle at calc(var(--mx,50)*1%) calc(var(--my,50)*1%), #000 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.12) 100%)",
        transform: "translateZ(2px)",
      }}
    />
  );
}

function Edge() {
  return (
    <>
      {Array.from({ length: SLICES }, (_, i) => {
        const z = -HALF + 1 + (i * (THICK - 2)) / (SLICES - 1);
        const shade = i % 2 === 0 ? "#8b5a3c" : "#3b2218";
        return (
          <div
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: RADIUS,
              pointerEvents: "none",
              background: `linear-gradient(135deg, ${shade}, #1a0e0b 70%)`,
              boxShadow: "inset 0 0 0 1px rgba(249,166,90,0.5)",
              transform: `translateZ(${z.toFixed(2)}px)`,
            }}
          />
        );
      })}
    </>
  );
}

function Front({ fullName, memberCode }: { fullName: string; memberCode: string }) {
  return (
    <div style={{ ...faceBase, transform: `translateZ(${HALF}px)` }}>
      <div style={{ ...charred, position: "absolute", inset: 0 }} />
      <Foil />
      <CheckerStrip position="top" />
      <CheckerStrip position="bottom" />

      <div
        style={{
          position: "absolute",
          left: "6cqw",
          right: "6cqw",
          top: `calc(${CELL} * 2 + 7cqw)`,
          bottom: `calc(${CELL} * 2 + 7cqw)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          transformStyle: "preserve-3d",
        }}
      >
        <div style={{ transform: "translateZ(26px)", textAlign: "center" }}>
          <div
            className="font-display"
            style={{ ...METAL_TEXT, fontSize: "9.2cqw", lineHeight: 1.02, letterSpacing: "0.04em" }}
          >
            VIP
          </div>
          <div
            className="font-display"
            style={{ ...METAL_TEXT, fontSize: "6.6cqw", lineHeight: 1.1, letterSpacing: "0.08em", marginTop: "0.6cqw" }}
          >
            LOYALTY CARD
          </div>
        </div>

        <div style={{ position: "relative", width: "100%", transformStyle: "preserve-3d" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "-3.5cqw",
              borderRadius: "9cqw",
              background: "radial-gradient(closest-side, rgba(245,71,37,0.5), transparent 75%)",
              transform: "translateZ(8px)",
            }}
          />
          <div
            style={{
              position: "relative",
              borderRadius: "6cqw",
              padding: "1.1cqw",
              background: "linear-gradient(135deg,#F9A65A,#F54725 55%,#FF7A00)",
              boxShadow: "0 3cqw 5cqw rgba(0,0,0,0.55)",
              transform: "translateZ(48px)",
            }}
          >
            <div
              style={{
                borderRadius: "5cqw",
                background: "linear-gradient(160deg,#f3ece4,#E4D8CA)",
                padding: "5cqw 4cqw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/smashing-logo-mark.png"
                alt="Smashing Burger"
                draggable={false}
                style={{ width: "100%", height: "auto", display: "block", userSelect: "none" }}
              />
            </div>
          </div>
        </div>

        <div style={{ width: "100%", textAlign: "center", transform: "translateZ(32px)" }}>
          <div
            className="font-display"
            style={{
              color: "#E4D8CA",
              fontSize: "6.4cqw",
              lineHeight: 1.1,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 0.5cqw 1.2cqw rgba(0,0,0,0.6)",
            }}
          >
            {fullName}
          </div>
          <div
            style={{
              marginTop: "2cqw",
              display: "inline-block",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontWeight: 700,
              fontSize: "4.4cqw",
              letterSpacing: "0.22em",
              color: "#F9A65A",
              padding: "0.8cqw 3cqw",
              borderRadius: "99px",
              border: "1px solid rgba(249,166,90,0.55)",
              background: "rgba(26,14,11,0.55)",
            }}
          >
            #{memberCode}
          </div>
        </div>
      </div>
      <Sheen />
    </div>
  );
}

function Back({
  stamps,
  onRedeemClick,
  overlay,
  reduce,
}: {
  stamps: number;
  onRedeemClick?: () => void;
  overlay?: ReactNode;
  reduce: boolean;
}) {
  const unlocked = stamps >= STAMPS_FOR_REWARD;
  const shown = Math.min(stamps, STAMPS_FOR_REWARD);
  const remaining = Math.max(0, STAMPS_FOR_REWARD - stamps);
  const rollover = Math.max(0, stamps - STAMPS_FOR_REWARD);

  const rewardInner = (
    <>
      {unlocked && (
        <motion.div
          aria-hidden
          initial={false}
          animate={reduce ? { opacity: 0.6 } : { opacity: [0.35, 1, 0.35] }}
          transition={reduce ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: "-2cqw",
            borderRadius: "5cqw",
            background: "radial-gradient(closest-side, rgba(249,166,90,0.75), rgba(245,71,37,0.35) 70%, transparent)",
            willChange: "opacity",
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "3cqw",
          padding: "2.4cqw 3cqw",
          borderRadius: "3.6cqw",
          textAlign: "left",
          border: unlocked ? "1px solid #F9A65A" : "1px dashed rgba(228,216,202,0.35)",
          background: unlocked
            ? "linear-gradient(135deg,#7a1408,#F54725 45%,#F9A65A)"
            : "linear-gradient(135deg,rgba(74,42,35,0.9),rgba(45,25,20,0.9))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/helena-burger.png"
          alt=""
          draggable={false}
          style={{
            width: "17cqw",
            height: "22cqw",
            objectFit: "cover",
            borderRadius: "2.4cqw",
            flex: "none",
            filter: unlocked ? "none" : "saturate(0.55) brightness(0.8)",
            boxShadow: "0 1cqw 2cqw rgba(0,0,0,0.5)",
          }}
        />
        <div
          className="font-display"
          style={{
            fontSize: "3.7cqw",
            lineHeight: 1.25,
            letterSpacing: "0.03em",
            color: unlocked ? "#fff7ea" : "#E4D8CA",
            textShadow: unlocked ? "0 0.4cqw 1cqw rgba(60,10,0,0.7)" : undefined,
          }}
        >
          {unlocked
            ? "🔥 REWARD UNLOCKED: 1 FREE HELENA BURGER! TAP TO REDEEM AT COUNTER"
            : `FREE HELENA BURGER IN ${remaining} MORE ${remaining === 1 ? "STAMP" : "STAMPS"} — ON YOUR NEXT ORDER!`}
        </div>
      </div>
    </>
  );

  return (
    <div style={{ ...faceBase, transform: `rotateY(180deg) translateZ(${HALF}px)` }}>
      <div style={{ ...charred, position: "absolute", inset: 0 }} />
      <CheckerStrip position="top" />
      <CheckerStrip position="bottom" />

      <div
        style={{
          position: "absolute",
          left: "6cqw",
          right: "6cqw",
          top: `calc(${CELL} * 2 + 5cqw)`,
          bottom: `calc(${CELL} * 2 + 5cqw)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3cqw" }}>
          <div>
            <div className="font-display" style={{ ...METAL_TEXT, fontSize: "6cqw", lineHeight: 1.05 }}>
              STAMP CARD
            </div>
            <div style={{ fontSize: "3cqw", letterSpacing: "0.14em", color: "rgba(228,216,202,0.7)", marginTop: "0.8cqw" }}>
              COLLECT 10 · EAT FREE
            </div>
          </div>
          <div style={{ position: "relative", textAlign: "right" }}>
            <div
              className="font-display"
              style={{
                fontSize: "6.4cqw",
                lineHeight: 1,
                color: unlocked ? "#F9A65A" : "#E4D8CA",
                padding: "1.2cqw 3cqw",
                borderRadius: "99px",
                border: "1px solid rgba(249,166,90,0.55)",
                background: "rgba(26,14,11,0.6)",
              }}
              aria-label={`${shown} of ${STAMPS_FOR_REWARD} stamps`}
            >
              {shown}/{STAMPS_FOR_REWARD}
            </div>
            {rollover > 0 && (
              <div
                className="font-display"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "1cqw",
                  whiteSpace: "nowrap",
                  fontSize: "2.8cqw",
                  padding: "0.7cqw 2cqw",
                  borderRadius: "99px",
                  background: "linear-gradient(135deg,#F54725,#FF7A00)",
                  color: "#fff7ea",
                }}
              >
                +{rollover} rollover
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "2.4cqw",
            padding: "2.6cqw",
            borderRadius: "4cqw",
            background: "rgba(26,14,11,0.55)",
            boxShadow: "inset 0 0.4cqw 1.6cqw rgba(0,0,0,0.7), 0 1px 0 rgba(249,166,90,0.25)",
          }}
        >
          {Array.from({ length: STAMPS_FOR_REWARD }, (_, i) => {
            const earned = i < shown;
            return (
              <div
                key={i}
                data-slot={i}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: earned ? "none" : "1.5px dashed rgba(228,216,202,0.38)",
                  color: "rgba(228,216,202,0.45)",
                  fontFamily: "var(--font-display)",
                  fontSize: "4.2cqw",
                }}
              >
                {earned ? <FlameStampSVG className="h-full w-full" /> : i + 1}
              </div>
            );
          })}
        </div>

        {unlocked ? (
          <button
            type="button"
            data-no-flip
            onClick={(e) => {
              e.stopPropagation();
              onRedeemClick?.();
            }}
            style={{ position: "relative", display: "block", width: "100%", cursor: "pointer", background: "none", border: 0, padding: 0, font: "inherit" }}
            aria-label="Redeem free Helena Burger at the counter"
          >
            {rewardInner}
          </button>
        ) : (
          <div style={{ position: "relative" }}>{rewardInner}</div>
        )}
      </div>

      <Sheen />
      {overlay}
    </div>
  );
}

export function VipCard3D({
  fullName,
  memberCode,
  stamps,
  rotateX,
  rotateY,
  onRedeemClick,
  overlay,
  rootRef,
  className,
}: VipCard3DProps) {
  const reduce = !!useReducedMotion();
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
        ["--mx" as string]: 50,
        ["--my" as string]: 50,
      }}
    >
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <Edge />
        <Front fullName={fullName} memberCode={memberCode} />
        <Back stamps={stamps} onRedeemClick={onRedeemClick} overlay={overlay} reduce={reduce} />
      </motion.div>
    </div>
  );
}
