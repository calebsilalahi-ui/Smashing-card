"use client";
import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift, Layers, Receipt, Zap } from "lucide-react";
import { CardStage } from "@/components/card/CardStage";
import { ConsentGate } from "@/components/ConsentGate";
import { WebViewGuard } from "@/components/WebViewGuard";
import { isDemoRequested } from "@/lib/demo";
import { openCookieSettings } from "@/components/CookieConsentBanner";

const STEPS = [
  { icon: Receipt, text: "Rp 50.000 = 1 stamp", sub: "Setiap Rp 50.000 dalam satu struk" },
  { icon: Layers, text: "Max 10 stamps per receipt", sub: "Maksimal 10 stempel per struk" },
  { icon: Gift, text: "10 stamps = free Helena Burger", sub: "10 stempel = Helena Burger gratis" },
];

function Landing() {
  const router = useRouter();
  const params = useSearchParams();
  const [flipped, setFlipped] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    // Persist/clear the tab's demo flag, but only an explicit ?demo=true link redirects —
    // otherwise a presenter could never return to the landing page / consent gate in this tab.
    const active = isDemoRequested(params);
    const explicit = ["true", "1"].includes(params.get("demo") ?? "");
    if (active && explicit) {
      setDemo(true);
      router.replace("/card?demo=true");
    }
  }, [params, router]);

  if (demo) return <div className="min-h-dvh bg-ink" aria-busy="true" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-10 overflow-x-hidden px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <WebViewGuard />

      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E4D8CA]">
          <Image src="/images/smashing-logo-mark.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" priority />
        </span>
        <span className="font-display text-base text-fg">Smashing Burger</span>
      </header>

      <section>
        <h1 className="font-display text-balance text-[2rem] leading-[1.08] text-fg">
          Your VIP card. Every smash counts.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fg-2">
          Kartu loyalitas digital Anda. Kumpulkan stempel, nikmati Helena Burger gratis.
        </p>
      </section>

      <section aria-label="Card preview" className="flex justify-center">
        <CardStage preview fullName="Your Name" memberCode="SB-0000" stamps={3} flipped={flipped} onFlippedChange={setFlipped} />
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="text-sm font-medium text-fg-2">How it works</h2>
        <ol className="mt-3 divide-y divide-line">
          {STEPS.map((s) => (
            <li key={s.text} className="flex items-center gap-3 py-3">
              <s.icon size={18} className="shrink-0 text-fg-2" aria-hidden />
              <span className="min-w-0 text-[15px] text-fg">
                {s.text}
                <span className="block text-sm text-fg-3">{s.sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <ConsentGate />

      <footer className="mt-auto space-y-1 text-center text-sm text-fg-2">
        <nav className="flex flex-wrap items-center justify-center gap-x-5">
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-fg">Privacy</Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-fg">Terms</Link>
          <button type="button" onClick={openCookieSettings} className="min-h-11 hover:text-fg">Cookies</button>
          <Link href="/card?demo=true" className="inline-flex min-h-11 items-center gap-1.5 text-fg hover:text-fg">
            <Zap size={14} aria-hidden /> Try Demo
          </Link>
        </nav>
        <p className="text-fg-3">&copy; Smashing Burger</p>
      </footer>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ink" />}>
      <Landing />
    </Suspense>
  );
}
