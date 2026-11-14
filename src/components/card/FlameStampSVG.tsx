"use client";

import { useId } from "react";

/**
 * Polished molten-flame disc with a single engraved flame glyph.
 * Static SVG (gradients only, nothing animated inside), safe to render ten times.
 */
export function FlameStampSVG({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n: string) => `${n}-${uid}`;
  const flame =
    "M50 22 C57 33 69 40 69 55 C69 67 61 77 50 77 C39 77 31 67 31 55 C31 47 36 42 40 37 C41 43 44 47 47 48 C46 40 46 31 50 22 Z";

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd9c7" />
          <stop offset="0.45" stopColor="#c9482c" />
          <stop offset="1" stopColor="#5a1608" />
        </linearGradient>
        <radialGradient id={id("molten")} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#ff8a1f" />
          <stop offset="0.5" stopColor="#f54725" />
          <stop offset="1" stopColor="#a82a10" />
        </radialGradient>
        <radialGradient id={id("spec")} cx="0.32" cy="0.2" r="0.45">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#${id("rim")})`} />
      <circle cx="50" cy="50" r="44" fill={`url(#${id("molten")})`} />
      <ellipse cx="38" cy="26" rx="22" ry="13" fill={`url(#${id("spec")})`} />
      {/* engraved glyph: light lip below, dark cut above */}
      <path d={flame} transform="translate(0 1.2)" fill="#ffd9b8" fillOpacity="0.35" />
      <path d={flame} fill="#3a0f05" fillOpacity="0.82" />
    </svg>
  );
}
