"use client";
import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Gift, Receipt, Zap } from "lucide-react";
import { CardStage } from "@/components/card/CardStage";
import { ConsentGate } from "@/components/ConsentGate";
import { WebViewGuard } from "@/components/WebViewGuard";
import { isDemoRequested } from "@/lib/demo";
import { openCookieSettings } from "@/components/CookieConsentBanner";

const STEPS = [
  { icon: Camera, title: "Scan your MokaPOS receipt", sub: "Foto struk MokaPOS Anda" },
  { icon: Receipt, title: "Every Rp 50.000 in one receipt = 1 stamp (max 10 per receipt)", sub: "Setiap Rp 50.000 dalam satu struk = 1 stempel" },
  { icon: Gift, title: "10 stamps = FREE Helena Burger", sub: "10 stempel = Helena Burger GRATIS" },
];

function Landing() {
  const router = useRouter();
  const params = useSearchParams();
  const [flipped, setFlipped] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    if (isDemoRequested(params)) {
      setDemo(true);
      router.replace("/card?demo=true");
    }
  }, [params, router]);

  if (demo) return <div className="min-h-dvh bg-espresso-deep" aria-busy="true" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
      <WebViewGuard />

      <header className="flex items-center gap-3">
        <Image src="/images/smashing-logo.png" alt="Smashing Burger" width={44} height={44} className="rounded-xl" priority />
        <span className="font-display text-sm text-cream-soft">SMASHING BURGER</span>
      </header>

      <section className="text-center">
        <h1 className="font-display text-3xl leading-tight text-cream-soft">
          Your <span className="text-flame">VIP card</span>.<br />Every smash counts.
        </h1>
        <p className="mt-3 text-sm text-cream/75">
          Kartu loyalitas digital Anda. Kumpulkan stempel, nikmati Helena Burger gratis.
        </p>
      </section>

      <section aria-label="Card preview" className="flex justify-center">
        <CardStage preview fullName="Your Name" memberCode="SB-0000" stamps={3} flipped={flipped} onFlippedChange={setFlipped} />
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="font-display text-lg text-cream-soft">How it works</h2>
        <ol className="mt-3 space-y-2.5">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-espresso p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flame text-white">
                <s.icon size={20} aria-hidden />
              </span>
              <span className="text-sm text-cream">
                <span className="font-semibold">{s.title}</span>
                <span className="block text-xs text-cream/60">{s.sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <ConsentGate />

      <footer className="mt-auto space-y-3 text-center text-xs text-cream/60">
        <div className="checker-strip" aria-hidden />
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="min-h-11 py-3 underline underline-offset-2">Privacy</Link>
          <Link href="/terms" className="min-h-11 py-3 underline underline-offset-2">Terms</Link>
          <button type="button" onClick={openCookieSettings} className="min-h-11 underline underline-offset-2">Cookies</button>
          <Link href="/card?demo=true" className="inline-flex min-h-11 items-center gap-1 font-bold text-gold">
            <Zap size={14} aria-hidden /> Try Demo
          </Link>
        </nav>
        <p>&copy; Smashing Burger</p>
      </footer>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-espresso-deep" />}>
      <Landing />
    </Suspense>
  );
}
