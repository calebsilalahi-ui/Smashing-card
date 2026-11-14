"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Embossed "Fiery Flame Burger Ink Stamp" seal. Pure SVG, static filters (no per-frame filter animation). */
export function FlameStampSVG({ className, animateIn }: { className?: string; animateIn?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduce = useReducedMotion();
  const id = (n: string) => `${n}-${uid}`;

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="Smashing Burger stamp"
      initial={animateIn && !reduce ? { scale: 0.7, opacity: 0, rotate: -12 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={id("flame")} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#F54725" />
          <stop offset="0.55" stopColor="#FF7A00" />
          <stop offset="1" stopColor="#F9A65A" />
        </linearGradient>
        <linearGradient id={id("ink")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7A00" />
          <stop offset="0.5" stopColor="#F54725" />
          <stop offset="1" stopColor="#C8260F" />
        </linearGradient>
        <radialGradient id={id("disc")} cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#F54725" stopOpacity="0.32" />
          <stop offset="1" stopColor="#2D1914" stopOpacity="0.6" />
        </radialGradient>
        <path id={id("ring")} d="M100 100 m-68 0 a68 68 0 1 1 136 0 a68 68 0 1 1 -136 0" />
        {/* Ink roughness: displaced edge + speckled erosion */}
        <filter id={id("rough")} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="3" seed="3" result="n2" />
          <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.75" result="holes" />
          <feComposite in="d" in2="holes" operator="in" />
        </filter>
        {/* Emboss: light from top-left over the alpha shape */}
        <filter id={id("emboss")} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="b" />
          <feSpecularLighting in="b" surfaceScale="3" specularConstant="0.9" specularExponent="22" lightingColor="#FFE2B8" result="spec">
            <feDistantLight azimuth="225" elevation="48" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="specIn" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${id("emboss")})`}>
        <g filter={`url(#${id("rough")})`}>
          {/* seal disc + rings */}
          <circle cx="100" cy="100" r="92" fill={`url(#${id("disc")})`} />
          <circle cx="100" cy="100" r="92" fill="none" stroke={`url(#${id("ink")})`} strokeWidth="7" />
          <circle cx="100" cy="100" r="82" fill="none" stroke="#FF7A00" strokeWidth="1.8" />
          <circle cx="100" cy="100" r="56" fill="none" stroke="#F9A65A" strokeWidth="1.4" strokeDasharray="2 4" />

          {/* ring text */}
          <text fontFamily="'Archivo Black', Impact, 'Arial Black', sans-serif" fontSize="14.5" letterSpacing="3.2" fill="#F9A65A">
            <textPath href={`#${id("ring")}`} startOffset="0">
              SMASHING ★ BURGER ★ SMASHING ★ BURGER ★
            </textPath>
          </text>

          {/* flames */}
          <path
            d="M100 36 C108 50 120 54 118 70 C116 80 108 82 106 76 C112 90 104 98 100 98 C96 98 88 92 94 78 C86 84 80 78 84 66 C88 54 98 50 100 36 Z"
            fill={`url(#${id("flame")})`}
          />
          <path
            d="M74 62 C80 70 86 72 84 82 C83 90 76 92 74 88 C70 94 64 90 66 82 C68 74 72 70 74 62 Z"
            fill={`url(#${id("flame")})`}
            opacity="0.9"
          />
          <path
            d="M128 60 C132 70 138 72 136 82 C135 90 128 92 126 88 C122 94 116 90 118 82 C120 74 126 70 128 60 Z"
            fill={`url(#${id("flame")})`}
            opacity="0.9"
          />
          <path d="M100 66 C103 74 108 76 106 84 C105 90 100 92 98 88 C95 84 97 76 100 66 Z" fill="#FFE2B8" opacity="0.85" />

          {/* burger silhouette */}
          <path d="M58 118 C58 100 76 94 100 94 C124 94 142 100 142 118 Z" fill="#F9A65A" />
          <g fill="#2D1914" opacity="0.55">
            <ellipse cx="82" cy="106" rx="3" ry="1.6" />
            <ellipse cx="100" cy="102" rx="3" ry="1.6" />
            <ellipse cx="118" cy="106" rx="3" ry="1.6" />
            <ellipse cx="108" cy="111" rx="2.6" ry="1.4" />
            <ellipse cx="90" cy="112" rx="2.6" ry="1.4" />
          </g>
          <path d="M56 121 L144 121 L136 129 L128 123 L118 131 L108 123 L98 131 L88 123 L78 131 L68 123 L60 129 Z" fill="#FFB020" />
          <rect x="54" y="129" width="92" height="11" rx="5.5" fill="#2D1914" />
          <rect x="54" y="129" width="92" height="11" rx="5.5" fill="none" stroke="#FF7A00" strokeWidth="1.4" />
          <path d="M58 142 L142 142 C142 152 134 156 122 156 L78 156 C66 156 58 152 58 142 Z" fill="#F9A65A" />
        </g>
      </g>
    </motion.svg>
  );
}
