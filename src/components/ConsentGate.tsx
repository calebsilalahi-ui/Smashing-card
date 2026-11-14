"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth-client";
import { isSupabaseConfigured, POLICY_VERSION } from "@/lib/config";
import type { ConsentType } from "@/lib/types";

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function ConsentGate() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const onGoogle = async () => {
    if (!agreed || busy) return;
    setBusy(true);
    setError(null);
    try {
      try {
        if (push) window.localStorage.setItem("sb-push-intent", "1");
        else window.localStorage.removeItem("sb-push-intent");
      } catch {
        /* storage unavailable */
      }
      const consents: ConsentType[] = ["terms_privacy", ...(push ? (["push_reminders"] as const) : [])];
      await signInWithGoogle(consents, "/card");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg === "SUPABASE_NOT_CONFIGURED"
          ? "Google login isn't configured on this deployment yet. Try Demo Mode instead."
          : "Sign-in failed. Please try again. / Login gagal, silakan coba lagi."
      );
      setBusy(false);
    }
  };

  const openDemo = () => router.push("/card?demo=true");

  return (
    <section aria-labelledby="sb-consent-title" className="rounded-3xl border border-cream/15 bg-espresso p-4 shadow-xl shadow-black/40">
      <h2 id="sb-consent-title" className="font-display text-lg text-cream-soft">
        Join the VIP club
      </h2>
      <p className="mt-1 text-xs text-cream/65">Persetujuan pelindungan data pribadi (UU PDP No. 27/2022)</p>

      <div className="mt-4 space-y-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 accent-flame"
            aria-required="true"
          />
          <span className="text-sm leading-relaxed text-cream/90">
            <span className="mr-1 rounded bg-flame/20 px-1.5 py-0.5 text-xs font-bold uppercase text-gold">Required</span>
            I agree to the{" "}
            <a href="/terms" className="font-semibold text-gold underline underline-offset-2">Terms &amp; Conditions</a> and{" "}
            <a href="/privacy" className="font-semibold text-gold underline underline-offset-2">Privacy Policy</a>, including
            processing of my MokaPOS receipt photos and loyalty activity.
            <span className="mt-1 block text-cream/65">
              Saya menyetujui{" "}
              <a href="/terms" className="underline underline-offset-2">Syarat &amp; Ketentuan</a> dan{" "}
              <a href="/privacy" className="underline underline-offset-2">Kebijakan Privasi</a>, termasuk pemrosesan foto
              struk MokaPOS dan aktivitas loyalitas saya.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={push}
            onChange={(e) => setPush(e.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 accent-flame"
          />
          <span className="text-sm leading-relaxed text-cream/90">
            <span className="mr-1 rounded bg-cream/15 px-1 py-0.5 text-xs font-bold uppercase text-cream/80">Optional</span>
            Send me daily stamp reminder push notifications.
            <span className="mt-1 block text-cream/65">Kirimi saya notifikasi pengingat stempel harian.</span>
          </span>
        </label>
      </div>

      {!configured && (
        <div role="note" className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-3 text-xs leading-relaxed text-cream">
          Google login isn&apos;t configured on this deployment yet &mdash; explore the full experience in Demo Mode.
        </div>
      )}

      <button
        type="button"
        onClick={onGoogle}
        disabled={!agreed || busy || !configured}
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-white px-4 text-sm font-bold text-neutral-800 shadow transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <GoogleG />}
        Continue with Google
      </button>

      {!configured && (
        <button
          type="button"
          onClick={openDemo}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-flame to-ember px-4 text-sm font-extrabold text-espresso-deep shadow-lg shadow-flame/30 active:scale-[0.98]"
        >
          <Zap size={18} aria-hidden /> Open Demo Mode
        </button>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-flame/15 p-2.5 text-xs text-cream-soft">
          {error}
        </p>
      )}

      <p className="mt-3 text-center text-xs text-cream/70">Policy version {POLICY_VERSION}</p>
    </section>
  );
}
