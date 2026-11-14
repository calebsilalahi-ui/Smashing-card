"use client";

import { AlertTriangle, Camera, CheckCircle2, Gift, X, Zap } from "lucide-react";
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
      <main className="grid min-h-dvh place-items-center bg-ink text-fg">
        <p className="font-display animate-pulse text-fg-2">Loading your card…</p>
      </main>
    );
  }

  const stamps = member.stamps;
  const unlocked = stamps >= STAMPS_FOR_REWARD;
  const remaining = Math.max(0, STAMPS_FOR_REWARD - stamps);
  const code = member.memberCode.replace(/^#/, "");

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 overflow-x-hidden bg-ink px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-fg">
      {demo && (
        <p className="inline-flex items-center gap-2 self-center rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs tracking-[0.18em] text-fg-2">
          <span className="h-1.5 w-1.5 rounded-full bg-flame" aria-hidden /> DEMO MODE
        </p>
      )}

      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E4D8CA]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/smashing-logo-mark.png" alt="Smashing Burger" className="h-8 w-8 object-contain" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg leading-tight text-fg">{member.fullName}</h1>
          <p className="font-mono text-sm text-fg-2">#{code}</p>
        </div>
        <button
          type="button"
          data-testid="presenter-pill"
          onClick={() => (demo ? setDrawerOpen((o) => !o) : setSwitchOpen(true))}
          aria-expanded={demo ? drawerOpen : undefined}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3.5 text-sm font-medium text-fg transition-transform duration-150 ease-out active:scale-95"
        >
          <Zap size={16} aria-hidden /> <span className="max-[380px]:sr-only">Demo</span>
        </button>
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

      <p className="text-center text-[15px] text-fg-2" aria-live="polite">
        {unlocked ? (
          <span className="inline-flex items-center gap-2 font-medium text-fg">
            <span className="h-1.5 w-1.5 rounded-full bg-flame" aria-hidden />
            Reward unlocked — {stamps}/{STAMPS_FOR_REWARD} stamps
          </span>
        ) : (
          <>
            <span className="font-mono font-medium text-fg">{stamps}/{STAMPS_FOR_REWARD}</span> stamps · {remaining} more for a free Helena Burger
          </>
        )}
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          data-testid="scan-cta"
          onClick={() => {
            sfx.unlock();
            sfx.click();
            setSimReceipt(null);
            setScannerOpen(true);
          }}
          className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-fg px-4 font-display text-[15px] tracking-wide text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <Camera size={20} aria-hidden /> SCAN MOKAPOS RECEIPT
        </button>

        {unlocked && (
          <motion.button
            type="button"
            data-testid="redeem-button"
            onClick={() => {
              sfx.click();
              setRedeemOpen(true);
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            whileTap={{ scale: 0.97 }}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-flame px-4 font-display text-[15px] text-ink"
          >
            <Gift size={20} aria-hidden /> Redeem free Helena Burger
          </motion.button>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <PushToggle demo={demo} />
        <AccountActions demo={demo} />
      </div>

      <footer className="flex justify-center gap-4 text-sm text-fg-2">
        <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 hover:text-fg">Privacy</Link>
        <Link href="/terms" className="inline-flex min-h-11 items-center px-2 hover:text-fg">Terms</Link>
      </footer>

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
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[65] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2.5 rounded-full border border-line bg-surface-2 px-4 py-3 text-sm text-fg shadow-xl shadow-black/50"
          >
            <CheckCircle2 size={18} className="shrink-0 text-flame" aria-hidden />
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
            className="w-full max-w-sm rounded-[20px] border border-line bg-surface p-6 text-center"
          >
            <AlertTriangle className="mx-auto text-flame" size={32} aria-hidden />
            <p className="mt-3 font-display text-lg text-fg">Receipt rejected</p>
            <p id="scan-error-msg" className="mt-2 text-sm leading-relaxed text-fg-2">{rejection}</p>
            <button
              type="button"
              onClick={() => setRejection(null)}
              className="mt-5 h-12 w-full rounded-full bg-fg px-4 text-[15px] font-semibold text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Live -> demo switch explainer */}
      {switchOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="switch-title" className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-[20px] border border-line bg-surface p-6">
            <div className="flex items-start justify-between">
              <h2 id="switch-title" className="flex items-center gap-2 font-display text-lg text-fg"><Zap size={18} className="text-flame" aria-hidden /> Demo Mode</h2>
              <button type="button" aria-label="Close" onClick={() => setSwitchOpen(false)} className="-mr-2 -mt-2 grid h-11 w-11 place-items-center rounded-full text-fg-2">
                <X size={18} aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-fg-2">
              Demo Mode switches to a local sandbox with a fake card. It never touches your real stamps, receipts, or account.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setSwitchOpen(false)} className="h-12 w-full rounded-full border border-line bg-surface-2 px-4 text-[15px] font-semibold text-fg">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => window.location.assign("/card?demo=true")}
                className="h-12 w-full rounded-full bg-fg px-4 text-[15px] font-semibold text-ink"
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
        <main className="grid min-h-dvh place-items-center bg-ink text-fg">
          <p className="font-display animate-pulse text-fg-2">Loading your card…</p>
        </main>
      }
    >
      <CardDashboard />
    </Suspense>
  );
}
