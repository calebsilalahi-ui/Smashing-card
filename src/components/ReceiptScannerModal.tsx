"use client";

import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SampleMokaReceipt } from "@/components/SampleMokaReceipt";
import type { DemoReceipt } from "@/lib/demo";
import { compressImage } from "@/lib/image-compress";
import { sfx } from "@/lib/sound-fx";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => Promise<void> | void;
  busy?: boolean;
  simulatedReceipt?: DemoReceipt | null;
  onSimulationComplete?: () => void;
}

const SIM_MS = 1800;
const FRAME_ASPECT = 1.9; // height / width

export function ReceiptScannerModal({ open, onClose, onCapture, busy, simulatedReceipt, onSimulationComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [camState, setCamState] = useState<"starting" | "ready" | "denied">("starting");
  const [localBusy, setLocalBusy] = useState(false);
  const simulating = Boolean(simulatedReceipt);
  const working = Boolean(busy) || localBusy;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open || simulating) {
      stopCamera();
      return;
    }
    let cancelled = false;
    setCamState("starting");
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamState("denied");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
        setCamState("ready");
      } catch {
        if (!cancelled) setCamState("denied");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, simulating, stopCamera]);

  // Presenter simulation: sweep, then complete.
  useEffect(() => {
    if (!open || !simulatedReceipt) return;
    const id = window.setTimeout(() => onSimulationComplete?.(), SIM_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, simulatedReceipt]);

  async function shutter() {
    const v = videoRef.current;
    if (!v || !v.videoWidth || working) return;
    sfx.click();
    setLocalBusy(true);
    try {
      let source: HTMLVideoElement | HTMLCanvasElement = v;
      const frame = frameRef.current;
      const vr = v.getBoundingClientRect();
      if (frame && vr.width && vr.height) {
        // Map the on-screen frame back to video pixels (object-fit: cover).
        const fr = frame.getBoundingClientRect();
        const scale = Math.max(vr.width / v.videoWidth, vr.height / v.videoHeight);
        const offX = (v.videoWidth * scale - vr.width) / 2;
        const offY = (v.videoHeight * scale - vr.height) / 2;
        const pad = 0.04;
        const sx = Math.max(0, (fr.left - vr.left + offX) / scale - fr.width * pad / scale);
        const sy = Math.max(0, (fr.top - vr.top + offY) / scale - fr.height * pad / scale);
        const sw = Math.min(v.videoWidth - sx, (fr.width * (1 + 2 * pad)) / scale);
        const sh = Math.min(v.videoHeight - sy, (fr.height * (1 + 2 * pad)) / scale);
        if (sw > 50 && sh > 50) {
          const c = document.createElement("canvas");
          c.width = Math.round(sw);
          c.height = Math.round(sh);
          c.getContext("2d")?.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
          source = c;
        }
      }
      const dataUrl = await compressImage(source);
      await onCapture(dataUrl);
    } catch {
      // Fall back to the upload path if the capture failed.
      setCamState("denied");
    } finally {
      setLocalBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || working) return;
    setLocalBusy(true);
    try {
      const dataUrl = await compressImage(file);
      await onCapture(dataUrl);
    } finally {
      setLocalBusy(false);
    }
  }

  if (!open) return null;

  const showScanLine = simulating || working || camState === "ready";

  return (
    <div role="dialog" aria-modal="true" aria-label="Scan MokaPOS receipt" className="fixed inset-0 z-[70] flex flex-col bg-black text-cream">
      <style>{`
        @keyframes sb-scan { 0% { top: 2%; } 50% { top: 96%; } 100% { top: 2%; } }
        .sb-scanline { animation: sb-scan 1.8s ease-in-out infinite; }
      `}</style>

      {/* Camera layer */}
      <div className="absolute inset-0 overflow-hidden">
        {!simulating && (
          <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" aria-hidden />
        )}
        {simulating && <div className="h-full w-full bg-espresso-deep" />}
      </div>

      {/* Darkened mask with frame cut-out + frame */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center pb-28 pt-20">
        <div
          ref={frameRef}
          className="relative w-[62%] max-w-[300px] rounded-md"
          style={{ aspectRatio: `1 / ${FRAME_ASPECT}`, boxShadow: "0 0 0 100vmax rgba(0,0,0,.65)" }}
        >
          {simulatedReceipt && (
            <div className="absolute inset-0 overflow-hidden rounded-md bg-espresso-soft">
              <SampleMokaReceipt receipt={simulatedReceipt} />
            </div>
          )}
          <div className="absolute inset-1 rounded border border-dashed border-gold/70" />
          {(["left-0 top-0 border-l-4 border-t-4 rounded-tl-lg", "right-0 top-0 border-r-4 border-t-4 rounded-tr-lg", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-lg", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-lg"] as const).map((c) => (
            <span key={c} className={`absolute h-7 w-7 border-flame ${c}`} />
          ))}
          {showScanLine && (
            <div className="sb-scanline absolute inset-x-1 h-0.5 bg-gradient-to-r from-transparent via-ember to-transparent shadow-[0_0_14px_3px_rgba(255,122,0,.8)]" />
          )}
        </div>
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-start justify-between gap-3 p-4">
        <div className="max-w-[80%] rounded-xl bg-black/55 px-3 py-2 text-xs leading-snug backdrop-blur">
          <p className="font-semibold">Fit the MokaPOS receipt inside the frame—keep the header, Receipt Number, and Total clear.</p>
          <p className="mt-1 text-[10.5px] text-cream/75">
            Min. Rp 50.000 per receipt · Maximum 10 stamps per receipt / Maksimal 10 stempel per struk · Receipts valid 7 days
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close scanner" className="rounded-full bg-black/55 p-2.5 backdrop-blur">
          <X size={20} aria-hidden />
        </button>
      </div>

      {/* Denied state */}
      {!simulating && camState === "denied" && (
        <div className="absolute inset-x-6 top-1/3 z-10 rounded-2xl border border-flame/40 bg-espresso-deep/95 p-4 text-center">
          <Camera className="mx-auto text-gold" size={28} aria-hidden />
          <p className="mt-2 text-sm font-semibold">Camera unavailable</p>
          <p className="mt-1 text-xs text-cream/70">Allow camera access in your browser, or upload a photo of your MokaPOS receipt instead.</p>
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative z-10 mt-auto flex items-center justify-center gap-8 bg-gradient-to-t from-black/80 to-transparent px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} data-testid="receipt-file-input" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={working || simulating}
          className="flex flex-col items-center gap-1 text-xs font-semibold text-cream disabled:opacity-40"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full border border-cream/30 bg-black/50">
            <ImagePlus size={20} aria-hidden />
          </span>
          Upload photo
        </button>
        <button
          type="button"
          onClick={shutter}
          disabled={working || simulating || camState !== "ready"}
          aria-label="Capture receipt"
          className="grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-white bg-flame/90 transition active:scale-90 disabled:opacity-40"
        >
          <Camera size={28} className="text-white" aria-hidden />
        </button>
        <span className="w-12" aria-hidden />
      </div>

      {/* Busy overlay */}
      {working && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/70" role="status">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-ember" size={36} aria-hidden />
            <p className="mt-3 font-display text-lg text-gold">Verifying receipt with AI…</p>
          </div>
        </div>
      )}
    </div>
  );
}
