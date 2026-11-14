import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { parseConsentTypes, recordConsents } from "@/lib/consent";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { types?: unknown; granted?: unknown };
  const types = parseConsentTypes(body.types);
  if (types.length === 0) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  const ok = await recordConsents(admin, authed.user.id, types, body.granted !== false, req.headers.get("user-agent"));
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
