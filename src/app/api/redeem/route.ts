import { NextResponse } from "next/server";
import { after } from "next/server";
import { getAuthedUser } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatWIB, postStoreWebhook } from "@/lib/webhook";
import type { RedeemErrorCode, RedeemFailure, RedeemSuccess } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(status: number, code: RedeemErrorCode, message: string, extra: Partial<RedeemFailure> = {}) {
  const body: RedeemFailure = { ok: false, code, message, ...extra };
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  const authed = await getAuthedUser();
  if (!authed) return fail(401, "unauthorized", "Please sign in again.");
  const admin = getAdminSupabase();
  if (!admin) return fail(503, "server_error", "Loyalty service is not configured.");

  let pin: unknown;
  try {
    ({ pin } = (await req.json()) as { pin?: unknown });
  } catch {
    return fail(400, "bad_request", "Invalid request.");
  }
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) return fail(400, "bad_request", "Enter the 4-digit staff PIN.");

  // PIN check, 5-attempt/15-minute lockout, and the 10-stamp deduction all happen atomically in Postgres.
  const { data, error } = await admin.rpc("redeem_helena_burger", { p_user_id: authed.user.id, p_input_pin: pin });
  if (error || !data) {
    console.error("[redeem] rpc error", error?.message);
    return fail(500, "server_error", "Could not redeem right now. Please try again.");
  }

  const r = data as {
    ok: boolean;
    code: string;
    message?: string;
    attempts_remaining?: number;
    locked_until?: string;
    redemption_id?: string;
    redeemed_at?: string;
    stamps?: number;
    member_code?: string;
    full_name?: string;
    reward_name?: string;
  };

  if (!r.ok) {
    const code = (r.code as RedeemErrorCode) || "server_error";
    const status = code === "locked" ? 423 : code === "invalid_pin" ? 403 : code === "unauthorized" ? 401 : 422;
    return fail(status, code, r.message || "Redemption failed.", {
      ...(typeof r.attempts_remaining === "number" ? { attemptsRemaining: r.attempts_remaining } : {}),
      ...(r.locked_until ? { lockedUntil: r.locked_until } : {}),
    });
  }

  const body: RedeemSuccess = {
    ok: true,
    redemptionId: r.redemption_id as string,
    redeemedAt: r.redeemed_at as string,
    stamps: r.stamps ?? 0,
    memberCode: r.member_code as string,
    fullName: r.full_name as string,
    rewardName: r.reward_name || "Helena Burger",
  };

  // Instant store alert — runs after the response so the member's ticket appears immediately.
  after(() =>
    postStoreWebhook({
      event: "helena_burger_redeemed",
      member_code: body.memberCode,
      full_name: body.fullName,
      redeemed_at: body.redeemedAt,
      redemption_id: body.redemptionId,
      text: `🍔 FREE HELENA BURGER redeemed — ${body.fullName} (#${body.memberCode}) at ${formatWIB(body.redeemedAt)}. Ring up: VIP LOYALTY — FREE HELENA BURGER.`,
    }),
  );

  return NextResponse.json(body);
}
