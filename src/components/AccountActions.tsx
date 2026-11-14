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

  const row =
    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-[15px] text-fg transition-colors duration-150 active:bg-ink/40 disabled:cursor-not-allowed disabled:opacity-40";
  const dlgBtn =
    "flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-surface-2 px-4 text-[15px] font-semibold text-fg transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40";

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
    <section aria-labelledby="pdp-title">
      <h2 id="pdp-title" className="px-1 text-sm font-medium text-fg-2">
        Your data (UU PDP)
      </h2>
      {demo && <p className="mt-1 px-1 text-xs text-fg-3">Available after Google sign-in</p>}
      <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <button type="button" className={row} disabled={demo || busy !== null} onClick={onExport}>
          <Download size={18} className="text-fg-2" aria-hidden /> Export my data
        </button>
        <button type="button" className={row} disabled={demo || busy !== null} onClick={onSignOut}>
          <LogOut size={18} className="text-fg-2" aria-hidden /> Sign out
        </button>
        <button
          type="button"
          className={`${row} !text-flame`}
          disabled={demo || busy !== null}
          onClick={() => {
            setTyped("");
            setConfirmOpen(true);
          }}
        >
          <Trash2 size={18} aria-hidden /> Delete my account
        </button>
      </div>
      {note && (
        <p role="status" className="mt-2 px-1 text-sm text-fg-2">
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
          <div className="w-full max-w-sm rounded-[20px] border border-line bg-surface p-5">
            <h3 id="del-title" className="font-display text-lg text-fg">
              Delete account?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-2">
              This permanently erases your profile, stamps, and receipt history. This cannot be undone. Type{" "}
              <strong className="font-mono text-fg">DELETE</strong> to confirm.
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Type DELETE to confirm"
              className="mt-3 h-12 w-full rounded-xl border border-line bg-ink px-3 font-mono text-base text-fg focus:border-fg/50"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" className={dlgBtn} onClick={() => setConfirmOpen(false)} disabled={busy === "delete"}>
                Cancel
              </button>
              <button
                type="button"
                disabled={typed !== "DELETE" || busy === "delete"}
                onClick={onDelete}
                className="flex min-h-12 w-full items-center justify-center rounded-full bg-flame px-4 text-[15px] font-semibold text-ink transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
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
