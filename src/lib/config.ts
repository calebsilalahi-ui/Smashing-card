/** Version stamp for Terms & Privacy. Bump when either document changes materially (forces re-consent logging). */
export const POLICY_VERSION = "2026-11-14";

export const BRAND = {
  name: "Smashing Burger",
  rewardName: "Helena Burger",
  supportEmail: "privacy@smashingburger.id",
} as const;

export const COLORS = {
  espresso: "#2D1914",
  flame: "#F54725",
  ember: "#FF7A00",
  gold: "#F9A65A",
  cream: "#E4D8CA",
} as const;

/** Public (browser-safe) check — true when Google login can actually work. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
