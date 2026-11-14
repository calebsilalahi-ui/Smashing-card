"use client";

import { Download, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount, exportAccountData } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";

export function AccountActions({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState<null | "export" | "delete" | "signout">(null);
  const [note, setNote] = useState<string | null>(null);

  const btn =
    "flex w-full items-center justify-center gap-2 rounded-xl border border-cream/20 bg-espresso-soft/50 px-4 py-3 text-sm font-semibold text-cream transition active:scale-[0.98] hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-40";

  async function onExport() {
    setBusy("export");
    setNote(null);
    const ok = await exportAccountData();
    setNote(ok ? "Your data export has been downloaded." : "Export failed. Please try again.");
    setBusy(null);
  }

  async function onDelete() {
    setBusy("delete");
    const ok = await deleteAccount();
    if (!ok) {
      setNote("Could not delete your account. Please try again.");
      setBusy(null);
      return;
    }
    await signOut();
    router.replace("/");
  }

  async function onSignOut() {
    setBusy("signout");
    await signOut();
    router.replace("/");
  }

  return (
    <section aria-labelledby="pdp-title" className="rounded-2xl border border-cream/10 bg-espresso/60 p-4">
      <h2 id="pdp-title" className="font-display text-sm text-gold">
        Your data (UU PDP)
      </h2>
      {demo && <p className="mt-1 text-xs text-cream/60">Available after Google sign-in</p>}
      <div className="mt-3 grid gap-2">
        <button type="button" className={btn} disabled={demo || busy !== null} onClick={onExport}>
          <Download size={16} aria-hidden /> Export my data
        </button>
        <button type="button" className={btn} disabled={demo || busy !== null} onClick={onSignOut}>
          <LogOut size={16} aria-hidden /> Sign out
        </button>
        <button
          type="button"
          className={`${btn} !border-flame/40 !text-flame`}
          disabled={demo || busy !== null}
          onClick={() => {
            setTyped("");
            setConfirmOpen(true);
          }}
        >
          <Trash2 size={16} aria-hidden /> Delete my account
        </button>
      </div>
      {note && (
        <p role="status" className="mt-2 text-xs text-cream/70">
          {note}
        </p>
      )}

      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-title"
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-flame/40 bg-espresso-deep p-5">
            <h3 id="del-title" className="font-display text-lg text-flame">
              Delete account?
            </h3>
            <p className="mt-2 text-sm text-cream/80">
              This permanently erases your profile, stamps, and receipt history. This cannot be undone. Type{" "}
              <strong className="text-gold">DELETE</strong> to confirm.
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Type DELETE to confirm"
              className="mt-3 w-full rounded-lg border border-cream/20 bg-espresso px-3 py-2 text-cream outline-none focus:border-flame"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" className={btn} onClick={() => setConfirmOpen(false)} disabled={busy === "delete"}>
                Cancel
              </button>
              <button
                type="button"
                disabled={typed !== "DELETE" || busy === "delete"}
                onClick={onDelete}
                className="w-full rounded-xl bg-flame px-4 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
              >
                {busy === "delete" ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
