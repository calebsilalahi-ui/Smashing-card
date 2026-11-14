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
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink"
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-flame">
          <ShieldAlert size={26} aria-hidden />
        </div>
        <h1 id="sb-wv-title" className="font-display mt-5 text-center text-2xl text-fg">
          Open in {browser}
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-fg-2">
          Google blocks sign-in inside in-app browsers (<code className="font-mono text-fg">disallowed_useragent</code>), and
          camera access for receipt scanning may fail.
        </p>
        <p className="mt-2 text-center text-sm leading-relaxed text-fg-3">
          Google memblokir login di dalam browser aplikasi, dan akses kamera untuk scan struk bisa gagal. Buka
          tautan ini di {browser}.
        </p>

        <ol className="mt-7 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          <li className="flex items-center gap-3 p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line font-mono text-sm text-fg-2">
              1
            </span>
            <p className="flex-1 text-sm text-fg">
              Tap <span className="mx-1 inline-flex items-center rounded-md bg-surface-2 px-1.5 py-0.5 align-middle"><Dots size={16} aria-hidden /><span className="sr-only">menu</span></span>
              {ios ? "(•••)" : "(⋮)"} at the top-right.
              <span className="block text-fg-3">Ketuk menu di pojok kanan atas.</span>
            </p>
          </li>
          <li className="flex items-center gap-3 p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line font-mono text-sm text-fg-2">
              2
            </span>
            <p className="flex-1 text-sm text-fg">
              Choose <strong className="font-semibold">&ldquo;Open in {ios ? "Safari" : "Chrome"}&rdquo;</strong>
              {ios ? "" : " / “Open in browser”"}.
              <span className="block text-fg-3">
                Pilih &ldquo;Buka di {browser}&rdquo;{ios ? "" : " / “Buka di browser”"}.
              </span>
            </p>
          </li>
        </ol>

        <button
          type="button"
          onClick={copy}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-fg px-4 text-[15px] font-semibold text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          {copied ? "Link copied / Tautan disalin" : "Copy link / Salin tautan"}
        </button>
        <p className="mt-3 text-center text-sm text-fg-3">
          Or paste the link into {browser} manually. / Atau tempel tautan ke {browser}.
        </p>

        <button
          type="button"
          onClick={() => setShow(false)}
          className="mx-auto mt-4 min-h-11 px-4 text-sm font-medium text-fg-2 underline underline-offset-2"
        >
          Continue anyway / Lanjutkan saja
        </button>
      </div>
    </div>
  );
}
