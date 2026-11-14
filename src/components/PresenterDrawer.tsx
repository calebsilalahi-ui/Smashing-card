"use client";

import { X } from "lucide-react";
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
  const base =
    "w-full rounded-2xl px-4 py-4 text-left text-sm font-bold leading-snug transition active:scale-[0.98] disabled:opacity-50";
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[60] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            role="dialog"
            aria-label="Presenter Mode"
            className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-w-md rounded-t-3xl border-t border-gold/30 bg-espresso-deep p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,.6)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-cream/25" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-gold">⚡ Presenter Mode</h2>
                <p className="mt-1 text-xs text-cream/65">
                  Runs locally in your browser with the same validation rules as production. No real data is touched.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close presenter drawer" className="rounded-full p-2 text-cream/70 hover:bg-cream/10">
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="mt-4 grid gap-2.5">
              <button type="button" data-testid="presenter-regular" disabled={busy} onClick={onSimulateRegular} className={`${base} bg-gradient-to-r from-flame to-ember text-white`}>
                Simulate MokaPOS Scan: Rp 110.000 (+2 Stamps)
              </button>
              <button type="button" data-testid="presenter-feast" disabled={busy} onClick={onSimulateFeast} className={`${base} bg-gradient-to-r from-ember to-gold text-espresso-deep`}>
                Simulate Feast Scan: Rp 500.000 (+10 Instant Unlock)
              </button>
              <button type="button" data-testid="presenter-duplicate" disabled={busy} onClick={onDuplicateTest} className={`${base} border border-flame/60 bg-flame/10 text-flame`}>
                Test Anti-Cheat Block (Duplicate #QGKTER5)
              </button>
              <button type="button" data-testid="presenter-reset" disabled={busy} onClick={onReset} className={`${base} border border-cream/20 bg-espresso-soft/60 text-cream`}>
                Reset Card to 0/10
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
