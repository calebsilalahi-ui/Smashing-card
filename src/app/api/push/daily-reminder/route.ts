import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { configureWebPush, sendPush, type StoredSubscription } from "@/lib/push-server";
import { postStoreWebhook } from "@/lib/webhook";
import { STAMPS_FOR_REWARD, todayWIB } from "@/lib/moka";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function reminderCopy(stamps: number): { title: string; body: string } {
  if (stamps >= STAMPS_FOR_REWARD) {
    return {
      title: "🔥 Your FREE Helena Burger is waiting!",
      body: "You have 10/10 stamps. Show your VIP card at the Smashing Burger counter to redeem.",
    };
  }
  const left = STAMPS_FOR_REWARD - stamps;
  return {
    title: "Smashing Burger VIP",
    body: `Only ${left} more stamp${left === 1 ? "" : "s"} until your FREE Helena Burger at Smashing Burger!`,
  };
}

/**
 * Vercel Cron (daily, see vercel.json) — protected by CRON_SECRET.
 *  1) Rotates store_settings.current_staff_pin to a fresh random 4-digit PIN and posts it to STORE_WEBHOOK_URL.
 *  2) Sends a tailored stamp reminder to every opted-in member's subscribed devices; prunes dead subscriptions.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data: newPin, error: pinError } = await admin.rpc("rotate_staff_pin");
  let pinPosted = false;
  if (!pinError && typeof newPin === "string") {
    pinPosted = await postStoreWebhook({
      event: "staff_pin_rotated",
      date_wib: todayWIB(),
      staff_pin: newPin,
      text: `🔐 Smashing Burger counter PIN for ${todayWIB()} (WIB): ${newPin}. Do not share with customers.`,
    });
  }

  let sent = 0;
  let pruned = 0;
  let failed = 0;
  if (configureWebPush()) {
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth, profiles!inner(stamps, push_opt_in)")
        .eq("profiles.push_opt_in", true)
        .order("id")
        .range(from, from + pageSize - 1);
      if (error || !rows || rows.length === 0) break;
      const results = await Promise.all(
        rows.map(async (row) => {
          const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as { stamps: number } | null;
          const copy = reminderCopy(profile?.stamps ?? 0);
          const outcome = await sendPush(row as unknown as StoredSubscription, { ...copy, url: "/card", tag: "daily-stamp" });
          return { id: row.id as string, outcome };
        }),
      );
      const gone = results.filter((r) => r.outcome === "gone").map((r) => r.id);
      sent += results.filter((r) => r.outcome === "sent").length;
      failed += results.filter((r) => r.outcome === "error").length;
      if (gone.length) {
        await admin.from("push_subscriptions").delete().in("id", gone);
        pruned += gone.length;
      }
      if (rows.length < pageSize) break;
    }
  }

  return NextResponse.json({
    ok: true,
    pin_rotated: !pinError,
    pin_posted_to_webhook: pinPosted,
    push: { sent, pruned, failed },
  });
}
