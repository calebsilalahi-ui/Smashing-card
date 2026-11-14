import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isPushEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 1000) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

/** Saves this device's Web Push subscription (RLS: user can only write their own). */
export async function POST(req: Request) {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const { endpoint, keys } = body;
  if (!isPushEndpoint(endpoint) || typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string") {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const { supabase, user } = authed;
  // Endpoint is globally unique: replace any stale row for this endpoint owned by this user, then insert.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh.slice(0, 200),
    auth: keys.auth.slice(0, 100),
  });
  if (error) return NextResponse.json({ ok: false, error: "save_failed" }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  if (!isPushEndpoint(body.endpoint)) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  await authed.supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint).eq("user_id", authed.user.id);
  return NextResponse.json({ ok: true });
}
