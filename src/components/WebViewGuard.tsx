"use client";
import { useEffect, useState } from "react";
import { Check, Copy, MoreHorizontal, MoreVertical, ShieldAlert } from "lucide-react";

const WEBVIEW_RE = /Instagram|Line\/|FBAN|FBAV|MicroMessenger|; wv\)|TikTok|Twitter/i;

/** Full-screen overlay for in-app browsers where Google login (disallowed_useragent) and camera are unreliable. */
export function WebViewGuard() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (WEBVIEW_RE.test(ua)) {
      setIos(/iPad|iPhone|iPod/.test(ua));
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link / Salin tautan ini:", window.location.href);
    }
  };

  const Dots = ios ? MoreHorizontal : MoreVertical;
  const browser = ios ? "Safari" : "Chrome";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sb-wv-title"
      className="fixed inset-0 z-[100] overflow-y-auto bg-espresso-deep"
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-flame/15 text-flame">
          <ShieldAlert size={28} aria-hidden />
        </div>
        <h1 id="sb-wv-title" className="font-display mt-4 text-center text-2xl text-cream-soft">
          Open in {browser}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-cream/85">
          Google blocks sign-in inside in-app browsers (<code className="text-gold">disallowed_useragent</code>), and
          camera access for receipt scanning may fail.
        </p>
        <p className="mt-2 text-center text-xs leading-relaxed text-cream/65">
          Google memblokir login di dalam browser aplikasi, dan akses kamera untuk scan struk bisa gagal. Buka
          tautan ini di {browser}.
        </p>

        <ol className="mt-6 space-y-3">
          <li className="flex items-center gap-3 rounded-2xl bg-espresso p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flame text-sm font-extrabold text-white">
              1
            </span>
            <p className="flex-1 text-sm text-cream">
              Tap <span className="mx-1 inline-flex items-center rounded-md bg-espresso-soft px-1.5 py-0.5 align-middle"><Dots size={16} aria-hidden /><span className="sr-only">menu</span></span>
              {ios ? "(•••)" : "(⋮)"} at the top-right.
              <span className="block text-xs text-cream/60">Ketuk menu di pojok kanan atas.</span>
            </p>
          </li>
          <li className="flex items-center gap-3 rounded-2xl bg-espresso p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flame text-sm font-extrabold text-white">
              2
            </span>
            <p className="flex-1 text-sm text-cream">
              Choose <strong className="text-gold">&ldquo;Open in {ios ? "Safari" : "Chrome"}&rdquo;</strong>
              {ios ? "" : " / “Open in browser”"}.
              <span className="block text-xs text-cream/60">
                Pilih &ldquo;Buka di {browser}&rdquo;{ios ? "" : " / “Buka di browser”"}.
              </span>
            </p>
          </li>
        </ol>

        <button
          type="button"
          onClick={copy}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-flame px-4 text-sm font-extrabold text-white active:scale-[0.98]"
        >
          {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          {copied ? "Link copied / Tautan disalin" : "Copy link / Salin tautan"}
        </button>
        <p className="mt-2 text-center text-[11px] text-cream/55">
          Or paste the link into {browser} manually. / Atau tempel tautan ke {browser}.
        </p>

        <button
          type="button"
          onClick={() => setShow(false)}
          className="mx-auto mt-5 min-h-11 px-4 text-xs font-semibold text-cream/55 underline underline-offset-2"
        >
          Continue anyway / Lanjutkan saja
        </button>
      </div>
    </div>
  );
}
