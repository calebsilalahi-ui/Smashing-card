"use client";

import { AlertTriangle, CheckCircle2, Gift, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AccountActions } from "@/components/AccountActions";
import { CardStage, type ImpactRequest } from "@/components/card/CardStage";
import { PresenterDrawer } from "@/components/PresenterDrawer";
import { PushToggle } from "@/components/PushToggle";
import { ReceiptScannerModal } from "@/components/ReceiptScannerModal";
import { RedeemModal } from "@/components/RedeemModal";
import { SoundToggle } from "@/components/SoundToggle";
import { getMe, scanReceipt } from "@/lib/api-client";
import {
  type DemoReceipt,
  demoDuplicateTest,
  demoMember,
  demoReset,
  demoScan,
  isDemoRequested,
  loadDemoState,
  nextFeastDemoReceipt,
  nextRegularDemoReceipt,
} from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/config";
import { formatIdr, STAMPS_FOR_REWARD } from "@/lib/moka";
import { sfx } from "@/lib/sound-fx";
import type { Member, RedeemSuccess, ScanResponse, ScanSuccess } from "@/lib/types";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function CardDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const searchKey = search.toString();

  const [demo, setDemo] = useState<boolean | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [impact, setImpact] = useState<ImpactRequest | null>(null);
  const pendingRef = useRef<Map<string, ScanSuccess>>(new Map());

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [simReceipt, setSimReceipt] = useState<DemoReceipt | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);

  // Resolve mode + member.
  useEffect(() => {
    let cancelled = false;
    const isDemo = isDemoRequested(searchKey) || !isSupabaseConfigured();
    setDemo(isDemo);
    if (isDemo) {
      setMember(demoMember(loadDemoState()));
      return;
    }
    getMe().then((m) => {
      if (cancelled) return;
      if (!m) router.replace("/");
      else setMember(m);
    });
    return () => {
      cancelled = true;
    };
  }, [searchKey, router]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleResult = useCallback((res: ScanResponse) => {
    setScannerOpen(false);
    setSimReceipt(null);
    setScanBusy(false);
    if (res.ok) {
      sfx.success();
      const id = newId();
      pendingRef.current.set(id, res);
      setImpact({ id, fromStamps: res.previousStamps, earned: res.stampsEarned });
    } else {
      sfx.error();
      setRejection(res.message);
    }
  }, []);

  const onImpactComplete = useCallback((id: string) => {
    const res = pendingRef.current.get(id);
    pendingRef.current.delete(id);
    setImpact((cur) => (cur && cur.id === id ? null : cur));
    if (!res) return;
    setMember((m) => (m ? { ...m, stamps: res.stamps } : m));
    setToast(`+${res.stampsEarned} ${res.stampsEarned === 1 ? "stamp" : "stamps"} from Receipt #${res.receiptNumber} (${formatIdr(res.totalIdr)})`);
  }, []);

  const onCapture = useCallback(
    async (dataUrl: string) => {
      setScanBusy(true);
      try {
        if (demo) {
          await new Promise((r) => window.setTimeout(r, 900));
          handleResult(demoScan(nextRegularDemoReceipt()));
        } else {
          handleResult(await scanReceipt(dataUrl));
        }
      } finally {
        setScanBusy(false);
      }
    },
    [demo, handleResult],
  );

  const startSim = useCallback((r: DemoReceipt) => {
    setDrawerOpen(false);
    setSimReceipt(r);
    setScannerOpen(true);
  }, []);

  const onSimulationComplete = useCallback(() => {
    if (!simReceipt) return;
    handleResult(demoScan(simReceipt));
  }, [simReceipt, handleResult]);

  const onDuplicate = useCallback(() => {
    setDrawerOpen(false);
    handleResult(demoDuplicateTest());
  }, [handleResult]);

  const onReset = useCallback(() => {
    const s = demoReset();
    setDrawerOpen(false);
    setFlipped(false);
    setImpact(null);
    pendingRef.current.clear();
    setMember(demoMember(s));
    setToast("Card reset to 0/10");
  }, []);

  const onRedeemed = useCallback((res: RedeemSuccess) => {
    setMember((m) => (m ? { ...m, stamps: res.stamps } : m));
  }, []);

  if (!member || demo === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-espresso text-cream">
        <p className="font-display animate-pulse text-gold">Loading your card…</p>
      </main>
    );
  }

  const stamps = member.stamps;
  const unlocked = stamps >= STAMPS_FOR_REWARD;
  const remaining = Math.max(0, STAMPS_FOR_REWARD - stamps);
  const code = member.memberCode.replace(/^#/, "");

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 overflow-x-hidden bg-espresso px-4 pb-28 pt-4 text-cream">
      {demo && (
        <div className="-mx-4 -mt-4 bg-flame px-4 py-1 text-center font-display text-[11px] tracking-[0.25em] text-white">
          DEMO MODE
        </div>
      )}

      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/smashing-logo-mark.png" alt="Smashing Burger" className="h-8 w-8 object-contain" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg leading-tight text-cream">{member.fullName}</h1>
          <p className="text-xs text-gold">#{code}</p>
        </div>
        <SoundToggle />
      </header>

      <CardStage
        fullName={member.fullName}
        memberCode={code}
        stamps={stamps}
        flipped={flipped}
        onFlippedChange={setFlipped}
        impact={impact}
        onImpactComplete={onImpactComplete}
        onRedeemClick={unlocked ? () => setRedeemOpen(true) : undefined}
      />

      <p className="text-center text-sm text-cream/80" aria-live="polite">
        {unlocked ? (
          <span className="font-semibold text-gold">Reward unlocked — {stamps}/{STAMPS_FOR_REWARD} stamps</span>
        ) : (
          <>
            <span className="font-semibold text-gold">{stamps}/{STAMPS_FOR_REWARD}</span> stamps · {remaining} more for a free Helena Burger
          </>
        )}
      </p>

      <button
        type="button"
        data-testid="scan-cta"
        onClick={() => {
          sfx.unlock();
          sfx.click();
          setSimReceipt(null);
          setScannerOpen(true);
        }}
        className="w-full rounded-2xl bg-gradient-to-r from-flame to-ember px-4 py-4 font-display text-base text-white shadow-[0_10px_30px_rgba(245,71,37,.35)] transition active:scale-[0.98]"
      >
        📸 SCAN MOKAPOS RECEIPT
      </button>

      {unlocked && (
        <motion.button
          type="button"
          data-testid="redeem-button"
          onClick={() => {
            sfx.click();
            setRedeemOpen(true);
          }}
          animate={{ boxShadow: ["0 0 12px rgba(249,166,90,.4)", "0 0 34px rgba(255,122,0,.9)", "0 0 12px rgba(249,166,90,.4)"] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-ember px-4 py-4 font-display text-base text-espresso-deep transition active:scale-[0.98]"
        >
          <Gift size={20} aria-hidden /> REDEEM FREE HELENA BURGER
        </motion.button>
      )}

      <PushToggle demo={demo} />
      <AccountActions demo={demo} />

      <footer className="flex justify-center gap-4 text-xs text-cream/60">
        <Link href="/privacy" className="underline">Privacy</Link>
        <Link href="/terms" className="underline">Terms</Link>
      </footer>

      {/* Demo pill */}
      <button
        type="button"
        data-testid="presenter-pill"
        onClick={() => (demo ? setDrawerOpen((o) => !o) : setSwitchOpen(true))}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-gold/50 bg-espresso-deep/95 px-4 py-2.5 text-sm font-bold text-gold shadow-lg backdrop-blur transition active:scale-95"
      >
        <Zap size={16} aria-hidden /> Demo Mode
      </button>

      <PresenterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSimulateRegular={() => startSim(nextRegularDemoReceipt())}
        onSimulateFeast={() => startSim(nextFeastDemoReceipt())}
        onDuplicateTest={onDuplicate}
        onReset={onReset}
        busy={scanBusy || Boolean(impact)}
      />

      <ReceiptScannerModal
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          setSimReceipt(null);
        }}
        onCapture={onCapture}
        busy={scanBusy}
        simulatedReceipt={simReceipt}
        onSimulationComplete={onSimulationComplete}
      />

      <RedeemModal
        open={redeemOpen}
        onClose={() => setRedeemOpen(false)}
        demo={demo}
        member={member}
        onRedeemed={onRedeemed}
      />

      {/* Success toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            role="status"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="fixed inset-x-4 top-4 z-[110] mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-emerald-live px-4 py-3 text-sm font-semibold text-white shadow-xl"
          >
            <CheckCircle2 size={20} className="shrink-0" aria-hidden />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection alert */}
      {rejection && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4">
          <div
            data-testid="scan-error"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="scan-error-msg"
            className="w-full max-w-sm rounded-2xl border-2 border-red-500 bg-espresso-deep p-5 text-center"
          >
            <AlertTriangle className="mx-auto text-red-500" size={40} aria-hidden />
            <p className="mt-2 font-display text-lg text-red-400">Receipt rejected</p>
            <p id="scan-error-msg" className="mt-2 text-sm text-cream">{rejection}</p>
            <button
              type="button"
              onClick={() => setRejection(null)}
              className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Live -> demo switch explainer */}
      {switchOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="switch-title" className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gold/40 bg-espresso-deep p-5">
            <div className="flex items-start justify-between">
              <h2 id="switch-title" className="font-display text-lg text-gold">⚡ Demo Mode</h2>
              <button type="button" aria-label="Close" onClick={() => setSwitchOpen(false)} className="rounded-full p-1 text-cream/70">
                <X size={18} aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-sm text-cream/85">
              Demo Mode switches to a local sandbox with a fake card. It never touches your real stamps, receipts, or account.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setSwitchOpen(false)} className="w-full rounded-xl border border-cream/20 px-4 py-3 text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => window.location.assign("/card?demo=true")}
                className="w-full rounded-xl bg-gradient-to-r from-flame to-ember px-4 py-3 text-sm font-bold text-white"
              >
                Open sandbox
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CardPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-espresso text-cream">
          <p className="font-display animate-pulse text-gold">Loading your card…</p>
        </main>
      }
    >
      <CardDashboard />
    </Suspense>
  );
}
