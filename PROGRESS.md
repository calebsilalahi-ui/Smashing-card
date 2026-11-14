# PROGRESS — Smashing Burger VIP Card

## Foundation
- [x] package.json + deps (Next 16, React 19, TS 5, Tailwind v4, motion, Supabase, web-push)
- [x] tsconfig, next.config.ts (security headers), postcss, vercel.json cron, .gitignore
- [x] globals.css brand tokens + .checker-strip, layout.tsx
- [x] public/images (logo, logo-mark, helena-burger), public/icons
- [x] src/lib/types.ts, config.ts, moka.ts (MAX_STAMPS_PER_RECEIPT = 10 cap)

## Opus — architecture & backend
- [x] src/lib/demo.ts, api-client.ts, auth-client.ts
- [x] src/lib/supabase/{client,server,admin}.ts, src/proxy.ts
- [x] supabase/migrations/001_init.sql (6 tables, RLS, SB-XXXX trigger, claim/redeem/rotate RPCs, 1..10 stamp CHECK)
- [x] /auth/callback (consent_logs), /api/consent, /api/me
- [x] /api/scan-receipt (+ src/lib/vision.ts), /api/redeem (+ webhook)
- [x] /api/account/delete (GET export / DELETE erase)
- [x] /api/push/subscribe, /api/push/daily-reminder
- [x] .env.example, README.md

## Sonnet workers
- [x] A: src/components/card/* + src/lib/sound-fx.ts
- [x] B1: landing, ConsentGate, WebViewGuard, CookieConsentBanner, SW register, PushToggle, push-client, manifest, sw.js
- [x] B2: /card, ReceiptScannerModal, image-compress, SampleMokaReceipt, RedeemModal, LiveCounterTicket, PresenterDrawer, AccountActions, SoundToggle
- [x] C: /privacy, /terms (ID + EN), LegalShell

## Integration & verification
- [x] Contract integration (A ↔ B1/B2)
- [x] Scanner tip copy states "Maksimal 10 stempel per struk"
- [x] `npm run build` clean
- [x] Playwright smoke: /?demo=true → +2, +10, duplicate block, PIN 4829 → live ticket
- [x] Committed & pushed

## Notes
- r.jina.ai is blocked by the egress proxy; React Bits sources fetched from GitHub raw instead.
- Integration fixes: web-push named imports (Turbopack ESM), cookie banner clears `sb-sfx-muted`, live ticket z-index above toasts.
- Smoke test (360px, prod build, no keys): redirect, reset, +2, +10 unlock, duplicate block, PIN 4829 → ticking live ticket, /, /privacy, /terms — all PASS, 0 console errors.
