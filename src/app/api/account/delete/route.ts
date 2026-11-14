import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { POLICY_VERSION } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — UU PDP right of access/portability: full JSON export of the member's personal data. */
export async function GET() {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { supabase, user } = authed;

  const [profile, receipts, redemptions, consents, push] = await Promise.all([
    supabase.from("profiles").select("email, full_name, member_code, stamps, push_opt_in, created_at, updated_at").eq("id", user.id).maybeSingle(),
    supabase.from("claimed_receipts").select("receipt_number, receipt_date, total_idr, stamps_awarded, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("redemptions").select("reward_name, stamps_deducted, redeemed_at").eq("user_id", user.id).order("redeemed_at", { ascending: false }),
    supabase.from("consent_logs").select("consent_type, granted, policy_version, accepted_at").eq("user_id", user.id).order("accepted_at", { ascending: false }),
    supabase.from("push_subscriptions").select("created_at").eq("user_id", user.id),
  ]);

  const exportDoc = {
    exported_at: new Date().toISOString(),
    controller: "Smashing Burger",
    policy_version: POLICY_VERSION,
    account: { auth_provider: "google", email: user.email ?? null, created_at: user.created_at },
    profile: profile.data,
    claimed_receipts: receipts.data ?? [],
    redemptions: redemptions.data ?? [],
    consent_logs: consents.data ?? [],
    push_devices: (push.data ?? []).length,
    note: "Receipt photos are never stored. Only the extracted Receipt Number, date and Total are kept.",
  };

  return new NextResponse(JSON.stringify(exportDoc, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="smashing-burger-my-data.json"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * DELETE — UU PDP right to erasure. Deleting the auth user cascades to profiles and push_subscriptions;
 * claimed_receipts/redemptions/consent_logs keep their rows with user_id set to NULL (no link to the person),
 * so used receipt numbers can never be re-claimed and consent proof is retained.
 */
export async function DELETE() {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const { error } = await admin.auth.admin.deleteUser(authed.user.id);
  if (error) {
    console.error("[account/delete]", error.message);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
  await authed.supabase.auth.signOut().catch(() => undefined);
  return NextResponse.json({ ok: true });
}
