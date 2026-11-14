import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Member } from "./types";

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string;
  member_code: string;
  stamps: number;
  pin_locked_until: string | null;
  push_opt_in: boolean;
}

export function toMember(row: ProfileRow): Member {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    memberCode: row.member_code,
    stamps: row.stamps,
    pinLockedUntil: row.pin_locked_until && Date.parse(row.pin_locked_until) > Date.now() ? row.pin_locked_until : null,
    pushOptIn: row.push_opt_in,
  };
}

export async function fetchMember(supabase: SupabaseClient, userId: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, member_code, stamps, pin_locked_until, push_opt_in")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return toMember(data as ProfileRow);
}

/** Soft per-instance rate limiter (sliding window). Protects the paid Vision API from scan spam. */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}
