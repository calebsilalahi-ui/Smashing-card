"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Cookie } from "lucide-react";
import { POLICY_VERSION } from "@/lib/config";

const KEY = "sb-cookie-consent";
const OPEN_EVENT = "sb-open-cookie-settings";

interface StoredConsent {
  version: string;
  preferences: boolean;
  decidedAt: string;
}

function readConsent(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (typeof parsed.preferences !== "boolean" || typeof parsed.version !== "string") return null;
    return { version: parsed.version, preferences: parsed.preferences, decidedAt: String(parsed.decidedAt ?? "") };
  } catch {
    return null;
  }
}

/** True when the visitor allowed the optional "Preferences" cookie/storage category. */
export function hasPreferenceConsent(): boolean {
  if (typeof window === "undefined") return false;
  return readConsent()?.preferences === true;
}

/** Re-opens the cookie banner (e.g. from a "Cookie settings" link in the footer). */
export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function CookieConsentBanner() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState(false);

  useEffect(() => {
    const saved = readConsent();
    if (!saved || saved.version !== POLICY_VERSION) {
      setPrefs(saved?.preferences ?? false);
      setOpen(true);
    }
    const onOpen = () => {
      setPrefs(readConsent()?.preferences ?? false);
      setExpanded(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const save = useCallback((preferences: boolean) => {
    const value: StoredConsent = { version: POLICY_VERSION, preferences, decidedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(value));
      if (!preferences) {
        window.localStorage.removeItem("sb-sfx-muted");
        window.localStorage.removeItem("sb-demo-state-v1");
      }
    } catch {
      /* storage blocked: banner simply closes for this view */
    }
    setOpen(false);
    setExpanded(false);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="sb-cookie-title"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-md rounded-[20px] border border-line bg-surface/95 p-4 shadow-2xl shadow-black/60 backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-2">
            <Cookie size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="sb-cookie-title" className="text-[15px] font-semibold text-fg">
              Cookies &amp; penyimpanan lokal
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-2">
              Kami memakai cookie penting agar login aman, dan (jika Anda izinkan) penyimpanan preferensi. We use
              strictly necessary cookies for secure login, plus optional preference storage.{" "}
              <a href="/privacy#cookies" className="font-medium text-fg underline underline-offset-2">
                Learn more
              </a>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 flex min-h-11 w-full items-center justify-between rounded-lg px-1 text-sm font-medium text-fg"
        >
          Manage / Kelola
          <ChevronDown size={16} aria-hidden className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && (
          <div className="mb-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-2">
            <div className="flex items-start justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium text-fg">Strictly necessary / Sangat diperlukan</p>
                <p className="mt-0.5 text-xs leading-snug text-fg-2">
                  Supabase Auth login session cookies and security. Always on.
                </p>
              </div>
              <Switch checked disabled label="Strictly necessary (always on)" />
            </div>
            <div className="flex items-start justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium text-fg">Preferences / Preferensi</p>
                <p className="mt-0.5 text-xs leading-snug text-fg-2">
                  Sound on/off, your cookie choice and demo state, stored in localStorage.
                </p>
              </div>
              <Switch checked={prefs} onChange={setPrefs} label="Preferences" />
            </div>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => save(false)}
            className="min-h-12 rounded-full border border-line bg-surface-2 px-3 text-sm font-semibold text-fg transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Necessary only
          </button>
          {expanded ? (
            <button
              type="button"
              onClick={() => save(prefs)}
              className="min-h-12 rounded-full border border-line bg-surface-2 px-3 text-sm font-semibold text-fg transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              Save choices
            </button>
          ) : (
            <span aria-hidden className="hidden" />
          )}
          <button
            type="button"
            onClick={() => save(true)}
            className={`min-h-12 rounded-full bg-fg px-3 text-sm font-semibold text-ink transition-transform duration-150 ease-out active:scale-[0.97] ${
              expanded ? "col-span-2" : ""
            }`}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full before:absolute before:-inset-2.5 before:content-[''] transition-colors ${
        checked ? "bg-flame" : "bg-fg/20"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-fg transition-transform ${
          checked ? "translate-x-5 !bg-ink" : ""
        }`}
      />
    </button>
  );
}
