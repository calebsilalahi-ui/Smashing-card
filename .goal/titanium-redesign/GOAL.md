# GOAL — Black Titanium redesign (Smashing Burger VIP)

## Goal
The app feels like a minimalist premium product built around a brushed black-titanium VIP card, and every stamp lands with a satisfying, multi-sensory moment, without losing any working behaviour.

Context: the client demo for Smashing Burger (a separate entity from WithUs). The user chose option 1 (black titanium) and requires the ORIGINAL full-colour logo (no monochrome/recoloured version).

## Design contract (decided)
- Tokens in `src/app/globals.css` (@theme): ink #0B0A09 bg, surface #151311, surface-2 #1D1A18, line = fg/10%, fg #F2EEE9, fg-2 #A8A19A, fg-3 #8C857E, titanium ti-hi/ti/ti-lo. Single accent = flame #F54725 (stamps, reward state, card edge line). Fonts: Inter (all UI; `.font-display` = Inter 650, tight tracking) + JetBrains Mono (member ID, numbers).
- Primary CTA = solid fg (#F2EEE9) with ink text. No gradient buttons, no checkerboard in app chrome.
- Card: brushed titanium, original logo `/images/smashing-logo-mark.png` as an enamel inlay on a cream plaque, thin flame edge line.

## Acceptance criteria (each must be verified independently)
1. **Build**: `npm run build` exits 0 with no TypeScript errors.
2. **Behaviour**: `scratchpad/e2e/smoke.js` against `next start -p 3100` prints PASS for all 9 steps and `ERRORS []` (no console/page errors).
3. **Accessibility**: `scratchpad/e2e/audit.js` reports 0 axe violations in all 6 states.
4. **Metal card**: VipCard3D front and back render a brushed-metal surface (fine directional brushing texture + specular highlight whose position moves with tilt/pointer). Verified by code inspection AND two screenshots at different tilts showing the highlight moved.
5. **Original logo**: the card front shows `/images/smashing-logo-mark.png` unmodified in colour (no CSS filter/grayscale/mask/mix-blend on that img); `smashing-logo-mono.png` does not exist.
6. **Minimalism**: outside `src/components/card/` and `src/components/LiveCounterTicket.tsx`, `grep -rn "bg-gradient-to\|checker-strip" src/app src/components` returns 0 hits; the Archivo Black font is no longer loaded.
7. **Satisfying stamp**: each earned stamp triggers, in order: an anticipation glow on the target slot → a spring slam with overshoot → a localized impact flash plus an ink ripple ring at the slot → a light sweep across the metal → a counter increment. Each stamp plays a metallic clack whose pitch rises per stamp index, and `navigator.vibrate` is called (feature-guarded). Reaching 10 plays a completion chime plus a reward reveal. Verified by code inspection plus a mid-sequence screenshot showing the ripple/flash.
8. **Reduced motion**: with `prefers-reduced-motion: reduce` emulated, the smoke test still passes and the stamp sequence skips the slam, shake and sweep (code inspection).
9. **Spec copy preserved**: "VIP LOYALTY CARD", "#SB-", "FREE HELENA BURGER IN", "REWARD UNLOCKED", "SCAN MOKAPOS RECEIPT", "RING UP: VIP LOYALTY — FREE HELENA BURGER", a 03:00 countdown, "Maksimal 10 stempel per struk" and "Maximum 10 stamps per receipt" all still render.
10. **Mobile**: at 360px there is no horizontal scroll on /, /card?demo=true, /privacy and /terms, and no interface text below 12px (the decorative SampleMokaReceipt is exempt).

## Out of scope
Backend/API/SQL changes, new features, changes to legal copy content.

## Kill switches (stop and ask)
- A change that requires altering or recolouring the original logo.
- A criterion that fails 3 times.

## Skills selected
anthropics-frontend-design, emilkowalski-apple-design and emil-design-eng (premium restraint), emilkowalski-animate and choreograph (stamp moment), animation-performance (60fps card), mobile-native, obra-verification-before-completion; an independent verifier subagent.

## Iteration budget
3 verify loops.
