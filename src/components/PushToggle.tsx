"use client";
import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, PlusSquare, Share } from "lucide-react";
import {
  getCurrentSubscription,
  isIOS,
  isPushSupported,
  isStandalonePWA,
  subscribePush,
  unsubscribePush,
} from "@/lib/push-client";

const DEMO_KEY = "sb-demo-push";

export function PushToggle({ demo = false }: { demo?: boolean }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [intent, setIntent] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    try {
      setIntent(window.localStorage.getItem("sb-push-intent") === "1");
    } catch {
      /* ignore */
    }
    setNeedsInstall(isIOS() && !isStandalonePWA());
    if (demo) {
      try {
        setOn(window.localStorage.getItem(DEMO_KEY) === "1");
      } catch {
        /* ignore */
      }
    } else {
      getCurrentSubscription().then((s) => {
        if (alive) setOn(Boolean(s) && Notification.permission === "granted");
      });
    }
    return () => {
      alive = false;
    };
  }, [demo]);

  const sendSample = useCallback(async () => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const opts = {
      body: "Demo: you're 2 stamps away from a FREE Helena Burger!",
      icon: "/icons/icon-192.png",
      tag: "demo-reminder",
    };
    try {
      const reg = await navigator.serviceWorker?.getRegistration("/");
      if (reg) await reg.showNotification("Smashing Burger VIP", opts);
      else new Notification("Smashing Burger VIP", opts);
    } catch {
      try {
        new Notification("Smashing Burger VIP", opts);
      } catch {
        /* unsupported */
      }
    }
  }, []);

  const explain = (reason?: string) => {
    switch (reason) {
      case "needs_install":
        setNeedsInstall(true);
        setError("On iPhone, push works only after adding the app to your Home Screen.");
        break;
      case "denied":
        setError(
          "Notifications are blocked. Re-enable them in your browser's site settings (lock icon → Notifications → Allow), then try again."
        );
        break;
      case "no_vapid":
        setError("Push isn't configured on this deployment.");
        break;
      case "unsupported":
        setError("This browser doesn't support push notifications.");
        break;
      default:
        setError("Couldn't enable reminders. Please try again.");
    }
  };

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      if (demo) {
        const next = !on;
        if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
          await Notification.requestPermission().catch(() => "default");
        }
        setOn(next);
        try {
          window.localStorage.setItem(DEMO_KEY, next ? "1" : "0");
        } catch {
          /* ignore */
        }
        if (next) {
          setNote("Demo: push is simulated. No data is sent to a server.");
          await sendSample();
        }
      } else if (on) {
        const ok = await unsubscribePush();
        if (ok) setOn(false);
        else setError("Couldn't turn off reminders. Please try again.");
      } else {
        const res = await subscribePush();
        if (res.ok) {
          setOn(true);
          setIntent(false);
          try {
            window.localStorage.removeItem("sb-push-intent");
          } catch {
            /* ignore */
          }
        } else explain(res.reason);
      }
    } finally {
      setBusy(false);
    }
  };

  const highlight = intent && !on && !demo;
  const unsupported = !demo && typeof window !== "undefined" && !isPushSupported() && !needsInstall;

  return (
    <div
      className={`rounded-2xl border bg-espresso p-4 ${
        highlight ? "animate-pulse border-flame ring-2 ring-flame/60" : "border-cream/15"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flame/15 text-flame">
          {on ? <Bell size={20} aria-hidden /> : <BellOff size={20} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-cream-soft">Daily stamp reminders</p>
          <p className="text-xs text-cream/65">
            {highlight ? "You opted in — tap to enable." : "Pengingat stempel harian"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Daily stamp reminders"
          onClick={toggle}
          disabled={busy || unsupported}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            on ? "bg-flame" : "bg-cream/25"
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-6" : ""
            }`}
          />
        </button>
      </div>

      {demo && (
        <p className="mt-3 text-xs text-gold">
          Demo: push is simulated.{" "}
          {on && (
            <button type="button" onClick={sendSample} className="font-bold underline underline-offset-2">
              Send a sample notification
            </button>
          )}
        </p>
      )}
      {note && <p className="mt-2 text-xs text-cream/70">{note}</p>}
      {unsupported && <p className="mt-3 text-xs text-cream/65">This browser doesn&apos;t support push notifications.</p>}

      {needsInstall && !demo && (
        <div className="mt-3 rounded-xl bg-espresso-deep p-3 text-xs leading-relaxed text-cream/85">
          <p className="font-bold text-cream-soft">Add to Home Screen to enable push on iPhone</p>
          <ol className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2">
              <Share size={16} className="shrink-0 text-gold" aria-hidden /> Tap the Share button in Safari.
            </li>
            <li className="flex items-center gap-2">
              <PlusSquare size={16} className="shrink-0 text-gold" aria-hidden /> Choose &ldquo;Add to Home Screen&rdquo;.
            </li>
            <li className="flex items-center gap-2">
              <Bell size={16} className="shrink-0 text-gold" aria-hidden /> Open Smashing VIP from the Home Screen, then enable reminders.
            </li>
          </ol>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-flame/15 p-2.5 text-xs text-cream-soft">
          {error}
        </p>
      )}
    </div>
  );
}
