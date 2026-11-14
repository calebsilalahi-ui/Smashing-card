import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POLICY_VERSION } from "./config";
import type { ConsentType } from "./types";

export const CONSENT_TYPES: readonly ConsentType[] = [
  "terms_privacy",
  "push_reminders",
  "cookies_analytics",
  "cookies_preferences",
];

export function parseConsentTypes(input: unknown): ConsentType[] {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  return Array.from(new Set(list.map((s) => String(s).trim()))).filter((s): s is ConsentType =>
    (CONSENT_TYPES as readonly string[]).includes(s),
  );
}

/** Appends consent records (UU PDP audit trail) and keeps profiles.push_opt_in in sync. */
export async function recordConsents(
  admin: SupabaseClient,
  userId: string,
  types: ConsentType[],
  granted: boolean,
  userAgent: string | null,
): Promise<boolean> {
  if (types.length === 0) return true;
  const rows = types.map((consent_type) => ({
    user_id: userId,
    consent_type,
    granted,
    policy_version: POLICY_VERSION,
    user_agent: userAgent ? userAgent.slice(0, 400) : null,
  }));
  const { error } = await admin.from("consent_logs").insert(rows);
  if (types.includes("push_reminders")) {
    await admin.from("profiles").update({ push_opt_in: granted }).eq("id", userId);
  }
  return !error;
}
