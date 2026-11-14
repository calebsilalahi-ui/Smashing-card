"use client";
import { getBrowserSupabase } from "./supabase/client";
import type { ConsentType } from "./types";

/**
 * Starts Google OAuth. Consents ticked on the landing gate travel through the callback URL (?c=...)
 * and are written to consent_logs server-side right after the session is created (UU PDP audit trail).
 * Throws when Supabase is not configured so the UI can fall back to Demo Mode.
 */
export async function signInWithGoogle(consents: ConsentType[], next = "/card"): Promise<void> {
  const supabase = getBrowserSupabase();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  if (!consents.includes("terms_privacy")) throw new Error("TERMS_REQUIRED");
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", next);
  callback.searchParams.set("c", consents.join(","));
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getBrowserSupabase();
  if (supabase) await supabase.auth.signOut();
}
