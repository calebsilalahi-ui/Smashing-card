# Smashing Burger — 3D VIP Loyalty Card + MokaPOS AI Receipt Scanner

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · motion · Supabase (Google OAuth + Postgres RLS) · Gemini / Anthropic Vision · Web Audio SFX · PWA Web Push.

## Program rules (enforced in 3 layers: `src/lib/moka.ts` → `/api/scan-receipt` → Postgres RPC)
- Every **Rp 50.000** in the final **Total** of ONE MokaPOS receipt = **1 stamp** (non-accumulating; Rp 85.000 = 1 stamp).
- Minimum Rp 50.000 · **Maximum 10 stamps per receipt** · receipt must be ≤ 7 days old (WIB) · each Receipt Number claimable once, globally.
- 10 stamps = 1 **FREE Helena Burger**, redeemed at the counter with a 4-digit **Staff PIN** (rotated daily). 5 wrong PINs → 15-minute lockout. Extra stamps roll over.
- On success, a live **3-minute emerald counter ticket** (ticking countdown + WIB seconds clock + moving flames) proves it isn't a screenshot.

## Presenter / Demo Mode (no keys needed)
Open `/?demo=true` (or `/card?demo=true`). Tap **⚡ Demo Mode** for the 4 triggers: Rp 110.000 (+2), Rp 500.000 (+10), duplicate #QGKTER5 block, reset. Demo Staff PIN: **4829**. Demo runs fully in the browser with the same validation code as production.

## Setup
1. `npm install`
2. **Supabase**: create a project → SQL Editor → run `supabase/migrations/001_init.sql` (or `supabase db push`).
   - Auth → Providers → **Google**: enable with your Google Cloud OAuth client.
   - Auth → URL Configuration: Site URL = your domain; Redirect URLs = `https://YOUR-DOMAIN/auth/callback**` and `http://localhost:3000/auth/callback**`.
3. Copy `.env.example` → `.env.local` and fill it. Generate VAPID keys with `npx web-push generate-vapid-keys`.
4. `npm run dev` → http://localhost:3000
5. **Vercel**: import the repo, add the same env vars (Production + Preview), deploy. `vercel.json` schedules `/api/push/daily-reminder` daily at 03:00 UTC (10:00 WIB); Vercel signs it with `CRON_SECRET`.
6. Change the default staff PIN immediately: `update store_settings set current_staff_pin = '1234' where id = 1;` (or let the cron rotate it and read it from `STORE_WEBHOOK_URL`).

## Architecture
| Concern | Where |
|---|---|
| Stamp math + receipt validation (shared by API & demo) | `src/lib/moka.ts` |
| Vision OCR (Gemini / Anthropic over fetch, strict JSON, Total-row only) | `src/lib/vision.ts`, `src/app/api/scan-receipt` |
| Atomic stamp award (row lock + `ON CONFLICT DO NOTHING`) | `claim_moka_receipt()` in `001_init.sql` |
| PIN redemption + lockout + rollover | `redeem_helena_burger()`, `src/app/api/redeem` |
| RPC access | `EXECUTE` granted to `service_role` only — members can't call them with their JWT |
| UU PDP consent log | landing gate → `/auth/callback?c=…` → `consent_logs`; `/api/consent` for later changes |
| Export / erase (UU PDP) | `GET` / `DELETE /api/account/delete` |
| Daily PIN rotation + push | `src/app/api/push/daily-reminder` |
| 3D card, stamp slam, impact frames | `src/components/card/*` |
| Procedural sound (no MP3s) | `src/lib/sound-fx.ts` |
| Demo engine | `src/lib/demo.ts`, `src/components/PresenterDrawer.tsx` |
