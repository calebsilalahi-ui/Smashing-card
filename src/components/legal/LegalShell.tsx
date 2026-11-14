"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { POLICY_VERSION } from "@/lib/config";

type Lang = "id" | "en";

export interface LegalSectionData {
  id: string;
  title: { id: string; en: string };
  body: { id: ReactNode; en: ReactNode };
}

interface LegalShellProps {
  title: { id: string; en: string };
  intro: { id: ReactNode; en: ReactNode };
  sections: LegalSectionData[];
}

const UI = {
  id: {
    version: "Versi",
    updated: "Terakhir diperbarui 14 November 2026",
    toc: "Daftar isi",
    lang: "Bahasa",
    privacy: "Kebijakan Privasi",
    terms: "Syarat & Ketentuan",
    back: "Kembali ke kartu",
    prevails: "Jika terdapat perbedaan, versi Bahasa Indonesia yang berlaku.",
  },
  en: {
    version: "Version",
    updated: "Last updated 14 November 2026",
    toc: "Contents",
    lang: "Language",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    back: "Back to card",
    prevails: "In case of conflict, the Bahasa Indonesia version prevails.",
  },
} as const;

/** Prose helpers, usable from server pages. */
export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 first:mt-0">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-flame">{children}</ul>
  );
}

export function LegalShell({ title, intro, sections }: LegalShellProps) {
  const [lang, setLang] = useState<Lang>("id");
  const t = UI[lang];

  return (
    <div className="min-h-dvh bg-espresso-deep text-cream">
      <header className="bg-espresso">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Smashing Burger"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream p-1.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/smashing-logo-mark.png"
              alt="Smashing Burger"
              className="h-full w-full object-contain"
            />
          </Link>
          <span className="font-display text-base uppercase text-cream-soft">
            Smashing Burger
          </span>
        </div>
        <div className="checker-strip" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
        <h1 className="font-display text-3xl uppercase leading-tight text-cream-soft">
          {title[lang]}
        </h1>
        <p className="mt-2 text-sm text-gold">
          {t.version} {POLICY_VERSION} · {t.updated}
        </p>

        <div
          role="tablist"
          aria-label={t.lang}
          className="mt-5 inline-flex rounded-full bg-espresso p-1"
        >
          {(["id", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              id={`tab-${l}`}
              aria-selected={lang === l}
              aria-controls={`panel-${l}`}
              onClick={() => setLang(l)}
              className={`min-h-11 min-w-14 rounded-full px-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                lang === l
                  ? "bg-flame text-espresso-deep"
                  : "text-cream hover:text-cream-soft"
              }`}
            >
              {l === "id" ? "ID" : "EN"}
            </button>
          ))}
        </div>

        {(["id", "en"] as const).map((l) => {
          const suffix = l === "en" ? "-en" : "";
          return (
            <div
              key={l}
              role="tabpanel"
              id={`panel-${l}`}
              aria-labelledby={`tab-${l}`}
              lang={l}
              hidden={lang !== l}
              className="mt-6 text-[15px] leading-7"
            >
              <div className="rounded-2xl bg-espresso p-4 text-cream-soft">
                {intro[l]}
                <p className="mt-3 text-sm text-gold">{UI[l].prevails}</p>
              </div>

              <nav
                aria-label={UI[l].toc}
                className="mt-6 rounded-2xl border border-espresso-soft p-4"
              >
                <h2 className="font-display text-sm uppercase text-gold">
                  {UI[l].toc}
                </h2>
                <ol className="mt-3 space-y-2 text-sm">
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}${suffix}`}
                        className="flex min-h-11 items-center gap-2 py-1 text-cream underline-offset-4 hover:text-gold hover:underline"
                      >
                        <span className="w-6 shrink-0 text-flame">{i + 1}.</span>
                        <span>{s.title[l]}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              {sections.map((s, i) => (
                <section
                  key={s.id}
                  id={`${s.id}${suffix}`}
                  className="scroll-mt-6 border-t border-espresso-soft pt-6 mt-8"
                >
                  <h2 className="font-display text-xl uppercase leading-snug text-cream-soft">
                    <span className="text-flame">{i + 1}.</span> {s.title[l]}
                  </h2>
                  <div className="mt-3 text-cream">{s.body[l]}</div>
                </section>
              ))}
            </div>
          );
        })}
      </main>

      <footer className="bg-espresso">
        <div className="checker-strip" aria-hidden="true" />
        <nav
          aria-label="Footer"
          className="mx-auto flex max-w-2xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm"
        >
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-gold">
            {t.privacy}
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-gold">
            {t.terms}
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center text-gold hover:text-cream-soft">
            {t.back}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
