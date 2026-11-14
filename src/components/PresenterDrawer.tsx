"use client";

import { X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSimulateRegular: () => void;
  onSimulateFeast: () => void;
  onDuplicateTest: () => void;
  onReset: () => void;
  busy?: boolean;
}

export function PresenterDrawer({ open, onClose, onSimulateRegular, onSimulateFeast, onDuplicateTest, onReset, busy }: Props) {
  const row =
    "flex min-h-14 w-full items-center px-4 py-3 text-left text-[15px] leading-snug text-fg transition-colors duration-150 active:bg-ink/40 disabled:opacity-50";
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[60] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            role="dialog"
            aria-label="Presenter Mode"
            className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-w-md rounded-t-[20px] border-x border-t border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-fg/20" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg text-fg"><Zap size={18} className="text-flame" aria-hidden /> Presenter Mode</h2>
                <p className="mt-1 text-sm leading-snug text-fg-2">
                  Runs locally in your browser with the same validation rules as production. No real data is touched.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close presenter drawer" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg-2 hover:bg-fg/10">
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface-2">
              <button type="button" data-testid="presenter-regular" disabled={busy} onClick={onSimulateRegular} className={row}>
                Simulate MokaPOS Scan: Rp 110.000 (+2 Stamps)
              </button>
              <button type="button" data-testid="presenter-feast" disabled={busy} onClick={onSimulateFeast} className={row}>
                Simulate Feast Scan: Rp 500.000 (+10 Instant Unlock)
              </button>
              <button type="button" data-testid="presenter-duplicate" disabled={busy} onClick={onDuplicateTest} className={row}>
                Test Anti-Cheat Block (Duplicate #QGKTER5)
              </button>
              <button type="button" data-testid="presenter-reset" disabled={busy} onClick={onReset} className={`${row} !text-fg-2`}>
                Reset Card to 0/10
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
